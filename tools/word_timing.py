#!/usr/bin/env python3
"""Perkiraan waktu tiap kata di voice-over per scene, tanpa pengenalan suara.

Tidak ada model ASR yang bisa diunduh di sini, jadi waktunya dihitung dari bentuk audio:
  1. Jeda dalam audio dicari (rentetan frame yang sangat pelan).
  2. Batas klausa di teks (titik, koma, tanda tanya, titik dua) dicocokkan ke jeda itu dengan dynamic programming.
     Titik hampir selalu punya jeda, koma sering tidak, jadi pencocokan boleh melewati batas koma.
  3. Di dalam tiap klausa, kata dibagi menurut jumlah suku katanya, lalu batas kata digeser ke lembah energi
     terdekat (maksimal 60 ms) karena pergantian kata biasanya jatuh di lembah.
Hasilnya meleset sekitar 100 sampai 200 ms, cukup untuk subtitle per kata, bukan untuk lip-sync.

Pemakaian:
    python3 tools/word_timing.py [--voice assets/voice] [--out remotion/src/words.json] [--plot DIR]
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, ROOT)
import xp_script  # noqa: E402

SR = 16000
HOP = 80  # 5 ms
FRAME = HOP / SR
EXTRA = {"laughs": 1.2, "sighs": 0.6}  # detik suara non-kata dari tag ElevenLabs
STRENGTH = {".": 3.0, "?": 3.0, "!": 3.0, ":": 1.6, ";": 1.6, ",": 0.9}
SKIP = {".": 3.0, "?": 3.0, "!": 3.0, ":": 1.2, ";": 1.2, ",": 0.5}
GAP = {".": 0.28, "?": 0.28, "!": 0.28, ":": 0.2, ";": 0.2, ",": 0.12}  # jeda yang diharapkan kalau tidak terdeteksi
SEC_PER_SYL = 0.19


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def envelope(x):
    n = len(x) // HOP
    rms = np.sqrt((x[: n * HOP].reshape(n, HOP) ** 2).mean(axis=1))
    return np.convolve(rms, np.ones(3) / 3, mode="same")


def find_pauses(rms):
    med = np.median(rms[rms > 0.01])
    quiet = rms < 0.2 * med
    voiced = np.where(~quiet)[0]
    t0, t1 = voiced[0] * FRAME, (voiced[-1] + 1) * FRAME
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            s, e = i * FRAME, j * FRAME
            if e - s >= 0.06 and s > t0 + 0.05 and e < t1 - 0.05:
                out.append((s, e))
            i = j
        else:
            i += 1
    return out, t0, t1


def syllables(word):
    letters = re.sub(r"[^A-Za-z]", "", word)
    if not letters:
        return 1
    if len(letters) >= 2 and letters.isupper():
        return len(letters)  # singkatan dieja per huruf: XP, HP, MLBB
    w = letters.lower()
    n = len(re.findall(r"[aeiou]", w))
    n -= len(re.findall(r"(ai|au|oi|ea|ee|oo)", w))
    return max(1, n)


def tokens(tagged):
    """Daftar item: ('w', teks asli, suku kata) atau ('tag', None, detik). Tiap kata membawa tanda baca penutupnya."""
    items = []
    for part in re.split(r"(\[[a-z ]+\])", tagged):
        if not part.strip():
            continue
        m = re.fullmatch(r"\[([a-z ]+)\]", part)
        if m:
            items.append(("tag", m.group(1), EXTRA.get(m.group(1), 0.0)))
        else:
            for w in part.split():
                items.append(("w", w, syllables(w)))
    return items


def punct(word):
    m = re.search(r"([.,?!:;])[\"')]*$", word)
    return m.group(1) if m else None


def align_scene(items, pauses, t0, t1):
    n = len(items)
    weight = [it[2] * SEC_PER_SYL + 0.04 if it[0] == "w" else it[2] for it in items]
    cum = np.concatenate([[0], np.cumsum(weight)])
    bounds = [i for i, it in enumerate(items) if it[0] == "w" and punct(it[1]) and i < n - 1]
    K, J = len(bounds), len(pauses)
    total_gap = sum(GAP[punct(items[b][1])] for b in bounds)
    k = ((t1 - t0) - total_gap) / max(1e-6, cum[-1])
    k = float(np.clip(k, 0.6, 1.8))

    def seg_exp(a, b, between):
        w = (cum[b + 1] - cum[a]) * k
        return w + sum(GAP[punct(items[bounds[x]][1])] * 0.4 for x in between)

    INF = 1e18
    # state (kk, j): batas ke kk cocok dengan jeda j. start = (-1, awal), akhir = (K, akhir)
    best = {}
    back = {}

    def seg_cost(dur, exp):
        sigma = 0.35 + 0.18 * exp
        return ((dur - exp) / sigma) ** 2

    starts = {(-1, -1): (0.0, t0)}
    for kk in range(K):
        for j in range(J):
            s, e = pauses[j]
            L = e - s
            bonus = -STRENGTH[punct(items[bounds[kk]][1])] * min(L, 0.5) / 0.5
            cand = INF
            arg = None
            # dari awal scene
            first_word = 0
            skipped = list(range(0, kk))
            c = seg_cost(s - t0, seg_exp(first_word, bounds[kk], skipped)) + sum(SKIP[punct(items[bounds[x]][1])] for x in skipped)
            if c < cand:
                cand, arg = c, (-1, -1)
            for pk in range(max(0, kk - 6), kk):
                for pj in range(j):
                    if (pk, pj) not in best:
                        continue
                    ps, pe = pauses[pj]
                    if s <= pe:
                        continue
                    skipped = list(range(pk + 1, kk))
                    c = best[(pk, pj)] + seg_cost(s - pe, seg_exp(bounds[pk] + 1, bounds[kk], skipped)) + sum(SKIP[punct(items[bounds[x]][1])] for x in skipped)
                    if c < cand:
                        cand, arg = c, (pk, pj)
            if arg is not None:
                best[(kk, j)] = cand + bonus
                back[(kk, j)] = arg
    # akhir scene
    end_best, end_arg = INF, (-1, -1)
    for kk in range(-1, K):
        for j in range(-1, J) if kk >= 0 else [-1]:
            if kk >= 0 and (kk, j) not in best:
                continue
            prev = best[(kk, j)] if kk >= 0 else 0.0
            pe = pauses[j][1] if kk >= 0 else t0
            skipped = list(range(kk + 1, K))
            first = bounds[kk] + 1 if kk >= 0 else 0
            c = prev + seg_cost(t1 - pe, seg_exp(first, n - 1, skipped)) + sum(SKIP[punct(items[bounds[x]][1])] for x in skipped)
            if c < end_best:
                end_best, end_arg = c, (kk, j)
    chain = []
    cur = end_arg
    while cur != (-1, -1):
        chain.append(cur)
        cur = back[cur]
    chain.reverse()
    anchors = {bounds[kk]: pauses[j] for kk, j in chain}  # indeks item -> (mulai jeda, akhir jeda)

    # bagi tiap segmen menurut bobot
    times = [None] * n
    seg_start, first = t0, 0
    cuts = sorted(anchors) + [n - 1]
    for c in cuts:
        seg_end = anchors[c][0] if c in anchors else t1
        w = np.array(weight[first : c + 1], dtype=float)
        # jeda yang tidak terdeteksi tetap memakan sedikit waktu
        for idx in range(first, c):
            if items[idx][0] == "w" and punct(items[idx][1]) and idx not in anchors:
                w[idx - first] += GAP[punct(items[idx][1])] * 0.4 / max(k, 1e-6)
        edges = seg_start + np.concatenate([[0], np.cumsum(w)]) / w.sum() * max(0.05, seg_end - seg_start)
        for idx in range(first, c + 1):
            times[idx] = [edges[idx - first], edges[idx - first + 1]]
        if c in anchors:
            seg_start = anchors[c][1]
        first = c + 1
    return times, len(chain), K


def snap(times, items, rms):
    """Geser batas antar kata ke lembah energi terdekat."""
    for i in range(len(items) - 1):
        if items[i][0] != "w" or items[i + 1][0] != "w":
            continue
        b = times[i][1]
        if abs(times[i + 1][0] - b) > 0.01:  # ada jeda sungguhan di antara keduanya
            continue
        lo, hi = int((b - 0.06) / FRAME), int((b + 0.06) / FRAME) + 1
        lo, hi = max(0, lo), min(len(rms), hi)
        if hi - lo < 3:
            continue
        seg = rms[lo:hi]
        m = lo + int(np.argmin(seg))
        if seg.min() < 0.75 * seg.mean():
            nb = m * FRAME
            if nb - times[i][0] > 0.07 and times[i + 1][1] - nb > 0.07:
                times[i][1] = times[i + 1][0] = nb
    return times


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", default=os.path.join(ROOT, "assets/voice"))
    ap.add_argument("--out", default=os.path.join(ROOT, "remotion/src/words.json"))
    ap.add_argument("--plot", default=None, help="folder untuk gambar pemeriksaan (PNG) per scene")
    args = ap.parse_args()

    result = []
    for si, sc in enumerate(xp_script.SCENES):
        path = os.path.join(args.voice, f"scene_{si + 1:02d}.mp3")
        x = decode(path)
        rms = envelope(x)
        pauses, t0, t1 = find_pauses(rms)
        items = tokens(sc["tagged"])
        times, matched, K = align_scene(items, pauses, t0, t1)
        times = snap(times, items, rms)
        vo_words = sc["vo"].split()
        words = []
        for it, t in zip(items, times):
            if it[0] == "w":
                words.append({"w": it[1], "s": round(float(t[0]), 3), "e": round(float(t[1]), 3)})
        assert len(words) == len(vo_words), f"scene {si + 1}: {len(words)} kata di tagged, {len(vo_words)} di vo"
        for w, v in zip(words, vo_words):
            w["w"] = v
        result.append({"scene": si + 1, "duration": round(len(x) / SR, 3), "voiced": [round(t0, 3), round(t1, 3)], "words": words})
        print(f"scene {si + 1:2d}: {len(words):3d} kata, {len(pauses):2d} jeda, {matched}/{K} batas klausa cocok, suara {t0:.2f}-{t1:.2f} dari {len(x) / SR:.2f} dtk")
        if args.plot:
            plot(args.plot, si + 1, rms, words, pauses)
    json.dump(result, open(args.out, "w"), ensure_ascii=False, indent=1)
    print("selesai:", args.out)


def plot(folder, n, rms, words, pauses):
    from PIL import Image, ImageDraw

    os.makedirs(folder, exist_ok=True)
    per = 8.0
    dur = len(rms) * FRAME
    pages = int(np.ceil(dur / per))
    for p in range(pages):
        a, b = p * per, min(dur, (p + 1) * per)
        w, h = 1600, 360
        im = Image.new("RGB", (w, h), "white")
        d = ImageDraw.Draw(im)
        lo, hi = int(a / FRAME), int(b / FRAME)
        seg = rms[lo:hi]
        top = max(0.2, float(np.percentile(rms, 99)))
        for x in range(w):
            v = seg[int(x / w * len(seg))] / top
            d.line([(x, 200), (x, 200 - min(1, v) * 150)], fill=(60, 60, 60))
            d.line([(x, 200), (x, 200 + min(1, v) * 150)], fill=(60, 60, 60))
        for s, e in pauses:
            if a <= s < b:
                d.rectangle([(s - a) / (b - a) * w, 0, (e - a) / (b - a) * w, 12], fill=(40, 120, 255))
        for i, wd in enumerate(words):
            if a <= wd["s"] < b:
                x = (wd["s"] - a) / (b - a) * w
                d.line([(x, 20), (x, h)], fill=(230, 60, 40))
                d.text((x + 2, 20 + (i % 3) * 12), wd["w"], fill=(0, 0, 0))
        im.save(os.path.join(folder, f"scene{n:02d}_p{p + 1}.png"))


if __name__ == "__main__":
    main()

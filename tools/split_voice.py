#!/usr/bin/env python3
"""Memecah satu file voice-over utuh menjadi scene_01.mp3 ... scene_10.mp3.

Tidak ada pengenalan suara di sini. Batas scene dicari dengan mencocokkan urutan kalimat di naskah
(`xp_script.py`) ke jeda-jeda yang terdeteksi di audio: tiap kalimat diperkirakan panjangnya dari jumlah
kata, lalu dynamic programming memilih jeda yang membuat panjang kalimat paling masuk akal.

Pemakaian:
    python3 tools/split_voice.py path/ke/voice.mp3 [--out assets/voice] [--dry-run]

Hasilnya juga menulis `timing.json` di folder keluaran (waktu mulai dan selesai tiap scene dalam file
asli) supaya batas bisa dikoreksi tangan kalau ada yang meleset.
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import xp_script  # noqa: E402

SR = 16000
HOP = 160  # 10 ms
EXTRA = {"laughs": 1.2, "sighs": 0.6}  # tag yang menambah suara di luar kata


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def envelope(x):
    n = len(x) // HOP
    frames = x[: n * HOP].reshape(n, HOP)
    rms = np.sqrt((frames**2).mean(axis=1))
    return np.convolve(rms, np.ones(3) / 3, mode="same")


def pauses(rms):
    """Jeda = rentetan frame yang sangat pelan. Mengembalikan (waktu tengah, panjang) dalam detik."""
    med = np.median(rms[rms > 0.01])
    quiet = rms < 0.18 * med
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if j - i >= 6:
                out.append(((i + j) / 2 * HOP / SR, (j - i) * HOP / SR))
            i = j
        else:
            i += 1
    voiced = np.where(~quiet)[0]
    return out, voiced[0] * HOP / SR, (voiced[-1] + 1) * HOP / SR


def sentences():
    """Daftar (indeks scene, jumlah kata, tambahan detik dari tag) per kalimat."""
    items = []
    for si, sc in enumerate(xp_script.SCENES):
        for sent in re.split(r"(?<=[.!?])\s+", sc["tagged"].strip()):
            extra = sum(EXTRA.get(t, 0) for t in re.findall(r"\[([a-z ]+)\]", sent))
            words = len(re.sub(r"\[[a-z ]+\]\s*", "", sent).split())
            items.append((si, words, extra))
    return items


def align(items, cands, t0, t1):
    total_words = sum(w for _, w, _ in items)
    total_extra = sum(e for _, _, e in items)
    k = ((t1 - t0) - total_extra - 0.25 * len(items)) / total_words
    exp = np.array([w * k + e + 0.25 for _, w, e in items])
    T = np.array([c[0] for c in cands])
    S = np.array([c[1] for c in cands])
    n, m = len(items), len(cands)
    scene_end = [i for i in range(n - 1) if items[i][0] != items[i + 1][0]]
    INF = 1e18
    cost = np.full((n, m), INF)
    back = np.zeros((n, m), dtype=int)

    def seg(i, dur):
        sigma = 0.5 + 0.15 * exp[i]
        return ((dur - exp[i]) / sigma) ** 2

    def bonus(i, j):
        b = 2.0 * min(S[j], 0.5) / 0.5
        if i in scene_end:
            b += 3.0 * min(S[j], 0.6)
        return b

    for j in range(m):
        cost[0][j] = seg(0, T[j] - t0) - bonus(0, j)
    for i in range(1, n - 1):
        for j in range(m):
            prev = np.where(T < T[j] - 0.2)[0]
            if len(prev) == 0:
                continue
            c = cost[i - 1][prev] + np.array([seg(i, T[j] - T[p]) for p in prev])
            b = int(np.argmin(c))
            cost[i][j] = c[b] - bonus(i, j)
            back[i][j] = prev[b]
    last = [cost[n - 2][p] + seg(n - 1, t1 - T[p]) if T[p] < t1 - 0.2 else INF for p in range(m)]
    j = int(np.argmin(last))
    chosen = [j]
    for i in range(n - 2, 0, -1):
        j = back[i][j]
        chosen.append(j)
    chosen.reverse()
    return [T[j] for j in chosen], [S[j] for j in chosen], exp, k


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--out", default="assets/voice")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    x = decode(args.audio)
    cands, t0, t1 = pauses(envelope(x))
    items = sentences()
    times, strengths, exp, k = align(items, cands, t0, t1)
    print(f"suara: {t0:.2f} s sampai {t1:.2f} s | {len(items)} kalimat | {len(cands)} jeda terdeteksi | {k:.3f} dtk/kata")

    bounds = [(0, t0)]  # (scene, waktu mulai)
    scene_cuts = []
    for i in range(len(items) - 1):
        if items[i][0] != items[i + 1][0]:
            scene_cuts.append((times[i], strengths[i], items[i][0] + 1))
    edges = [max(0.0, t0 - 0.15)] + [c[0] for c in scene_cuts] + [min(len(x) / SR, t1 + 0.3)]
    result = []
    for si, sc in enumerate(xp_script.SCENES):
        est = sum(exp[i] for i, it in enumerate(items) if it[0] == si)
        d = edges[si + 1] - edges[si]
        result.append({"scene": si + 1, "start": round(edges[si], 3), "end": round(edges[si + 1], 3)})
        print(f"scene {si + 1:2d}: {edges[si]:7.2f} -> {edges[si + 1]:7.2f}  ({d:5.2f} s, perkiraan {est:5.2f} s, selisih {d - est:+.2f})")
    weak = [c for c in scene_cuts if c[1] < 0.2]
    if weak:
        print("peringatan: batas scene berikut jedanya pendek (kurang yakin):", [f"{c[0]:.2f}s" for c in weak])
    if args.dry_run:
        return
    os.makedirs(args.out, exist_ok=True)
    for r in result:
        out = os.path.join(args.out, f"scene_{r['scene']:02d}.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.audio, "-ss", str(r["start"]), "-to", str(r["end"]),
                        "-c:a", "libmp3lame", "-q:a", "2", out], check=True)
    json.dump(result, open(os.path.join(args.out, "timing.json"), "w"), indent=1)
    print("selesai:", args.out)


if __name__ == "__main__":
    main()

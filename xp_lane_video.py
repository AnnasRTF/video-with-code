#!/usr/bin/env python3
"""Video tips "XP lane kebal" (Mobile Legends, Season 42), dirender dari kode.

Memakai renderer dan palet dari `motion_graphics.py`, aset di `assets/`, dan naskah di `xp_script.py`.
Durasi tiap scene mengikuti panjang file suara kalau ada (`--audio-dir`), kalau tidak memakai perkiraan
dari jumlah kata. Animasi disinkronkan ke kalimat VO lewat posisi kalimat itu di teks naskah.

Pemakaian:
    python3 xp_lane_video.py --stills                 # PNG pratinjau tiap scene (folder stills_xp/)
    python3 xp_lane_video.py                          # render tanpa VO: output/xp-lane-kebal.mp4
    python3 xp_lane_video.py --audio-dir voice/       # pakai voice/scene_01.mp3 ... scene_10.mp3
"""
import argparse
import glob
import math
import os
import subprocess
import tempfile
import wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw

import motion_graphics as mg
import xp_script
from motion_graphics import (CARD, CORAL, FPS, H, MUTED, NAVY, SS, TEAL, VIOLET, W, WHITE, YELLOW, Painter, clamp,
                             col, in_out_cubic, lerp, out_back, out_cubic, out_expo, prog, slide_line)

ROOT = os.path.dirname(os.path.abspath(__file__))
GREEN = (74, 222, 128)
BLUE = (96, 165, 250)
RED = CORAL
LEAD, TAIL = 0.6, 0.7  # jeda sebelum VO mulai dan setelah VO selesai (tertutup wipe)
WPS = 2.5  # perkiraan kata per detik untuk VO (laju ElevenLabs bisa berbeda)


def asset(*parts):
    return os.path.join(ROOT, "assets", *parts)


# ------------------------------------------------------------------ rencana waktu
def audio_files(audio_dir):
    out = []
    for i in range(len(xp_script.SCENES)):
        hits = sorted(glob.glob(os.path.join(audio_dir, f"scene_{i + 1:02d}.*")))
        out.append(hits[0] if hits else None)
    return out


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def make_plan(audio_dir=None):
    files = audio_files(audio_dir) if audio_dir else [None] * len(xp_script.SCENES)
    plan, t = [], 0.0
    for sc, f in zip(xp_script.SCENES, files):
        a = probe(f) if f else len(sc["vo"].split()) / WPS
        dur = LEAD + a + TAIL
        plan.append({"start": t, "dur": dur, "audio": f, "a": a})
        t += dur
    return plan, t


PLAN, TOTAL = make_plan()


class Cue:
    """Waktu lokal (detik) sebuah kalimat VO, diperkirakan dari posisinya di teks."""

    def __init__(self, i):
        self.vo = xp_script.SCENES[i]["vo"]
        self.a = PLAN[i]["a"]

    def __call__(self, key):
        if isinstance(key, (int, float)):
            return LEAD + key * self.a
        return LEAD + self.vo.index(key) / len(self.vo) * self.a


# -------------------------------------------------------------------- bahan gambar
@lru_cache(None)
def _load(path):
    return Image.open(path).convert("RGBA")


@lru_cache(maxsize=1024)
def _shaped(path, px, shape):
    im = _load(path).resize((px, px), Image.LANCZOS)
    mask = Image.new("L", (px, px), 0)
    d = ImageDraw.Draw(mask)
    if shape == "circle":
        d.ellipse([0, 0, px - 1, px - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * 0.18), fill=255)
    im.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    return im


def picture(p, path, cx, cy, size, alpha=1.0, shape="circle", ring=None, ring_w=5):
    size = max(0, int(round(size / 2)) * 2)
    if size < 6 or alpha <= 0.01:
        return
    im = _shaped(path, size * SS, shape)
    if alpha < 1:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    p.im.paste(im, (int(round(cx * SS)) - size * SS // 2, int(round(cy * SS)) - size * SS // 2), im)
    if ring:
        if shape == "circle":
            p.circle(cx, cy, size / 2 + ring_w / 2 - 1, outline=col(ring, alpha), width=ring_w)
        else:
            r = size / 2 + ring_w / 2
            p.rrect(cx - r, cy - r, cx + r, cy + r, size * 0.2, outline=col(ring, alpha), width=ring_w)


def hero(p, key, cx, cy, size, **kw):
    picture(p, asset("heroes", key + ".png"), cx, cy, size, **kw)


def item(p, key, cx, cy, size, **kw):
    picture(p, asset("items", key + ".png"), cx, cy, size, shape="rrect", **kw)


def text_w(s, f, size):
    return mg.font(f, size).getlength(s) / SS


def chip(p, cx, cy, s, fill, ink=NAVY, size=30, alpha=1.0, scale=1.0, f="bold", outline=None, anchor="c"):
    if alpha <= 0.01 or scale <= 0.02:
        return
    fs = size * scale
    w, h = text_w(s, f, fs) + 1.4 * fs, fs * 1.9
    cx = cx + w / 2 if anchor == "l" else (cx - w / 2 if anchor == "r" else cx)
    p.rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, h / 2,
            fill=col(fill, alpha) if fill else None, outline=col(outline, alpha) if outline else None, width=3)
    p.text(cx, cy + fs * 0.04, s, f, fs, ink, "mm", alpha=alpha)


def sticker(p, cx, cy, s, color, angle=-6, size=46, alpha=1.0, scale=1.0, ink=NAVY):
    """Stempel miring seperti stiker di layar."""
    if alpha <= 0.01 or scale <= 0.02:
        return
    fnt = mg.font("black", size * scale)
    pad = 26 * SS * scale
    wl, hl = int(fnt.getlength(s) + 2 * pad), int(size * SS * scale * 1.0 + pad)
    layer = Image.new("RGBA", (wl + 8, hl + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([4, 4, wl + 3, hl + 3], radius=int(hl * 0.25), fill=col(color))
    d.text((wl / 2 + 4, hl / 2 + 4), s, font=fnt, fill=col(ink), anchor="mm")
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=True)
    if alpha < 1:
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
    p.im.paste(layer, (int(cx * SS - layer.width / 2), int(cy * SS - layer.height / 2)), layer)


def card(p, x0, y0, x1, y1, alpha=1.0, r=28, fill=CARD):
    if alpha <= 0.01:
        return
    p.rrect(x0, y0, x1, y1, r, fill=col(fill, 0.93 * alpha), outline=col(WHITE, 0.12 * alpha), width=2)


def arrow(p, x0, y0, x1, y1, color, width=5, alpha=1.0, head=18):
    if alpha <= 0.01:
        return
    ang = math.atan2(y1 - y0, x1 - x0)
    bx, by = x1 - math.cos(ang) * head * 0.7, y1 - math.sin(ang) * head * 0.7
    p.line(x0, y0, bx, by, col(color, alpha), width)
    p.poly([(x1, y1), (x1 - head * math.cos(ang - 0.45), y1 - head * math.sin(ang - 0.45)),
            (x1 - head * math.cos(ang + 0.45), y1 - head * math.sin(ang + 0.45))], col(color, alpha))


def dashed(p, x0, y0, x1, y1, color, width=4, dash=16, gap=12, alpha=1.0):
    L = math.hypot(x1 - x0, y1 - y0)
    n = int(L // (dash + gap)) + 1
    for k in range(n):
        a, b = k * (dash + gap) / L, min(1, (k * (dash + gap) + dash) / L)
        p.line(lerp(x0, x1, a), lerp(y0, y1, a), lerp(x0, x1, b), lerp(y0, y1, b), col(color, alpha), width)


def bar(p, x, y, w, h, frac, color, alpha=1.0):
    p.rrect(x, y, x + w, y + h, h / 2, fill=col(WHITE, 0.1 * alpha))
    if frac > 0.005:
        p.rrect(x, y, x + max(h, w * frac), y + h, h / 2, fill=col(color, alpha))


def appear(u, t0, dur=0.5):
    """(alpha, scale) untuk muncul dengan sedikit pantulan."""
    q = prog(u, t0, dur)
    return clamp(q * 3), max(0.0, out_back(q))


def timecode(s):
    return f"{int(s // 60)}:{int(s % 60):02d}"


# ------------------------------------------------------------------------- peta
MAP_EXP = [(60, 340), (34, 300), (34, 130), (62, 55), (125, 34), (335, 34)]  # jalur EXP lane (koordinat 512 px)
PIT = (155, 158)  # kolam Turtle/Lord di sisi EXP lane


@lru_cache(None)
def _map(px):
    im = Image.open(asset("map", "sanctum_island.png")).convert("RGBA").resize((px, px), Image.LANCZOS)
    mask = Image.new("L", (px, px), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * 0.05), fill=255)
    im.putalpha(mask)
    return im


class MapView:
    def __init__(self, cx, cy, size):
        self.cx, self.cy, self.size = cx, cy, size

    def xy(self, mx, my):
        return self.cx - self.size / 2 + mx / 512 * self.size, self.cy - self.size / 2 + my / 512 * self.size

    def draw(self, p, alpha=1.0):
        if alpha <= 0.01:
            return
        px = int(round(self.size)) * SS
        im = _map(px)
        if alpha < 1:
            im = im.copy()
            im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
        p.im.paste(im, (int(round((self.cx - self.size / 2) * SS)), int(round((self.cy - self.size / 2) * SS))), im)
        r = self.size / 2
        p.rrect(self.cx - r, self.cy - r, self.cx + r, self.cy + r, self.size * 0.05,
                outline=col(WHITE, 0.25 * alpha), width=3)

    def lane(self, p, color, frac=1.0, alpha=1.0, width=14):
        pts = [self.xy(*q) for q in MAP_EXP]
        total = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
        run, drawn = 0.0, 0.0
        for i in range(len(pts) - 1):
            seg = math.dist(pts[i], pts[i + 1])
            if run >= frac * total:
                break
            f = min(1.0, (frac * total - run) / seg)
            p.line(pts[i][0], pts[i][1], lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f),
                   col(color, alpha), width)
            p.circle(pts[i][0], pts[i][1], width / 2, fill=col(color, alpha))
            run += seg
            drawn = f

    def along(self, s):
        pts = [self.xy(*q) for q in MAP_EXP]
        segs = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
        d = clamp(s) * sum(segs)
        for i, sg in enumerate(segs):
            if d <= sg or i == len(segs) - 1:
                f = clamp(d / sg)
                return lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)
            d -= sg


# ------------------------------------------------------------------ ikon dari kode
def icon_tower(p, cx, cy, s, color, alpha=1.0):
    p.rrect(cx - 0.28 * s, cy - 0.05 * s, cx + 0.28 * s, cy + 0.5 * s, 0.06 * s, fill=col(color, alpha))
    p.poly([(cx - 0.4 * s, cy - 0.05 * s), (cx + 0.4 * s, cy - 0.05 * s), (cx, cy - 0.55 * s)], col(color, alpha))
    p.rrect(cx - 0.1 * s, cy + 0.18 * s, cx + 0.1 * s, cy + 0.5 * s, 0.04 * s, fill=col(NAVY, 0.7 * alpha))


def icon_shield(p, cx, cy, s, color, alpha=1.0):
    p.poly([(cx - 0.42 * s, cy - 0.4 * s), (cx + 0.42 * s, cy - 0.4 * s), (cx + 0.36 * s, cy + 0.12 * s),
            (cx, cy + 0.5 * s), (cx - 0.36 * s, cy + 0.12 * s)], col(color, alpha))


def icon_wisp(p, cx, cy, s, t, alpha=1.0):
    for k, a in ((1.0, 0.12), (0.7, 0.25), (0.42, 0.9)):
        p.circle(cx, cy, s * 0.5 * k * (1 + 0.06 * math.sin(t * 5)), fill=col((150, 220, 255), a * alpha))
    p.circle(cx, cy, s * 0.14, fill=col(WHITE, alpha))


def icon_coin(p, cx, cy, s, alpha=1.0):
    p.circle(cx, cy, s * 0.4, fill=col(YELLOW, alpha))
    p.circle(cx, cy, s * 0.3, outline=col((200, 150, 30), alpha), width=3)


def checkmark(p, cx, cy, s, color, alpha=1.0, frac=1.0):
    a = (cx - 0.4 * s, cy), (cx - 0.1 * s, cy + 0.3 * s), (cx + 0.42 * s, cy - 0.32 * s)
    f1, f2 = clamp(frac * 2), clamp(frac * 2 - 1)
    p.line(a[0][0], a[0][1], lerp(a[0][0], a[1][0], f1), lerp(a[0][1], a[1][1], f1), col(color, alpha), 9)
    if f2 > 0:
        p.line(a[1][0], a[1][1], lerp(a[1][0], a[2][0], f2), lerp(a[1][1], a[2][1], f2), col(color, alpha), 9)


def title(p, u, s, start=0.1):
    slide_line(p, 120, 170, s, "xbold", 68, WHITE, u, start, 0.7)


def hud(p, t, i):
    x0, x1, y = 120, 1800, 52
    p.rrect(x0, y - 3, x1, y + 3, 3, fill=col(WHITE, 0.12))
    p.rrect(x0, y - 3, x0 + (x1 - x0) * t / TOTAL, y + 3, 3, fill=col(VIOLET))
    for sc in PLAN[1:]:
        p.circle(x0 + (x1 - x0) * sc["start"] / TOTAL, y, 5, fill=col(WHITE, 0.45))
    p.text(x1, 100, f"{i + 1:02d} / {len(PLAN)}  {xp_script.SCENES[i]['title'].upper()}", "mono", 22, MUTED, "rs", alpha=0.8)


# ------------------------------------------------------------------------ scene
def scene_hook(p, u, c):
    t_lv, t_tur, t_trt, t_chat = c("lawan udah level"), c("Turtle diambil"), c("turret roboh"), c("tim nyalahin lo")
    t_poster, t_ilang, t_title = c("Lo main kayak"), c("ilang. Tenang"), c("XP lane kebal itu")
    t_tenang = c("Tenang.")
    t_d, t_f, t_pt, t_skip = c("draft,"), c("farming,"), c("baca peta"), c("Dengerin sampai habis")
    a_out = 1 - prog(u, t_poster - 0.15, 0.4)
    if a_out > 0.01:
        a, s = appear(u, c("Lo pick") + 0.1, 0.6)
        card(p, 140, 250, 880, 500, alpha=a * a_out)
        lvl = 4 if u >= t_lv else 3
        for k, (who, color, v) in enumerate((("KAMU", BLUE, 3), ("LAWAN", RED, lvl))):
            y = 320 + k * 100
            p.text(190, y + 14, who, "bold", 34, WHITE, "ls", alpha=a * a_out)
            pop = 1 + 0.35 * max(0, 1 - (u - t_lv) / 0.35) if (k == 1 and u >= t_lv) else 1
            p.text(840, y + 18, f"LV {v}", "black", 56 * pop, color, "rs", alpha=a * a_out)
            bar(p, 190, y + 36, 650, 12, 0.45 if k == 0 else (0.62 if v == 3 else 0.12), color, a * a_out)
        for t0, s_, x, y, ang, colr in ((t_tur, "TURTLE DIAMBIL", 470, 600, -5, RED),
                                         (t_trt, "TURRET ROBOH", 560, 730, 4, YELLOW)):
            aa, ss = appear(u, t0, 0.35)
            sticker(p, x, y, s_, colr, ang, 50, aa * a_out, ss)
        for k, (who, msg, colr) in enumerate((("JUNGLE", "XP lane ngapain??", TEAL), ("GOLD", "AFK ya?", YELLOW),
                                              ("ROAM", "report XP lane!", CORAL))):
            aa, ss = appear(u, t_chat + k * 0.55, 0.4)
            y = 300 + k * 125
            x0 = 1000 + (1 - out_cubic(prog(u, t_chat + k * 0.55, 0.4))) * 120
            card(p, x0, y - 48, x0 + 780, y + 48, alpha=aa * a_out, r=24)
            chip(p, x0 + 90, y, who, colr, size=22, alpha=aa * a_out)
            p.text(x0 + 190, y + 12, msg, "med", 38, WHITE, "ls", alpha=aa * a_out)
    # poster janji kampanye
    q_in, q_out = prog(u, t_poster, 0.5), prog(u, t_ilang, 0.5)
    if q_in > 0 and q_out < 1:
        al = clamp(q_in * 3) * (1 - q_out)
        sc = out_back(q_in) * (1 - 0.5 * q_out)
        w, h = 880 * sc, 460 * sc
        card(p, 960 - w / 2, 560 - h / 2, 960 + w / 2, 560 + h / 2, alpha=al, r=36)
        p.text(960, 520, "JANJI KAMPANYE", "black", 84 * sc, WHITE, "mm", alpha=al)
        p.text(960, 620, "awalnya manis banget", "med", 40 * sc, YELLOW, "mm", alpha=al)
    if 0 < q_out < 1:
        for k in range(10):
            ang = k * math.pi / 5
            r = lerp(60, 320, out_expo(q_out))
            p.circle(960 + r * math.cos(ang), 560 + r * math.sin(ang), 14 * (1 - q_out), fill=col(YELLOW, 1 - q_out))
        sticker(p, 960, 560, "ILANG", CORAL, -4, 70, 1 - q_out, 1 + 0.4 * q_out)
    qn = prog(u, t_tenang, 0.4)
    if qn > 0:
        sticker(p, 960, 560, "TENANG", TEAL, -3, 96, clamp(qn * 3) * (1 - prog(u, t_title - 0.1, 0.3)), out_back(qn))
    # judul
    qt = prog(u, t_title, 0.7)
    if qt > 0:
        slide_line(p, 960 - text_w("XP LANE KEBAL", "black", 150) / 2, 560, "XP LANE KEBAL", "black", 150, WHITE, u,
                   t_title, 0.8, 1700)
        p.rrect(960 - 360 * out_expo(prog(u, t_title + 0.5, 0.6)), 600, 960 + 360 * out_expo(prog(u, t_title + 0.5, 0.6)),
                614, 7, fill=col(CORAL))
        for t0, s_, x, colr in ((t_d, "DRAFT", 560, CORAL), (t_f, "FARMING", 960, TEAL), (t_pt, "PETA", 1360, YELLOW)):
            aa, ss = appear(u, t0, 0.4)
            chip(p, x, 740, s_, colr, size=46, alpha=aa, scale=ss)
        aa, ss = appear(u, t_skip, 0.4)
        chip(p, 960, 880, "DENGERIN SAMPAI HABIS", VIOLET, WHITE, 34, aa, ss)


def scene_tugas(p, u, c):
    title(p, u, "Tugas XP lane")
    m = MapView(520, 600, 560)
    a, s = appear(u, c("Pertama,"), 0.5)
    m.draw(p, a)
    q = prog(u, c("XP lane itu lane solo"), 0.8)
    m.lane(p, TEAL, q, 0.9)
    qs = prog(u, c("Iya, lo sendirian"), 0.5)
    if qs > 0:
        x, y = m.along(0.55 + 0.05 * math.sin(u * 2))
        p.circle(x, y, 18 * out_back(qs), fill=col(BLUE), outline=col(WHITE), width=3)
        chip(p, m.xy(150, 430)[0], m.xy(150, 430)[1], "KAMU, SOLO", BLUE, WHITE, 28, clamp(qs * 3), out_back(qs))
    rows = (("1", "LEVEL", "Ambil level lebih cepat dari lawan", TEAL, c("Satu,")),
            ("2", "FRONTLINE", "Jadi frontline saat teamfight", CORAL, c("Dua,")),
            ("3", "TEKANAN", "Beri tekanan di side lane", YELLOW, c("Tiga,")))
    gone = prog(u, c("Kalau lo kalah level"), 0.6)
    for k, (n, head, sub, colr, t0) in enumerate(rows):
        aa, ss = appear(u, t0, 0.5)
        y = 380 + k * 200
        x0 = 1000 + (1 - out_cubic(prog(u, t0, 0.5))) * 100
        al = aa * (1 - 0.65 * gone)
        card(p, x0, y - 75, 1790, y + 75, alpha=al)
        p.circle(x0 + 75, y, 44 * ss, fill=col(colr, al))
        p.text(x0 + 75, y + 4, n, "black", 52 * ss, NAVY, "mm", alpha=al)
        p.text(x0 + 150, y - 6, head, "xbold", 44, WHITE, "ls", alpha=al)
        p.text(x0 + 150, y + 42, sub, "reg", 30, MUTED, "ls", alpha=al)
        if gone > 0:
            p.line(x0 + 150, y - 22, x0 + 150 + (1790 - x0 - 190) * out_expo(gone), y - 22, col(CORAL, 0.9), 6)


def scene_meta(p, u, c):
    title(p, u, "Meta Season 42")
    t_s, t_m, t_rip, t_map = c("Season empat"), c("Masha direvamp"), c("dia udah almarhum"), c("petanya berubah")
    t_h, t_g, t_w, t_tr = c("Healing Turtle"), c("Golden Turret"), c("wisp di peta"), c("Akhirnya ada yang")
    # kanan: lencana musim lalu peta
    mv = MapView(1360, 610, 640)
    qm = prog(u, t_map, 0.7)
    a_b = 1 - qm
    if a_b > 0.01:
        aa, ss = appear(u, t_s, 0.6)
        card(p, 1010, 330, 1740, 760, alpha=aa * a_b)
        p.text(1375, 470, "SEASON 42", "black", 92 * ss, WHITE, "mm", alpha=aa * a_b)
        p.text(1375, 560, "STARWARD DECADE", "bold", 40, YELLOW, "mm", alpha=aa * a_b)
        chip(p, 1375, 660, "PATCH 2.2.16", VIOLET, WHITE, 40, aa * a_b, ss)
    if qm > 0:
        mv.draw(p, clamp(qm * 2))
        chip(p, 1360, 262, "28 SEPTEMBER 2026", YELLOW, NAVY, 28, clamp(qm * 3), out_back(qm))
    # kiri: kartu Masha, lalu kartu callout
    qa = prog(u, t_m, 0.6)
    a_left_masha = clamp(qa * 3) * (1 - prog(u, t_map, 0.4))
    if a_left_masha > 0.01:
        x0 = 120
        card(p, x0, 290, 940, 800, alpha=a_left_masha)
        hero(p, "masha", x0 + 160, 450, 190 * out_back(qa), alpha=a_left_masha, ring=CORAL)
        p.text(x0 + 300, 420, "MASHA", "black", 64, WHITE, "ls", alpha=a_left_masha)
        chip(p, x0 + 420, 480, "REVAMP", CORAL, NAVY, 30, a_left_masha)
        p.text(x0 + 300, 560, "Berserker, 3 HP bar", "med", 34, MUTED, "ls", alpha=a_left_masha)
        for k in range(3):
            fill = 1.0 if (u < t_rip or k < 2) else 1.0
            bar(p, x0 + 60, 640 + k * 42, 700, 22, fill * clamp((qa - 0.2 * k) * 1.6), CORAL, a_left_masha)
        qr = prog(u, t_rip, 0.4)
        if qr > 0:
            sticker(p, x0 + 560, 760, "VERSI LAMA: RIP", (150, 163, 208), 5, 40, a_left_masha * clamp(qr * 3), out_back(qr),
                    NAVY)
    call = (("HEALING TURTLE", ["Tanpa shield lagi."], ["Turtle sekutu bantu push lane musuh terkuat.", "Hero sekutu di dekatnya pulih HP cepat."], TEAL, t_h, t_g, "turtle"),
            ("GOLDEN TURRET", ["Gold tim naik besar saat", "turret mana pun hancur."], ["HP Inner dan Base Turret ikut naik."], YELLOW, t_g, t_w, "tower"),
            ("REVEALING WISP", ["Buka posisi musuh yang", "tersembunyi."], ["Ambil wisp di peta: area luas, beberapa detik."], (150, 220, 255), t_w, 1e9, "wisp"))
    for head, main, sub_, colr, t0, t1, ic in call:
        al = clamp(prog(u, t0, 0.4) * 3) * (1 - prog(u, t1 - 0.2, 0.4)) if t1 < 1e8 else clamp(prog(u, t0, 0.4) * 3)
        if al <= 0.01:
            continue
        card(p, 120, 290, 940, 800, alpha=al)
        sc = out_back(prog(u, t0, 0.5))
        if ic == "turtle":
            picture(p, asset("icons", "turtle.png"), 250, 440, 150 * sc, al, "rrect")
            icon_shield(p, 360, 480, 90 * sc, (150, 163, 208), al * 0.8)
            p.line(310, 430, 410, 530, col(CORAL, al), 10)
        elif ic == "tower":
            icon_tower(p, 250, 450, 150 * sc, colr, al)
            for k in range(3):
                icon_coin(p, 365 + 38 * k, 470 - 18 * (k % 2), 64 * sc, al * 0.95)
        else:
            icon_wisp(p, 270, 450, 170 * sc, u, al)
        p.text(430, 440, head, "black", 46, colr, "ls", alpha=al)
        for j, line in enumerate(main):
            p.text(180, 640 + 50 * j, line, "bold", 40, WHITE, "ls", alpha=al)
        for j, line in enumerate(sub_):
            p.text(180, 640 + 50 * len(main) + 20 + 40 * j, line, "reg", 28, MUTED, "ls", alpha=al)
    # penanda di peta
    if qm > 0:
        pit = mv.xy(*PIT)
        if t_h <= u < t_g:
            p.circle(*pit, 40 + 12 * math.sin(u * 6), outline=col(TEAL, 0.9), width=5)
            picture(p, asset("icons", "turtle.png"), pit[0], pit[1], 54, 1, "rrect")
        if t_g <= u < t_w:
            for q in ((335, 34), (62, 55)):
                icon_tower(p, *mv.xy(*q), 42, YELLOW, 1)
        if u >= t_w:
            r = 160 * out_cubic(prog(u, t_w + 0.3, 1.0))
            ctr = mv.xy(256, 256)
            p.circle(*ctr, r, outline=col((150, 220, 255), 0.5), width=4)
            icon_wisp(p, ctr[0], ctr[1], 58, u)
            for q in ((330, 330), (220, 120)):
                x, y = mv.xy(*q)
                p.circle(x, y, 14, fill=col(RED, clamp((r - math.dist((x, y), ctr)) / 40 + 0.5)))
    qt = prog(u, t_tr, 0.4)
    if qt > 0:
        sticker(p, 520, 850, "TRANSPARAN", TEAL, -5, 46, clamp(qt * 3) * (1 - prog(u, t_tr + 2.4, 0.4)), out_back(qt))


def scene_hero(p, u, c):
    title(p, u, "Hero XP lane")
    cards = (("aulus", "AULUS", "S", 59.97, 81, c("Aulus sama Masha")),
             ("masha", "MASHA", "S", 59.96, 75, c("Aulus sama Masha") + 0.4),
             ("argus", "ARGUS", "S", 55.88, None, c("Argus sama Gloo")),
             ("gloo", "GLOO", "S", 54.1, None, c("Argus sama Gloo") + 0.4))
    t_ban = c("Masalahnya")
    for j, (s_, colr) in enumerate((("DATA: MLBB HUB", VIOLET), ("13 OKTOBER 2026", TEAL), ("SEMUA RANK", YELLOW))):
        aa, ss = appear(u, c("ini data") + 0.3 * j, 0.45)
        chip(p, 130 + [0, 330, 640][j], 245, s_, colr, WHITE if colr == VIOLET else NAVY, 26, aa, ss, anchor="l")
    for k, (key, name, tier, wr, ban, t0) in enumerate(cards):
        cx = 330 + k * 420
        aa, ss = appear(u, t0, 0.55)
        y_off = (1 - out_cubic(prog(u, t0, 0.55))) * 80
        card(p, cx - 190, 300 + y_off, cx + 190, 860 + y_off, alpha=aa)
        hero(p, key, cx, 440 + y_off, 170 * ss, alpha=aa, ring=VIOLET if k < 2 else MUTED)
        p.text(cx, 580 + y_off, name, "black", 46, WHITE, "ms", alpha=aa)
        chip(p, cx, 630 + y_off, f"TIER {tier}", TEAL, NAVY, 26, aa)
        q = out_cubic(prog(u, t0 + 0.3, 1.0))
        p.text(cx, 730 + y_off, f"{wr * q:.2f}%".replace(".", ","), "black", 58, YELLOW, "ms", alpha=aa)
        p.text(cx, 762 + y_off, "win rate, semua rank", "reg", 22, MUTED, "ms", alpha=aa)
        bar(p, cx - 150, 784 + y_off, 300, 14, (wr - 40) / 25 * q, TEAL, aa)
        if ban:
            ab, sb = appear(u, t_ban + 0.5 * k, 0.4)
            chip(p, cx, 840 + y_off, f"BAN {ban}% di MG+", CORAL, NAVY, 24, ab, sb)
    t1 = c("Jadi kuasai satu")
    aa, ss = appear(u, t1, 0.5)
    chip(p, 700, 940, "1 HERO UTAMA", VIOLET, WHITE, 32, aa, ss)
    chip(p, 1060, 940, "+ 1 CADANGAN", TEAL, NAVY, 32, appear(u, t1 + 0.4, 0.5)[0], appear(u, t1 + 0.4, 0.5)[1])
    aa, ss = appear(u, c("Catatan:"), 0.5)
    p.text(1800, 1012, "Angka campuran semua lane, bukan khusus XP lane.", "reg", 24, MUTED, "rs", alpha=aa)
    aa, ss = appear(u, c("Kayak survei"), 0.5)
    sticker(p, 1480, 232, "BAGUS DI KERTAS", YELLOW, -4, 38, aa, ss)


def scene_pick_duluan(p, u, c):
    title(p, u, "Draft: pick duluan")
    a, _ = appear(u, c("Sekarang draft"), 0.5)
    p.text(120, 270, "TIM KAMU", "bold", 28, BLUE, "ls", alpha=a)
    p.text(1800, 270, "MUSUH", "bold", 28, RED, "rs", alpha=a)
    t1 = c("Pick duluan?")
    for k in range(5):
        x = 200 + k * 170
        aa, ss = appear(u, c("Sekarang draft") + 0.1 * k, 0.4)
        lit = k == 0
        glow = 0.5 + 0.5 * math.sin(u * 4) if (lit and u > t1) else 0
        p.rrect(x - 70, 310, x + 70, 460, 24, fill=col(CARD, 0.95 * aa), outline=col(YELLOW if lit and u > t1 else BLUE, aa), width=4 + int(3 * glow))
        p.text(x, 395, str(k + 1) if not (lit and u > t1) else "?", "black", 72 * ss, YELLOW if (lit and u > t1) else MUTED, "mm", alpha=aa)
        p.rrect(1920 - x - 70, 310, 1920 - x + 70, 460, 24, fill=col(CARD, 0.6 * aa), outline=col(RED, 0.5 * aa), width=3)
    qf = prog(u, c("Ambil yang fleksibel"), 0.5)
    chip(p, 400, 570, "FLEKSIBEL", YELLOW, NAVY, 40, clamp(qf * 3), out_back(qf))
    for k, (s_, colr) in enumerate((("TANK", TEAL), ("FIGHTER", CORAL), ("+ CROWD CONTROL", VIOLET))):
        aa, ss = appear(u, c("tank atau fighter") + 0.25 * k, 0.4)
        chip(p, 400 + 400 * k, 680, s_, colr, NAVY if k < 2 else WHITE, 34, aa, ss)
    aa, ss = appear(u, c("Jangan ambil hero"), 0.5)
    chip(p, 1450, 570, "JANGAN MUDAH DI-COUNTER", RED, NAVY, 32, aa, ss)
    qq = prog(u, c("first pick itu"), 0.5)
    if qq > 0:
        card(p, 300, 770, 1620, 900, alpha=clamp(qq * 3))
        p.text(960, 850, "FIRST PICK  ≠  KEUNTUNGAN", "black", 64, WHITE, "mm", alpha=clamp(qq * 3))
    qr = prog(u, c("kebijakan dadakan"), 0.5)
    if qr > 0:
        sticker(p, 1500, 740, "REVISI v2", CORAL, 6, 44, clamp(qr * 3), out_back(qr))


def scene_counter(p, u, c):
    title(p, u, "Draft: pick terakhir")
    rows = (("aulus", "AULUS", c("Lawan Aulus"), (("alice", "ALICE"), ("balmond", "BALMOND"), ("julian", "JULIAN")), None),
            ("masha", "MASHA", c("Lawan Masha"), (("freya", "FREYA"), ("uranus", "URANUS")), "skill 2 reset tiap 1 bar HP habis"),
            ("argus", "ARGUS", c("Lawan Argus"), (("barats", "BARATS"), ("uranus", "URANUS"), ("terizla", "TERIZLA")), None))
    for k, (ek, en, t0, ctr, note) in enumerate(rows):
        y = 390 + k * 235
        aa, ss = appear(u, t0, 0.5)
        card(p, 120, y - 100, 1800, y + 100, alpha=aa)
        hero(p, ek, 250, y, 130 * ss, alpha=aa, ring=RED)
        p.text(330, y - 20, "LAWAN", "reg", 24, MUTED, "ls", alpha=aa)
        p.text(330, y + 28, en, "black", 44, WHITE, "ls", alpha=aa)
        q = out_expo(prog(u, t0 + 0.35, 0.5))
        arrow(p, 590, y, 590 + 150 * q, y, TEAL, 6, aa)
        for j, (ck, cn) in enumerate(ctr):
            t1 = t0 + 0.5 + 0.35 * j
            ac, sc = appear(u, t1, 0.45)
            cx = 860 + j * 270
            hero(p, ck, cx, y - 10, 120 * sc, alpha=ac, ring=TEAL)
            p.text(cx, y + 84, cn, "bold", 24, WHITE, "ms", alpha=ac)
        if note:
            an, sn = appear(u, c("Inget, tiap"), 0.5)
            p.text(1780, y - 62, note.upper(), "bold", 22, YELLOW, "rs", alpha=an)
    aa, ss = appear(u, c("Tapi ingat"), 0.5)
    chip(p, 960, 1030, "SELISIH SEKITAR 2 SAMPAI 3 POIN WIN RATE", VIOLET, WHITE, 28, aa, ss)
    aa, ss = appear(u, c("Jangan kegirangan"), 0.4)
    sticker(p, 1490, 232, "JANGAN KEGIRANGAN", YELLOW, -4, 36, aa, ss)


def scene_item(p, u, c):
    title(p, u, "Item")
    tiles = (("blade_armor", "BLADE ARMOR", "lawan damage fisik", ("bales damage ke", "yang menyerang"), CORAL, c("Blade Armor,")),
             ("radiant_armor", "RADIANT ARMOR", "lawan damage sihir", ("magic defense naik", "tiap kena sihir"), VIOLET, c("Radiant Armor,")),
             ("sea_halberd", "SEA HALBERD", "anti-heal, hero fisik", ("turunkan shield dan", "regen musuh"), YELLOW, c("Sea Halberd buat")),
             ("dominance_ice", "DOMINANCE ICE", "anti-heal, tank", ("plus defense,", "kamu tetap tebal"), TEAL, c("Dominance Ice kalau")))
    t_h = c("Anti-heal itu wajib")
    for k, (key, name, role, sub, colr, t0) in enumerate(tiles):
        cx = 330 + k * 420
        aa, ss = appear(u, c("Build sesuai lawan") + 0.12 * k, 0.5)
        lit = prog(u, t0, 0.3) > 0 and u < t0 + (c(tiles[k + 1][5]) - t0 if k < 3 else 4.5) + 0.3
        pulse = 1.0 + (0.06 * math.sin(u * 7) if lit else 0)
        card(p, cx - 190, 320, cx + 190, 850, alpha=aa)
        if lit:
            p.rrect(cx - 190, 320, cx + 190, 850, 28, outline=col(colr, 0.95), width=5)
        item(p, key, cx, 480, 190 * ss * pulse, alpha=aa)
        p.text(cx, 630, name, "black", 34, WHITE, "ms", alpha=aa)
        chip(p, cx, 695, role.upper(), colr, NAVY if colr != VIOLET else WHITE, 22, aa)
        p.text(cx, 765, sub[0], "reg", 24, MUTED, "ms", alpha=aa)
        p.text(cx, 798, sub[1], "reg", 24, MUTED, "ms", alpha=aa)
    qh = prog(u, t_h, 0.5)
    if qh > 0:
        sticker(p, 960, 960, "ANTI-HEAL: WAJIB", CORAL, -3, 46, clamp(qh * 3), out_back(qh))
    qa = prog(u, c("Build asal-asalan"), 0.5)
    if qa > 0:
        sticker(p, 1450, 232, "ANGGARAN TANPA AUDIT", YELLOW, 4, 34, clamp(qa * 3), out_back(qa))


def scene_freeze(p, u, c):
    title(p, u, "Farming dan freeze")
    y = 600
    p.rrect(210, y - 55, 1710, y + 55, 55, fill=col(WHITE, 0.07))
    a, s = appear(u, c("Sekarang makro"), 0.5)
    icon_tower(p, 270, y - 10, 120 * s, BLUE, a)
    icon_tower(p, 1650, y - 10, 120 * s, RED, a)
    t_fr, t_push = c("Namanya freeze"), c("Sebelum Turtle muncul")
    q_start = prog(u, c("Dua menit pertama"), 0.8)
    q_push = in_out_cubic(prog(u, t_push + 0.4, 1.8))
    meet_x = 540
    shift = q_push * 780
    freeze_on = u >= t_fr
    for side, colr in ((-1, BLUE), (1, RED)):
        for k in range(6):
            kind = "cannon" if k == 5 else ("range" if k >= 3 else "melee")
            formed = meet_x + side * (24 + k * 40)
            start = 360 if side < 0 else 1560
            xx = lerp(start, formed, out_cubic(q_start)) + shift  # dua wave bergeser bersama saat didorong
            yy = y + (-1 if k % 2 else 1) * 14
            r = 30 if kind == "cannon" else 18
            if kind == "cannon" and side < 0:
                p.circle(xx, yy, r + 12 + 5 * math.sin(u * 6), outline=col(YELLOW, 0.9), width=4)
            if kind == "melee":
                p.rrect(xx - r, yy - r, xx + r, yy + r, 6, fill=col(colr, 0.95))
            else:
                p.circle(xx, yy, r, fill=col(colr, 0.95))
    chip(p, 270, y + 100, "TURRET KAMU", BLUE, WHITE, 22, a)
    chip(p, 1650, y + 100, "TURRET MUSUH", RED, NAVY, 22, a)
    if freeze_on and q_push < 0.05:
        dashed(p, meet_x + 8, y - 130, meet_x + 8, y + 130, YELLOW, 5)
        chip(p, meet_x + 8, y - 170, "FREEZE: TAHAN DI SINI", YELLOW, NAVY, 28, appear(u, t_fr, 0.4)[0], appear(u, t_fr, 0.4)[1])
        p.text(meet_x + 8, y + 215, "last hit saja", "med", 28, MUTED, "ms")
    qc = prog(u, c("Prioritasin minion cannon"), 0.5)
    if qc > 0:
        chip(p, 520, 900, "CANNON = BONUS EXP", YELLOW, NAVY, 34, clamp(qc * 3), out_back(qc))
    if q_push > 0:
        chip(p, 1100, 460, "DORONG DULU, BARU ROTASI", TEAL, NAVY, 32, clamp(q_push * 3), out_back(clamp(q_push * 2)))
    qm = prog(u, c("proyek mangkrak"), 0.5)
    if qm > 0:
        sticker(p, 1400, 860, "PROYEK MANGKRAK", CORAL, -4, 44, clamp(qm * 3), out_back(qm))
    # penghitung waktu
    tt = clamp(u / max(1.0, t_push + 1.0)) * 120
    p.text(1800, 250, timecode(tt), "mono", 56, WHITE, "rs", alpha=0.9)
    p.text(1800, 290, "waktu game", "reg", 22, MUTED, "rs", alpha=0.8)


def scene_rotasi(p, u, c):
    title(p, u, "Rotasi dan objektif")
    mv = MapView(560, 640, 640)
    mv.draw(p, appear(u, 0.2, 0.5)[0])
    mv.lane(p, TEAL, 1.0, 0.45, 10)
    # garis waktu objektif
    x0, x1, y = 1020, 1780, 300
    tl_a = appear(u, c("Turtle pertama"), 0.5)[0]
    p.rrect(x0, y - 4, x1, y + 4, 4, fill=col(WHITE, 0.15 * tl_a))
    for mn in range(10):
        x = x0 + (x1 - x0) * mn / 9
        p.line(x, y + 12, x, y + 26, col(WHITE, 0.3 * tl_a), 2)
        p.text(x, y + 56, str(mn), "mono", 22, MUTED, "ms", alpha=tl_a)
    t_t = c("Turtle pertama")
    t_l = c("Lord pertama")
    head = lerp(0, 9, clamp((u - t_t) / max(1.0, (t_l + 3.0 - t_t))))
    for mn in (2, 4, 6, 8):
        x = x0 + (x1 - x0) * mn / 9
        al = clamp((head - mn + 0.4) * 2)
        picture(p, asset("icons", "turtle.png"), x, y - 52, 58, max(0.25, al) * tl_a, "rrect")
    ql = clamp((head - 7.6) * 2)
    picture(p, asset("icons", "lord.png"), x0 + (x1 - x0) * 8 / 9, y - 125, 74, ql * tl_a, "rrect")
    chip(p, x1, y + 95, "LORD 8:00 - 9:00", VIOLET, WHITE, 24, ql * tl_a, anchor="r")
    xh = x0 + (x1 - x0) * head / 9
    p.circle(xh, y, 11, fill=col(WHITE, tl_a))
    chip(p, x0, 480, "TURTLE 2:00, ULANG TIAP 2 MENIT", TEAL, NAVY, 28, appear(u, t_t + 0.3, 0.5)[0], 1, anchor="l")
    # peta: turtle sekutu, musuh hilang, jungler, wisp
    pit = mv.xy(*PIT)
    t_tj = c("begitu turtle jatuh")
    if u >= t_t:
        p.circle(*pit, 38 + 10 * math.sin(u * 5), outline=col(TEAL, 0.85), width=4)
    q = prog(u, t_tj, 1.0)
    if q > 0:
        hx, hy = mv.along(clamp(q * 0.85))
        icon = (hx, hy)
        p.circle(hx, hy, 17, fill=col(BLUE), outline=col(WHITE), width=3)
        tx, ty = mv.along(clamp(q * 0.85) + 0.07)
        p.circle(tx, ty, 14, fill=col(TEAL, 0.9))
        chip(p, x0, 565, "IKUT DORONG BARENG TURTLE SEKUTU", BLUE, WHITE, 26, clamp(q * 3), 1, anchor="l")
    t_hil = c("Hero musuh ilang")
    if u >= t_hil:
        ex, ey = mv.xy(360, 250)
        qh = prog(u, t_hil + 0.3, 0.6)
        p.circle(ex, ey, 17, fill=col(RED, 1 - qh))
        if qh > 0.2:
            p.text(ex, ey + 6, "?", "black", 40, YELLOW, "mm", alpha=clamp(qh * 2))
        chip(p, x0, 650, "HILANG DI MINIMAP: MUNDUR", RED, NAVY, 26, clamp(qh * 3), 1, anchor="l")
        if u >= c("mundur ke turret"):
            ax, ay = mv.along(0.62)
            bx, by = mv.along(0.4)
            arrow(p, ax, ay, bx, by, YELLOW, 7, 0.9)
    t_j = c("Jungler musuh keliatan")
    if u >= t_j:
        jx, jy = mv.xy(380, 395)
        pulse = 1 + 0.2 * math.sin(u * 8)
        p.circle(jx, jy, 17 * pulse, fill=col(RED))
        chip(p, x0, 735, "JUNGLER DI SISI LAIN: PUSH", GREEN, NAVY, 26, appear(u, t_j, 0.4)[0], 1, anchor="l")
        ax, ay = mv.along(0.35)
        bx, by = mv.along(0.78)
        arrow(p, ax, ay, bx, by, GREEN, 7, 0.9)
    t_w = c("Ambil wisp")
    if u >= t_w:
        ctr = mv.xy(256, 256)
        r = 190 * out_cubic(prog(u, t_w + 0.2, 1.0))
        p.circle(*ctr, r, outline=col((150, 220, 255), 0.55), width=4)
        icon_wisp(p, ctr[0], ctr[1], 60, u)
        chip(p, x0, 820, "WISP: POSISI MUSUH TERBUKA", (150, 220, 255), NAVY, 26, appear(u, t_w, 0.4)[0], 1, anchor="l")
    qs = prog(u, c("jangan nyalahin jungler"), 0.5)
    if qs > 0:
        sticker(p, 1400, 950, "JANGAN SALAHIN JUNGLER", YELLOW, -3, 38, clamp(qs * 3), out_back(qs))
    qr = prog(u, c("Rapat boleh molor"), 0.5)
    if qr > 0 and u < c("Dengan peta baru"):
        sticker(p, 1400, 950, "RAPAT BOLEH MOLOR", CORAL, 3, 38, clamp(qr * 3), out_back(qr))


def scene_penutup(p, u, c):
    items = (("PICK SESUAI SITUASI", TEAL, c("pick sesuai situasi")), ("AMBIL LEVEL DULUAN", CORAL, c("ambil level duluan")),
             ("ROTASI TEPAT WAKTU", YELLOW, c("rotasi tepat waktu")), ("BACA MINIMAP", VIOLET, c("baca minimap")))
    p.text(960, 230, "RINGKASNYA", "black", 70, WHITE, "ms", alpha=appear(u, 0.2, 0.5)[0])
    for k, (s_, colr, t0) in enumerate(items):
        y = 350 + k * 120
        aa, ss = appear(u, t0, 0.45)
        card(p, 560, y - 46, 1360, y + 46, alpha=aa, r=24)
        p.circle(630, y, 28, fill=col(colr, aa))
        checkmark(p, 630, y, 36, NAVY, aa, prog(u, t0 + 0.2, 0.4))
        p.text(690, y + 14, s_, "bold", 38, WHITE, "ls", alpha=aa)
    qb = prog(u, c("Bohong"), 0.4)
    if qb > 0:
        sticker(p, 1610, 320, "MASIH DI LO", CORAL, 5, 40, clamp(qb * 3), out_back(qb))
    qs = prog(u, c("share ke temen"), 0.5)
    chip(p, 960, 880, "SHARE KE TEMEN SATU TIM", VIOLET, WHITE, 40, clamp(qs * 3), out_back(qs))
    p.text(960, 1010, "Gambar: Moonton (Mobile Legends: Bang Bang). Data: MLBB Hub, Fandom wiki, patch notes 2.2.16, 14 Okt 2026.",
           "reg", 20, MUTED, "ms", alpha=0.8 * appear(u, 1.0, 0.8)[0])


SCENE_FUNCS = [scene_hook, scene_tugas, scene_meta, scene_hero, scene_pick_duluan, scene_counter, scene_item,
               scene_freeze, scene_rotasi, scene_penutup]


# ------------------------------------------------------------------ transisi dan frame
def boundaries():
    return [sc["start"] for sc in PLAN[1:]]


def wipe_L(t, cn):
    e = in_out_cubic(prog(t, cn - mg.WIPE_DUR / 2, mg.WIPE_DUR))
    return lerp(-mg.WIPE_SKEW, W + mg.WIPE_BAND + 2 * mg.WIPE_STEP, e)


def scene_index(t):
    return sum(1 for b in boundaries() if wipe_L(t, b) >= W + 2 * mg.WIPE_STEP + 250)


def draw_wipes(p, t):
    for k, b in enumerate(boundaries()):
        if not (b - mg.WIPE_DUR / 2 < t < b + mg.WIPE_DUR / 2 + 0.001):
            continue
        L = wipe_L(t, b)
        for j, color in enumerate((CORAL, VIOLET, TEAL)):
            lead = L - j * mg.WIPE_STEP
            pts = [(lead - mg.WIPE_BAND + mg.WIPE_SKEW, 0), (lead + mg.WIPE_SKEW, 0), (lead, H), (lead - mg.WIPE_BAND, H)]
            if k % 2 == 1:
                pts = [(W - x, y) for x, y in pts]
            p.poly(pts, col(color))


@lru_cache(maxsize=6)
def _bg(tq):
    return mg.background(tq)


def render(t):
    im = _bg(round(t * 10) / 10).copy()
    p = Painter(im)
    mg.dot_grid(p, t)
    i = scene_index(t)
    SCENE_FUNCS[i](p, t - PLAN[i]["start"], Cue(i))
    hud(p, t, i)
    draw_wipes(p, t)
    fade = max(1 - prog(t, 0, 0.3), prog(t, TOTAL - 0.5, 0.5))
    if fade > 0:
        p.rect_fill(col((8, 12, 26), fade))
    return im.reduce(SS)


def render_bytes(n):
    return np.asarray(render(n / FPS)).tobytes()


# ------------------------------------------------------------------------- audio
SR = 44100


def make_sfx(path):
    n = int(SR * TOTAL)
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(11)
    for b in boundaries():
        dur = mg.WIPE_DUR
        x = rng.standard_normal(int(dur * SR)).astype(np.float32)
        bell = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 2
        y, prev = np.empty_like(x), 0.0
        for i, v in enumerate(x):
            prev += (0.02 + 0.3 * bell[i]) * (v - prev)
            y[i] = prev
        y = y / np.abs(y).max() * bell * 0.3
        i0 = int((b - dur / 2) * SR)
        out[i0:i0 + len(y)] += y[: max(0, n - i0)]
    tt = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * tt) for f in (110.0, 164.81, 220.0)) * 0.012
    pad *= np.minimum(1, tt / 1.5) * np.minimum(1, (TOTAL - tt) / 1.0)
    out += pad.astype(np.float32)
    out *= 0.8 / max(1e-6, np.abs(out).max())
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())


def encode(out_path, workers):
    tmp = tempfile.mkdtemp()
    sfx = os.path.join(tmp, "sfx.wav")
    make_sfx(sfx)
    voices = [(sc["audio"], sc["start"] + LEAD) for sc in PLAN if sc["audio"]]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-i", sfx]
    for f, _ in voices:
        cmd += ["-i", f]
    filt = "[1:a]volume=0.5[sfx]"
    labels = "[sfx]"
    for k, (_, off) in enumerate(voices):
        ms = int(off * 1000)
        filt += f";[{k + 2}:a]adelay={ms}|{ms},volume=1.0[v{k}]"
        labels += f"[v{k}]"
    filt += f";{labels}amix=inputs={1 + len(voices)}:normalize=0:duration=longest[a]"
    cmd += ["-filter_complex", filt, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{TOTAL:.3f}", out_path]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    frames = int(TOTAL * FPS)
    with Pool(workers) as pool:
        for i, buf in enumerate(pool.imap(render_bytes, range(frames), chunksize=30)):
            ff.stdin.write(buf)
            if i % 300 == 0:
                print(f"frame {i}/{frames}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("selesai:", out_path)


def main():
    global PLAN, TOTAL
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="output/xp-lane-kebal.mp4")
    ap.add_argument("--audio-dir", help="folder berisi scene_01.mp3 ... scene_10.mp3")
    ap.add_argument("--stills", action="store_true", help="simpan pratinjau PNG tiap scene lalu keluar")
    ap.add_argument("--at", type=float, nargs="+", help="simpan PNG pada detik global tertentu lalu keluar")
    ap.add_argument("--still-dir", default="stills_xp")
    ap.add_argument("--workers", type=int, default=os.cpu_count())
    args = ap.parse_args()
    if args.audio_dir:
        PLAN, TOTAL = make_plan(args.audio_dir)
    print(f"durasi total {TOTAL:.1f} dtk ({int(TOTAL // 60)}:{int(TOTAL % 60):02d}), {int(TOTAL * FPS)} frame")
    if args.stills or args.at:
        os.makedirs(args.still_dir, exist_ok=True)
        times = args.at or []
        if args.stills:
            for i, sc in enumerate(PLAN):
                for f in (0.18, 0.5, 0.88):
                    times.append(sc["start"] + LEAD + f * sc["a"])
        for t in times:
            path = os.path.join(args.still_dir, f"t{t:06.2f}.png")
            render(t).save(path)
            print(path)
        return
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    encode(args.out, args.workers)


if __name__ == "__main__":
    main()

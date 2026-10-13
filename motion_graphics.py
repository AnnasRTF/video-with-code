#!/usr/bin/env python3
"""Video motion graphics yang dirender dari kode.

Setiap frame digambar dengan Pillow (supersampling 2x), suaranya disintesis
dengan NumPy, lalu semuanya digabung jadi MP4 oleh ffmpeg.

Pemakaian:
    python3 motion_graphics.py                      # render output/motion-graphics.mp4
    python3 motion_graphics.py --still 0.8 4.2 6.6  # simpan PNG pratinjau pada detik tertentu
"""
import argparse
import math
import os
import subprocess
import tempfile
import wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont

W, H, FPS, DUR = 1920, 1080, 30, 10.0
SS = 2  # supersampling: gambar 2x lalu diperkecil agar tepi halus

# ---------------------------------------------------------------- palette
NAVY = (11, 16, 32)
CARD = (22, 30, 63)
WHITE = (244, 246, 255)
MUTED = (150, 163, 208)
CORAL = (255, 90, 95)
TEAL = (46, 230, 197)
YELLOW = (255, 209, 102)
VIOLET = (124, 92, 255)

FONT_DIR = "/usr/share/fonts/opentype/inter/"
FONTS = {
    "black": FONT_DIR + "Inter-Black.otf",
    "xbold": FONT_DIR + "Inter-ExtraBold.otf",
    "bold": FONT_DIR + "Inter-Bold.otf",
    "med": FONT_DIR + "Inter-Medium.otf",
    "reg": FONT_DIR + "Inter-Regular.otf",
    "mono": "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
}

# ------------------------------------------------------------ timeline (detik)
SCENE_START = [0.0, 3.0, 5.9, 8.05]  # awal animasi tiap adegan
WIPES = [(2.9, False), (5.8, False), (7.9, True)]  # (pusat transisi, arah dibalik)
WIPE_DUR = 0.7
WIPE_SKEW = 200
WIPE_BAND = W + WIPE_SKEW + 500
WIPE_STEP = 120  # selisih tiap lapis warna


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def lerp(a, b, x):
    return a + (b - a) * x


def prog(t, t0, dur):
    return clamp((t - t0) / dur)


def out_cubic(x):
    return 1 - (1 - x) ** 3


def in_out_cubic(x):
    return 4 * x**3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def out_expo(x):
    return 1.0 if x >= 1 else 1 - 2 ** (-10 * x)


def out_back(x, s=1.70158):
    x -= 1
    return 1 + (s + 1) * x**3 + s * x**2


def col(rgb, a=1.0):
    return (*rgb, int(255 * clamp(a)))


# --------------------------------------------------------------- painter
@lru_cache(None)
def font(name, px):
    return ImageFont.truetype(FONTS[name], int(round(px * SS)))


class Painter:
    """Menggambar dengan koordinat 1080p ke kanvas RGB berukuran SSx."""

    def __init__(self, im):
        self.im = im
        self.d = ImageDraw.Draw(im, "RGBA")  # mode RGBA = blending alpha

    def circle(self, cx, cy, r, fill=None, outline=None, width=1):
        if r <= 0:
            return
        self.d.ellipse(
            [(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
            fill=fill, outline=outline, width=max(1, int(width * SS)),
        )

    def rrect(self, x0, y0, x1, y1, r, fill=None, outline=None, width=1):
        if x1 - x0 < 1 or y1 - y0 < 1:
            return
        self.d.rounded_rectangle(
            [x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=r * SS,
            fill=fill, outline=outline, width=max(1, int(width * SS)),
        )

    def poly(self, pts, fill):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=fill)

    def line(self, x0, y0, x1, y1, color, width):
        self.d.line([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=color, width=max(1, int(width * SS)))

    def rect_fill(self, color):
        self.d.rectangle([0, 0, W * SS, H * SS], fill=color)

    def text(self, x, y, s, f, size, color, anchor="ls", alpha=1.0, clip=None):
        """Teks dengan alpha dan (opsional) clip rect untuk efek slide-up bermasker."""
        if alpha <= 0.003 or size < 4:
            return
        fnt = font(f, size)
        bx0, by0, bx1, by1 = fnt.getbbox(s, anchor=anchor)
        pad = 4
        w, h = bx1 - bx0 + 2 * pad, by1 - by0 + 2 * pad
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).text((pad - bx0, pad - by0), s, font=fnt, fill=255, anchor=anchor)
        ox, oy = round(x * SS) + bx0 - pad, round(y * SS) + by0 - pad
        if clip:
            cx0, cy0, cx1, cy1 = (round(v * SS) for v in clip)
            box = Image.new("L", (w, h), 0)
            ImageDraw.Draw(box).rectangle([cx0 - ox, cy0 - oy, cx1 - ox - 1, cy1 - oy - 1], fill=255)
            mask = ImageChops.multiply(mask, box)
        if alpha < 1:
            mask = mask.point(lambda v: int(v * alpha))
        self.im.paste(color, (ox, oy, ox + w, oy + h), mask)

    def ring(self, cx, cy, r, w, frac, color):
        """Cincin progres dengan ujung membulat, mulai dari jam 12."""
        self.circle(cx, cy, r, outline=col(WHITE, 0.09), width=w)
        if frac <= 0.002:
            return
        a0, a1 = -90, -90 + 360 * frac
        self.d.arc([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS],
                   a0, a1, fill=color, width=int(w * SS))
        rm = r - w / 2
        for ang in (a0, a1):
            rad = math.radians(ang)
            self.circle(cx + rm * math.cos(rad), cy + rm * math.sin(rad), w / 2, fill=color)


def rot_square(cx, cy, size, ang):
    h = size / 2
    return [(cx + math.cos(ang) * x - math.sin(ang) * y, cy + math.sin(ang) * x + math.cos(ang) * y)
            for x, y in ((-h, -h), (h, -h), (h, h), (-h, h))]


def tri(cx, cy, r, ang):
    return [(cx + r * math.cos(ang + k * 2 * math.pi / 3), cy + r * math.sin(ang + k * 2 * math.pi / 3))
            for k in range(3)]


# ------------------------------------------------------------- background
_yy, _xx = np.mgrid[0 : H // 2, 0 : W // 2].astype(np.float32)


def background(t):
    ys = (_yy / (H / 2))[..., None]
    top, bot = np.array(NAVY, np.float32), np.array((20, 27, 58), np.float32)
    img = top * (1 - ys) + bot * ys
    for (gx, gy, color, strength) in (
        (0.72 * W + 220 * math.cos(t * 0.5), 0.28 * H + 120 * math.sin(t * 0.7), VIOLET, 0.24),
        (0.18 * W + 180 * math.sin(t * 0.4), 0.86 * H + 90 * math.cos(t * 0.6), TEAL, 0.14),
    ):
        d2 = ((_xx * 2 - gx) ** 2 + (_yy * 2 - gy) ** 2)[..., None]
        g = np.exp(-d2 / (2 * 520.0**2)) * strength
        img = img * (1 - g) + np.array(color, np.float32) * g
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
    return im.resize((W * SS, H * SS), Image.BILINEAR)


def dot_grid(p, t):
    step, off = 60, (t * 14) % 60
    for gy in range(30, H, step):
        for gx in range(-30, W + 60, step):
            x = gx + off
            wv = (math.sin((x + gy) * 0.006 - t * 1.6) + 1) / 2
            p.circle(x, gy, 1.4 + 1.1 * wv, fill=col(WHITE, 0.07 + 0.16 * wv))


# ------------------------------------------------------------ transisi wipe
def wipe_L(t, c):
    e = in_out_cubic(prog(t, c - WIPE_DUR / 2, WIPE_DUR))
    return lerp(-WIPE_SKEW, W + WIPE_BAND + 2 * WIPE_STEP, e)


def scene_index(t):
    """Adegan yang tampil: ganti saat band wipe menutup penuh layar."""
    return sum(1 for c, _ in WIPES if wipe_L(t, c) >= W + 2 * WIPE_STEP + 250)


def draw_wipe(p, t):
    for c, flip in WIPES:
        if not (c - WIPE_DUR / 2 < t < c + WIPE_DUR / 2 + 0.001):
            continue
        L = wipe_L(t, c)
        for k, color in enumerate((CORAL, VIOLET, TEAL)):
            lead = L - k * WIPE_STEP
            pts = [(lead - WIPE_BAND + WIPE_SKEW, 0), (lead + WIPE_SKEW, 0), (lead, H), (lead - WIPE_BAND, H)]
            if flip:
                pts = [(W - x, y) for x, y in pts]
            p.poly(pts, col(color))


# ------------------------------------------------------------------ HUD
def timeline(p, t, a):
    if a <= 0:
        return
    x0, x1, y = 250, 1670, 880
    xh = x0 + (x1 - x0) * t / DUR
    p.rrect(x0, y - 4, x1, y + 4, 4, fill=col(WHITE, 0.12 * a))
    p.rrect(x0, y - 4, xh, y + 4, 4, fill=col(VIOLET, a))
    for i in range(21):
        x = x0 + (x1 - x0) * i / 20
        p.line(x, y + 18, x, y + (36 if i % 5 == 0 else 28), col(WHITE, 0.22 * a), 2)
    p.line(xh, y - 30, xh, y + 12, col(WHITE, a), 3)
    p.circle(xh, y, 12, fill=col(WHITE, a))
    p.text(xh, y - 44, f"0:{t:05.2f}", "mono", 22, WHITE, "ms", alpha=a)


# ---------------------------------------------------------------- adegan
def slide_line(p, x, base, s, f, size, color, u, start, dur=0.8, width=1500):
    """Teks naik dari bawah garis dasar dan terpotong oleh mask."""
    q = out_expo(prog(u, start, dur))
    clip = (x - 30, base - size * 0.9, x + width, base + size * 0.28)
    p.text(x, base + (1 - q) * size * 1.1, s, f, size, color, "ls", clip=clip)


def scene1(p, t, u):
    cx, cy = 1500, 540
    for i in range(3):  # gelombang kejut
        q = prog(u, 0.1 + 0.2 * i, 1.2)
        if 0 < q < 1:
            p.circle(cx, cy, lerp(60, 560, out_expo(q)), outline=col(CORAL, (1 - q) * 0.55), width=4)
    p.circle(cx, cy, 200 * out_cubic(prog(u, 0.2, 0.7)), outline=col(WHITE, 0.14), width=2)

    cs = out_back(prog(u, 0.15, 0.6))
    pulse = 1 + 0.03 * math.sin(u * 4)
    p.circle(cx, cy, 160 * cs, fill=col(VIOLET, 0.16))
    p.circle(cx, cy, 112 * cs * pulse, fill=col(VIOLET))
    p.text(cx, cy + 4, "</>", "xbold", 64 * cs, WHITE, "mm", alpha=clamp(cs))

    spin = u * 1.5 + 2.5 * (1 - out_cubic(prog(u, 0.2, 1.3)))
    for k, (kind, color) in enumerate((("circle", CORAL), ("square", TEAL), ("tri", YELLOW))):
        ang = -math.pi / 2 + spin + k * 2 * math.pi / 3
        s = max(0.0, out_back(prog(u, 0.35 + 0.12 * k, 0.5)))
        x, y = cx + 200 * math.cos(ang), cy + 200 * math.sin(ang)
        if kind == "circle":
            p.circle(x, y, 40 * s, fill=col(color))
        elif kind == "square":
            p.poly(rot_square(x, y, 70 * s, u * 2), col(color))
        else:
            p.poly(tri(x, y, 52 * s, -u * 1.7), col(color))

    X = 200
    slide_line(p, X, 470, "VIDEO", "black", 160, WHITE, u, 0.35)
    slide_line(p, X, 635, "WITH CODE", "black", 160, CORAL, u, 0.6)
    w = 500 * out_expo(prog(u, 1.0, 0.7))
    p.rrect(X, 690, X + w, 704, 7, fill=col(TEAL))
    if w > 1:
        p.circle(X + w, 697, 14 * clamp(w / 40), fill=col(YELLOW))
    q = out_cubic(prog(u, 1.3, 0.6))
    p.text(X, 790 + (1 - q) * 20, "Motion graphics yang dirender dari kode.", "med", 40, MUTED, "ls", alpha=q)


CARDS = [
    ("01", "Tulis kode", ("Gerakan, warna, dan waktu", "diatur lewat skrip Python."), CORAL),
    ("02", "Render frame", ("Tiap frame digambar satu", "per satu dengan Pillow."), TEAL),
    ("03", "Jadi video", ("ffmpeg menyatukan semua", "frame menjadi file MP4."), YELLOW),
]


def scene2(p, t, u):
    slide_line(p, 250, 205, "Cara kerjanya", "xbold", 80, WHITE, u, 0.0, 0.7)
    for i, (num, title, lines, color) in enumerate(CARDS):
        x, y = 250 + i * 500, 290
        q = prog(u, 0.25 + 0.35 * i, 0.7)
        a = clamp(q * 3)
        yy = y + (1 - out_cubic(q)) * 70
        p.rrect(x, yy, x + 420, yy + 400, 30, fill=col(CARD, 0.92 * a), outline=col(WHITE, 0.12 * a), width=2)

        ic = max(0.0, out_back(prog(u, 0.4 + 0.35 * i, 0.5)))
        ix, iy = x + 100, yy + 110
        p.circle(ix, iy, 58 * ic, fill=col(color))
        ink = WHITE if i == 0 else NAVY
        if i == 0:
            p.text(ix, iy + 3, "</>", "xbold", 36 * ic, ink, "mm")
        elif i == 1:
            lit = int(u * 5) % 4
            for n, (dx, dy) in enumerate(((-14, -14), (14, -14), (-14, 14), (14, 14))):
                s = 11 * ic
                p.rrect(ix + dx - s, iy + dy - s, ix + dx + s, iy + dy + s, 4, fill=col(NAVY, 1.0 if n == lit else 0.3))
        else:
            k = ic * (1 + 0.05 * math.sin(u * 6))
            p.poly([(ix - 13 * k, iy - 22 * k), (ix - 13 * k, iy + 22 * k), (ix + 24 * k, iy)], col(NAVY))

        p.text(x + 382, yy + 78, num, "bold", 40, MUTED, "rs", alpha=0.55 * a)
        p.text(x + 40, yy + 270, title, "bold", 46, WHITE, "ls", alpha=a)
        for j, line in enumerate(lines):
            p.text(x + 40, yy + 325 + 38 * j, line, "reg", 26, MUTED, "ls", alpha=a)

    for i in range(2):  # panah penghubung
        q = out_cubic(prog(u, 0.75 + 0.35 * i, 0.4))
        if q <= 0:
            continue
        xs, y = 684 + i * 500, 490
        xe = xs + 52 * q
        p.line(xs, y, xe - 4, y, col(WHITE, 0.55), 3)
        if q > 0.7:
            p.poly([(xe, y), (xe - 12, y - 9), (xe - 12, y + 9)], col(WHITE, 0.7))
    timeline(p, t, clamp((u - 1.0) / 0.4))


RINGS = [(30, "frame per detik", CORAL), (300, "frame dirender", TEAL), (1080, "piksel tinggi", YELLOW)]


def scene3(p, t, u):
    slide_line(p, 250, 205, "Satu skrip, satu video.", "xbold", 80, WHITE, u, 0.0, 0.7)
    for i, (value, label, color) in enumerate(RINGS):
        cx, cy = 250 + 1420 / 6 * (1 + 2 * i), 520
        q = out_cubic(prog(u, 0.2 + 0.18 * i, 0.9))
        a = clamp(prog(u, 0.1 + 0.18 * i, 0.3))
        p.ring(cx, cy, 150, 16, q, col(color, a))
        p.text(cx, cy + 6, f"{round(value * q)}", "xbold", 90, WHITE, "mm", alpha=a)
        p.text(cx, cy + 150 + 75, label, "med", 30, MUTED, "mm", alpha=clamp(prog(u, 0.4 + 0.18 * i, 0.4)))
    timeline(p, t, clamp((u - 0.4) / 0.4))


def scene4(p, t, u):
    cx, cy = 960, 430
    for i in range(2):
        q = prog(u, 0.15 + 0.25 * i, 1.0)
        if 0 < q < 1:
            p.circle(cx, cy, lerp(110, 360, out_expo(q)), outline=col(CORAL, (1 - q) * 0.5), width=4)
    s = max(0.0, out_back(prog(u, 0.0, 0.6)))
    p.circle(cx, cy, 150 * s, fill=col(CORAL, 0.16))
    p.circle(cx, cy, 110 * s, fill=col(CORAL))
    p.poly([(cx - 30 * s, cy - 50 * s), (cx - 30 * s, cy + 50 * s), (cx + 56 * s, cy)], col(WHITE))
    slide_line_c(p, cx, 700, "Video with Code", "black", 88, WHITE, u, 0.35)
    q = out_cubic(prog(u, 0.7, 0.5))
    p.text(cx, 780 + (1 - q) * 16, "Motion graphics dari kode.", "med", 38, MUTED, "mm", alpha=q)


def slide_line_c(p, cx, base, s, f, size, color, u, start, dur=0.8):
    q = out_expo(prog(u, start, dur))
    clip = (cx - 700, base - size * 0.9, cx + 700, base + size * 0.28)
    p.text(cx, base + (1 - q) * size * 1.1, s, f, size, color, "ms", clip=clip)


SCENES = [scene1, scene2, scene3, scene4]


# ---------------------------------------------------------------- frame
def render(t):
    im = background(t)
    p = Painter(im)
    dot_grid(p, t)
    idx = scene_index(t)
    SCENES[idx](p, t, t - SCENE_START[idx])
    draw_wipe(p, t)
    fade = max(1 - prog(t, 0, 0.25), prog(t, DUR - 0.4, 0.4))
    if fade > 0:
        p.rect_fill(col((8, 12, 26), fade))
    return im.reduce(SS)


def render_bytes(i):
    return np.asarray(render(i / FPS)).tobytes()


# ---------------------------------------------------------------- audio
SR = 44100


def make_audio(path):
    n = int(SR * DUR)
    out = np.zeros(n, np.float32)

    def add(sig, t0, gain=1.0):
        i0 = int(t0 * SR)
        seg = sig[: max(0, n - i0)]
        out[i0 : i0 + len(seg)] += seg * gain

    def tone(f0, dur, decay, f1=None):
        tt = np.arange(int(dur * SR)) / SR
        f = f0 if f1 is None else f0 + (f1 - f0) * tt / dur
        ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, tt.shape)) / SR
        return (np.sin(ph) * np.exp(-tt * decay) * np.minimum(1, tt / 0.004)).astype(np.float32)

    def whoosh(dur):
        rng = np.random.default_rng(7)
        x = rng.standard_normal(int(dur * SR)).astype(np.float32)
        bell = np.sin(np.pi * np.linspace(0, 1, len(x))) ** 2
        y, prev = np.empty_like(x), 0.0
        for i, v in enumerate(x):  # low-pass satu kutub, cutoff naik lalu turun
            prev += (0.02 + 0.3 * bell[i]) * (v - prev)
            y[i] = prev
        return y / np.abs(y).max() * bell

    tt = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * tt) for f in (110.0, 164.81, 220.0, 329.63))
    pad *= 0.025 * (1 + 0.15 * np.sin(2 * np.pi * 0.25 * tt))
    pad *= np.minimum(1, tt / 1.0) * np.minimum(1, (DUR - tt) / 0.8)
    out += pad.astype(np.float32)

    add(tone(90, 0.6, 6, 45), 0.12, 0.5)  # dentuman pembuka
    add(tone(520, 0.15, 20, 900), SCENE_START[0] + 0.35, 0.22)  # judul naik
    add(tone(420, 0.15, 20, 760), SCENE_START[0] + 0.6, 0.22)
    for c, _ in WIPES:
        add(whoosh(WIPE_DUR), c - WIPE_DUR / 2, 0.32)
    for i in range(3):  # kartu muncul
        add(tone(420 + 80 * i, 0.2, 16, 760 + 100 * i), SCENE_START[1] + 0.25 + 0.35 * i + 0.05, 0.28)
    for i in range(3):  # cincin terisi
        t0 = SCENE_START[2] + 0.2 + 0.18 * i
        add(tone(300 + 60 * i, 0.9, 3.5, 900 + 150 * i), t0, 0.1)
        add(tone(880 + 220 * i, 0.3, 12), t0 + 0.9, 0.12)
    for f in (659.25, 987.77, 1318.5):  # lonceng penutup
        add(tone(f, 2.0, 2.4), SCENE_START[3] + 0.05, 0.16)
    add(tone(110, 0.8, 5, 55), SCENE_START[3], 0.4)

    out *= 0.85 / max(1e-6, np.abs(out).max())
    pcm = (np.clip(out, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="output/motion-graphics.mp4")
    ap.add_argument("--still", type=float, nargs="+", help="simpan PNG pratinjau pada detik tertentu lalu keluar")
    ap.add_argument("--still-dir", default="stills")
    ap.add_argument("--wav", help="lokasi WAV sementara (default: folder temp)")
    args = ap.parse_args()

    if args.still:
        os.makedirs(args.still_dir, exist_ok=True)
        for s in args.still:
            path = os.path.join(args.still_dir, f"t{s:05.2f}.png")
            render(s).save(path)
            print(path)
        return

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    wav = args.wav or os.path.join(tempfile.mkdtemp(), "audio.wav")
    make_audio(wav)
    frames = int(DUR * FPS)
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav,
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-shortest", args.out],
        stdin=subprocess.PIPE,
    )
    with Pool(os.cpu_count()) as pool:
        for i, buf in enumerate(pool.imap(render_bytes, range(frames), chunksize=4)):
            ff.stdin.write(buf)
            if i % 30 == 0:
                print(f"frame {i}/{frames}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("selesai:", args.out)


if __name__ == "__main__":
    main()

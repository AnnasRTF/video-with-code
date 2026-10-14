#!/usr/bin/env python3
"""Membuat efek suara dan musik latar untuk video secara sintetis (numpy saja, tanpa sampel berhak cipta).

Hasil:
    assets/sfx/*.wav   whoosh, riser, impact, pop, tick, click, zap, stamp, saber
    assets/music/bed.wav   loop 16 detik, 120 BPM (satu ketuk = 15 frame pada 30 fps), A minor

Pemakaian: python3 tools/make_audio.py
"""
import os
import wave

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SR = 44100
RNG = np.random.default_rng(7)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    pcm = (x * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def t_of(sec):
    return np.arange(int(sec * SR)) / SR


def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def swept_noise(sec, f0, f1, q=0.25, shape=None):
    """Noise yang pita frekuensinya bergeser dari f0 ke f1 (whoosh)."""
    n = int(sec * SR)
    noise = RNG.standard_normal(n)
    out = np.zeros(n)
    steps = 24
    edges = np.linspace(0, n, steps + 1).astype(int)
    for i in range(steps):
        a, b = edges[i], edges[i + 1]
        c = f0 * (f1 / f0) ** ((i + 0.5) / steps)
        seg = fft_filter(noise[a:b], lo=c * (1 - q), hi=c * (1 + q))
        out[a:b] = seg
    t = np.linspace(0, 1, n)
    env = shape(t) if shape else np.sin(np.pi * t) ** 1.5
    out *= env
    return out / (np.abs(out).max() + 1e-9)


def env_exp(n, decay):
    t = np.arange(n) / SR
    return np.exp(-t * decay)


def tone(freq, sec, harmonics=1, decay=None):
    t = t_of(sec)
    f = np.asarray(freq) if np.ndim(freq) else np.full_like(t, freq)
    phase = 2 * np.pi * np.cumsum(f) / SR
    out = sum(np.sin(phase * h) / h for h in range(1, harmonics + 1))
    if decay:
        out *= np.exp(-t * decay)
    return out


def build_sfx(folder):
    os.makedirs(folder, exist_ok=True)
    # whoosh: lewat cepat
    w = swept_noise(0.75, 300, 5200, q=0.45)
    write_wav(os.path.join(folder, "whoosh.wav"), np.stack([w, np.roll(w, 90)], axis=1) * 0.8)
    # riser: naik, berakhir mendadak
    r = swept_noise(1.1, 200, 7000, q=0.35, shape=lambda t: t**2.2)
    write_wav(os.path.join(folder, "riser.wav"), r * 0.7)
    # impact: dentuman rendah
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (46 + 90 * np.exp(-t * 18)) * t) * np.exp(-t * 4.5)
    crack = fft_filter(RNG.standard_normal(n), lo=900, hi=7000) * np.exp(-t * 38) * 0.6
    sub = np.sin(2 * np.pi * 34 * t) * np.exp(-t * 3.2) * 0.4
    imp = thump + crack + sub
    write_wav(os.path.join(folder, "impact.wav"), imp / np.abs(imp).max() * 0.9)
    # pop: blip cerah
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    f = 520 + 520 * (1 - np.exp(-t * 60))
    p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
    p += 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 40)
    write_wav(os.path.join(folder, "pop.wav"), p / np.abs(p).max() * 0.8)
    # tick: klik halus
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    k = fft_filter(RNG.standard_normal(n), lo=1500, hi=9000) * np.exp(-t * 120)
    k += np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 90) * 0.5
    write_wav(os.path.join(folder, "tick.wav"), k / np.abs(k).max() * 0.7)
    # click: klik mouse, dua transien
    c = np.zeros(int(0.22 * SR))
    for off, amp in ((0, 1.0), (int(0.085 * SR), 0.6)):
        m = int(0.03 * SR)
        tt = np.arange(m) / SR
        c[off : off + m] += (fft_filter(RNG.standard_normal(m), lo=800, hi=6000) * np.exp(-tt * 160) + np.sin(2 * np.pi * 1100 * tt) * np.exp(-tt * 150) * 0.6) * amp
    write_wav(os.path.join(folder, "click.wav"), c / np.abs(c).max() * 0.7)
    # zap: glitch, noise dengan potongan acak
    n = int(0.3 * SR)
    z = RNG.standard_normal(n)
    z = fft_filter(z, lo=400, hi=9000)
    gate = np.repeat(RNG.random(int(0.3 * 60)) > 0.45, int(SR / 60))[:n]
    z = np.round(z * 4) / 4 * gate * np.exp(-np.arange(n) / SR * 6)
    write_wav(os.path.join(folder, "zap.wav"), z / (np.abs(z).max() + 1e-9) * 0.7)
    # stamp: stiker menempel
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * (110 + 160 * np.exp(-t * 40)) * t) * np.exp(-t * 16)
    s += fft_filter(RNG.standard_normal(n), lo=700, hi=4500) * np.exp(-t * 60) * 0.5
    write_wav(os.path.join(folder, "stamp.wav"), s / np.abs(s).max() * 0.85)
    # saber: dengung naik singkat
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 180 + 520 * (t / 0.9) ** 1.6
    hum = tone(f, 0.9, harmonics=6) * (0.75 + 0.25 * np.sin(2 * np.pi * 38 * t))
    hum *= np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 0.7
    write_wav(os.path.join(folder, "saber.wav"), hum / np.abs(hum).max() * 0.6)


# ---------------------------------------------------------------------------------------------
BPM = 120
BEAT = 60 / BPM
NOTE = {"A": 57, "B": 59, "C": 60, "D": 62, "E": 64, "F": 65, "G": 67}


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(freq, sec, harm=18):
    t = t_of(sec)
    out = np.zeros_like(t)
    for h in range(1, harm + 1):
        if freq * h > 7000:
            break
        out += np.sin(2 * np.pi * freq * h * t) / h
    return out


def build_music(path):
    bars = 8
    total = int(bars * 4 * BEAT * SR)
    mix = np.zeros((total, 2))
    chords = [(57, 60, 64), (53, 57, 60), (60, 64, 67), (55, 59, 62)]  # Am F C G, masing-masing 2 bar

    def place(sig, at, gain=1.0, pan=0.0):
        a = int(at * SR)
        b = min(total, a + len(sig))
        if a >= total:
            return
        seg = sig[: b - a] * gain
        mix[a:b, 0] += seg * (1 - max(0, pan))
        mix[a:b, 1] += seg * (1 + min(0, pan))

    # drum
    kick_n = int(0.4 * SR)
    tk = np.arange(kick_n) / SR
    kick = np.sin(2 * np.pi * (44 + 110 * np.exp(-tk * 28)) * tk) * np.exp(-tk * 9)
    hat_n = int(0.06 * SR)
    th = np.arange(hat_n) / SR
    hat = fft_filter(RNG.standard_normal(hat_n), lo=6000) * np.exp(-th * 90)
    clap_n = int(0.18 * SR)
    tc = np.arange(clap_n) / SR
    clap = fft_filter(RNG.standard_normal(clap_n), lo=1200, hi=6500) * np.exp(-tc * 28)
    for bar in range(bars):
        for beat in range(4):
            at = (bar * 4 + beat) * BEAT
            place(kick, at, 0.95)
            place(hat, at + BEAT / 2, 0.55)
            place(hat, at, 0.22)
            if beat % 2 == 1:
                place(clap, at, 0.45)
    # bass dan pad dan arp
    for bar in range(bars):
        chord = chords[bar // 2]
        root = chord[0] - 24
        for step in range(8):
            at = (bar * 4 + step * 0.5) * BEAT
            m = root + (12 if step in (3, 6) else 0)
            if step in (2, 5):
                continue
            n = int(0.38 * BEAT * 2 * SR)
            b = saw(mtof(m), n / SR, harm=7) * np.exp(-np.arange(n) / SR * 7)
            b = fft_filter(b, hi=700)
            place(b, at, 0.55)
        # pad
        dur = 4 * BEAT
        pad = np.zeros(int(dur * SR))
        for m in chord:
            for det in (-0.12, 0.12):
                pad += saw(mtof(m) * 2 ** (det / 12), dur, harm=10)
        pad = fft_filter(pad, hi=1600)
        tt = np.arange(len(pad)) / SR
        pad *= np.minimum(1, tt / 0.5) * np.minimum(1, (dur - tt) / 0.6)
        place(pad, bar * 4 * BEAT, 0.1)
        # arp 16th
        for s in range(16):
            at = (bar * 4 + s * 0.25) * BEAT
            m = chord[[0, 1, 2, 1][s % 4]] + 12 + (12 if s % 8 >= 4 else 0)
            n = int(0.22 * SR)
            p = saw(mtof(m), n / SR, harm=9) * np.exp(-np.arange(n) / SR * 16)
            p = fft_filter(p, hi=3200)
            place(p, at, 0.2, pan=0.5 if s % 2 else -0.5)
    # side-chain sederhana: tekan semua kecuali kick tiap ketukan
    duck = np.ones(total)
    dn = int(0.22 * SR)
    shape = 1 - 0.55 * np.exp(-np.arange(dn) / SR * 14)
    for i in range(bars * 4):
        a = int(i * BEAT * SR)
        duck[a : a + dn] = np.minimum(duck[a : a + dn], shape[: total - a][:dn])
    # kick dipisah dulu supaya tidak ikut ditekan: tambahkan ulang
    kicks = np.zeros((total, 2))
    for i in range(bars * 4):
        a = int(i * BEAT * SR)
        seg = kick[: total - a] * 0.95
        kicks[a : a + len(seg)] += seg[:, None]
    ducked = mix * duck[:, None]
    # kick sudah masuk di mix; ganti dengan versi tanpa duck
    mix_no_kick = ducked
    out = mix_no_kick + kicks * 0.15
    out = np.tanh(out * 1.1)
    out /= np.abs(out).max()
    out *= 0.9
    write_wav(path, out)  # wav supaya loop-nya tepat 16,000 detik tanpa celah encoder


if __name__ == "__main__":
    build_sfx(os.path.join(ROOT, "assets/sfx"))
    os.makedirs(os.path.join(ROOT, "assets/music"), exist_ok=True)
    build_music(os.path.join(ROOT, "assets/music/bed.wav"))
    print("selesai")

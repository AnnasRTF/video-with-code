# video-with-code

Video motion graphics yang dirender dari kode. Ada dua renderer:

- **Remotion** (folder `remotion/`): dipakai untuk video tips "XP lane kebal". Lihat bagian di bawah.
- **Pillow** (`motion_graphics.py`, `xp_lane_video.py`): renderer lama, masih bisa dipakai.

## Video tips "XP lane kebal" dengan Remotion

Sepuluh scene React, tiap scene mengikuti durasi file suaranya (`assets/voice/scene_01.mp3` sampai `scene_10.mp3`). Komposisi `Full` menyambung semuanya dengan transisi bentuk hitam.

```bash
cd remotion && npm install
npm run studio                                   # pratinjau interaktif
npx remotion render src/index.ts Full out/xp-lane-kebal.mp4 --public-dir=../assets
npx remotion render src/index.ts Scene07 out/scene07.mp4 --public-dir=../assets   # satu scene saja (Scene01 sampai Scene10)
node tools/stills.mjs out/stills Scene07:0.2,0.6 Full:760   # banyak PNG sekaligus; angka di bawah 1 = fraksi durasi
```

Di lingkungan tanpa Chrome bawaan Remotion, tambahkan `--browser-executable=<path chromium headless shell>` (untuk `tools/stills.mjs`: variabel `BROWSER`).

| File | Isi |
| --- | --- |
| `remotion/src/scenes/*.tsx` | Satu file per scene (`Hook`, `Tugas`, `Meta`, `Hero`, `Draft`, `Items`, `Freeze`, `Rotasi`, `Outro`) |
| `remotion/src/ui.tsx` | Komponen bersama: `Shell`, `Title`, `Saber` (garis ala light saber), `Select` dan `Cursor`, `Marquee`, `Float` |
| `remotion/src/cue.ts` | `makeCue` mengubah potongan kalimat VO menjadi nomor frame, jadi animasi ikut kalimat |
| `remotion/src/script.json` | Naskah VO (diekspor dari `xp_script.py`) |
| `tools/split_voice.py` | Memecah satu file VO utuh menjadi per scene, menulis `assets/voice/timing.json` |

Batas scene dari `split_voice.py` adalah perkiraan (jeda di audio dicocokkan ke urutan kalimat), bisa meleset sekitar satu detik. Kalau ada yang salah potong, kirim ekspor per scene atau koreksi `timing.json` lalu potong ulang dengan ffmpeg.

Lisensi Remotion: perusahaan berskala tertentu wajib membeli lisensi, lihat https://www.remotion.dev/license.

## Demo 10 detik (Pillow)

```bash
python3 motion_graphics.py                      # hasil: output/motion-graphics.mp4 (1920x1080, 30 fps, 10 detik)
python3 motion_graphics.py --still 0.8 4.2 7.0  # PNG pratinjau pada detik tertentu (folder stills/)
```

Teks, warna, dan durasi tiap adegan ada di bagian atas `motion_graphics.py` (`SCENE_START`, `WIPES`, `CARDS`, `RINGS`, palet warna).

## Versi Pillow dari video tips "XP lane kebal" (Mobile Legends, Season 42)

Sepuluh scene, memakai renderer dan palet dari `motion_graphics.py`.

| File | Isi |
| --- | --- |
| `xp_lane_video.py` | Animasi tiap scene dan perakitan video |
| `xp_script.py` | Naskah voice-over v3 (teks biasa dan versi dengan tag ElevenLabs) |
| `assets/` | Ikon hero, item, peta (milik Moonton), `manifest.json`, `CREDITS.md` |
| `research/verifikasi.md` | Verifikasi tiap klaim ke sumber, dengan URL dan tanggal akses |

```bash
python3 xp_lane_video.py --stills                 # PNG pratinjau tiap scene (folder stills_xp/)
python3 xp_lane_video.py --at 30 95 180           # PNG pada detik global tertentu
python3 xp_lane_video.py                          # render tanpa VO: output/xp-lane-kebal.mp4
python3 xp_lane_video.py --audio-dir voice/       # render dengan suara dari ElevenLabs
```

Untuk `--audio-dir`, simpan satu file suara per scene dengan nama `scene_01.mp3` sampai `scene_10.mp3` (wav atau m4a juga bisa).
Durasi tiap scene mengikuti panjang file suaranya, dan animasi disinkronkan ke kalimat VO. Tanpa `--audio-dir`, durasi diperkirakan dari jumlah kata.

Kebutuhan: Python 3 dengan `pillow` dan `numpy`, `ffmpeg` (termasuk `ffprobe`), dan font Inter (path ada di `FONT_DIR` di `motion_graphics.py`).

# video-with-code

Video motion graphics yang dirender dari kode: Pillow menggambar tiap frame, NumPy mensintesis efek suara, ffmpeg menggabungkannya menjadi MP4.

## Demo 10 detik

```bash
python3 motion_graphics.py                      # hasil: output/motion-graphics.mp4 (1920x1080, 30 fps, 10 detik)
python3 motion_graphics.py --still 0.8 4.2 7.0  # PNG pratinjau pada detik tertentu (folder stills/)
```

Teks, warna, dan durasi tiap adegan ada di bagian atas `motion_graphics.py` (`SCENE_START`, `WIPES`, `CARDS`, `RINGS`, palet warna).

## Video tips "XP lane kebal" (Mobile Legends, Season 42)

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

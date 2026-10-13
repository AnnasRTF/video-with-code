# video-with-code

Video motion graphics yang dirender dari kode: Pillow menggambar tiap frame, NumPy mensintesis suara, ffmpeg menggabungkannya menjadi MP4.

## Pemakaian

```bash
python3 motion_graphics.py                      # hasil: output/motion-graphics.mp4 (1920x1080, 30 fps, 10 detik)
python3 motion_graphics.py --still 0.8 4.2 7.0  # PNG pratinjau pada detik tertentu (folder stills/)
```

Kebutuhan: Python 3 dengan `pillow` dan `numpy`, `ffmpeg`, dan font Inter (path ada di `FONT_DIR`).

## Mengubah isi

Teks, warna, dan durasi tiap adegan ada di bagian atas `motion_graphics.py` (`SCENE_START`, `WIPES`, `CARDS`, `RINGS`, palet warna).

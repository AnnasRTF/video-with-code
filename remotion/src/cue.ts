import script from './script.json';

// Jeda sebelum VO mulai dan sesudah VO selesai (detik), sama dengan versi Pillow.
export const LEAD = 0.6;
export const TAIL = 0.7;
// Perkiraan kata per detik kalau file suara belum ada.
export const WPS = 2.5;

export const sceneVo = (index: number) => script[index].vo;

export const estimateSeconds = (index: number) => sceneVo(index).trim().split(/\s+/).length / WPS;

export const sceneFrames = (index: number, fps: number, audioSeconds?: number) =>
  Math.round((LEAD + (audioSeconds ?? estimateSeconds(index)) + TAIL) * fps);

/**
 * Mengubah sebuah kalimat di VO menjadi nomor frame. Posisinya diperkirakan dari letak kalimat
 * itu di teks, jadi animasi ikut bergeser kalau durasi suara berbeda dari perkiraan.
 */
export const makeCue = (vo: string, audioSeconds: number, fps: number) => (phrase: string | number) => {
  let fraction: number;
  if (typeof phrase === 'number') {
    fraction = phrase;
  } else {
    const at = vo.indexOf(phrase);
    if (at < 0) throw new Error(`Cue tidak ditemukan di VO: "${phrase}"`);
    fraction = at / vo.length;
  }
  return Math.round((LEAD + fraction * audioSeconds) * fps);
};

import script from './script.json';
import timing from './words.json';

// Jeda sebelum VO mulai dan sesudah VO selesai (detik), sama dengan versi Pillow.
export const LEAD = 0.6;
export const TAIL = 0.7;
// Perkiraan kata per detik kalau file suara belum ada.
export const WPS = 2.5;

export const sceneVo = (index: number) => script[index].vo;

export const estimateSeconds = (index: number) => sceneVo(index).trim().split(/\s+/).length / WPS;

export const sceneFrames = (index: number, fps: number, audioSeconds?: number) =>
  Math.round((LEAD + (audioSeconds ?? estimateSeconds(index)) + TAIL) * fps);

export type Word = {w: string; s: number; e: number};

const sceneIndexOf = (vo: string) => script.findIndex((sc) => sc.vo === vo);

/** Kata-kata VO sebuah scene beserta waktunya (detik dari awal file suara), dari tools/word_timing.py. */
export const wordsOf = (vo: string): Word[] => {
  const i = sceneIndexOf(vo);
  return i >= 0 ? (timing[i].words as Word[]) : [];
};

/** Indeks kata yang memuat posisi karakter `at` di teks VO. */
const tokenAt = (vo: string, at: number) => {
  let idx = -1;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(vo)) !== null) {
    if (m.index > at) break;
    idx++;
  }
  return Math.max(0, idx);
};

/** Mendahului kata sedikit supaya gambar sudah muncul saat kata diucapkan. */
const ANTICIPATE = 0.07;

/**
 * Mengubah sebuah kalimat di VO menjadi nomor frame. Waktu tiap kata diperkirakan dari audio
 * (`words.json`), jadi animasi jatuh tepat di kata itu. Kalau scene tidak dikenal, posisinya
 * diperkirakan dari letak kalimat di teks.
 */
export const makeCue = (vo: string, audioSeconds: number, fps: number) => {
  const words = wordsOf(vo);
  return (phrase: string | number) => {
    if (typeof phrase === 'number') return Math.round((LEAD + phrase * audioSeconds) * fps);
    const at = vo.indexOf(phrase);
    if (at < 0) throw new Error(`Cue tidak ditemukan di VO: "${phrase}"`);
    if (words.length) {
      const k = Math.min(words.length - 1, tokenAt(vo, at));
      return Math.max(0, Math.round((LEAD + words[k].s - ANTICIPATE) * fps));
    }
    return Math.round((LEAD + (at / vo.length) * audioSeconds) * fps);
  };
};

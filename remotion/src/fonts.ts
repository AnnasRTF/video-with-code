import {continueRender, delayRender, staticFile} from 'remotion';

const FILES: [number, string][] = [
  [400, 'Inter-Regular.otf'],
  [700, 'Inter-Bold.otf'],
  [800, 'Inter-ExtraBold.otf'],
  [900, 'Inter-Black.otf'],
];

let started = false;

/** Memuat font Inter dari assets/fonts dan menahan render sampai semuanya siap. */
export const loadFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender('Memuat font Inter');
  Promise.all(
    FILES.map(([weight, file]) => {
      const face = new FontFace('Inter', `url(${staticFile('fonts/' + file)})`, {weight: String(weight)});
      return face.load().then(() => document.fonts.add(face));
    }),
  )
    .catch((e) => console.error('Font gagal dimuat', e))
    .finally(() => continueRender(handle));
};

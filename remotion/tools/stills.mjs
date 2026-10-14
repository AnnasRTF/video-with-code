// Render banyak still sekaligus: node tools/stills.mjs <outDir> Scene07:100,300 Scene08:50 ...
// Fraksi (0 sampai 1) juga boleh: Scene07:0.2,0.5
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, {recursive: true});
const root = path.resolve(import.meta.dirname, '..');
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.resolve(root, '../assets')});
const browserExecutable = process.env.BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
for (const spec of specs) {
  const [id, list] = spec.split(':');
  const comp = await selectComposition({serveUrl, id, browserExecutable});
  for (const f of list.split(',')) {
    const n = Number(f);
    const frame = n < 1 && f.includes('.') ? Math.round(n * (comp.durationInFrames - 1)) : n;
    const file = path.join(out, `${id}_${String(frame).padStart(5, '0')}.png`);
    await renderStill({composition: comp, serveUrl, frame, output: file, browserExecutable, imageFormat: 'png'});
    console.log('ok', file, `(${comp.durationInFrames} frames)`);
  }
}

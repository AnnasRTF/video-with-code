import {evolvePath} from '@remotion/paths';
import React, {createContext, useContext, useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {LEAD, wordsOf} from './cue';
import {C, F, FRINGE} from './theme';

// ---------------------------------------------------------------------------------------------
// Waktu global dan ketukan musik (120 BPM = satu ketukan tiap 15 frame pada 30 fps)

/** Frame awal scene di timeline penuh, supaya denyut visual jatuh di ketukan yang sama antar scene. */
export const GlobalOffset = createContext(0);
export const BEAT_FRAMES = 15;

export const useBeat = () => {
  const offset = useContext(GlobalOffset);
  const f = useCurrentFrame() + offset;
  const phase = (f % BEAT_FRAMES) / BEAT_FRAMES;
  return {global: f, phase, pulse: Math.exp(-phase * 5.5), bar: (f % (BEAT_FRAMES * 4)) / (BEAT_FRAMES * 4)};
};

// ---------------------------------------------------------------------------------------------
// Efek suara (dibuat oleh tools/make_audio.py)

const SFX_FRAMES = {whoosh: 23, riser: 33, impact: 27, pop: 5, tick: 3, click: 7, zap: 9, stamp: 9, saber: 27} as const;
export type SfxName = keyof typeof SFX_FRAMES;

export const Sfx: React.FC<{name: SfxName; at: number; volume?: number}> = ({name, at, volume = 0.3}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={SFX_FRAMES[name] + 2} layout="none">
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

// ---------------------------------------------------------------------------------------------
// Kamera: dorongan zoom, goyangan, dan glitch RGB saat ada "hit"

export type CamKey = {f: number; s?: number; x?: number; y?: number};
export type Hit = {f: number; amp?: number; flash?: boolean; glitch?: boolean; sound?: boolean};
export type Cam = {keys?: CamKey[]; hits?: Hit[]};

export const useCamera = (cam: Cam | undefined, dur: number) => {
  const frame = useCurrentFrame();
  const {pulse} = useBeat();
  const keys = [{f: 0, s: 1, x: 0, y: 0}, ...(cam?.keys ?? [])].sort((a, b) => a.f - b.f);
  let s = 1;
  let x = 0;
  let y = 0;
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i];
    const prev = i ? keys[i - 1] : {s: 1, x: 0, y: 0};
    const t = interpolate(frame, [a.f - 14, a.f + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
    if (i === 0) continue;
    s += ((a.s ?? 1) - (prev.s ?? 1)) * t;
    x += ((a.x ?? 0) - (prev.x ?? 0)) * t;
    y += ((a.y ?? 0) - (prev.y ?? 0)) * t;
  }
  // gerak halus sepanjang scene
  s += 0.028 * (frame / Math.max(1, dur)) + 0.004 * pulse;
  x += 9 * Math.sin(frame / 70);
  y += 6 * Math.cos(frame / 90);
  let rot = 0;
  let glitch = 0;
  let flash = 0;
  for (const h of cam?.hits ?? []) {
    const dt = frame - h.f;
    if (dt < 0 || dt > 16) continue;
    const amp = h.amp ?? 14;
    const decay = Math.exp(-dt / 4);
    x += amp * decay * Math.sin(dt * 2.7 + h.f);
    y += amp * 0.6 * decay * Math.cos(dt * 3.1 + h.f);
    rot += (amp / 14) * 0.6 * decay * Math.sin(dt * 2);
    s += (amp / 14) * 0.03 * decay;
    if (h.glitch !== false) glitch = Math.max(glitch, decay * (amp / 14));
    if (h.flash) flash = Math.max(flash, Math.exp(-dt / 2.2) * 0.8);
  }
  return {s, x, y, rot, glitch, flash};
};

export const CameraSounds: React.FC<{hits?: Hit[]}> = ({hits}) => (
  <>
    {(hits ?? [])
      .filter((h) => h.sound !== false)
      .map((h, i) => (
        <Sfx key={i} name="impact" at={h.f} volume={Math.min(0.6, 0.3 * ((h.amp ?? 14) / 14))} />
      ))}
  </>
);

export const Flash: React.FC<{amount: number}> = ({amount}) =>
  amount > 0.02 ? <AbsoluteFill style={{background: '#fff', opacity: amount, mixBlendMode: 'screen', pointerEvents: 'none'}} /> : null;

// ---------------------------------------------------------------------------------------------
// Latar yang bergerak: pita teks, partikel, penanda sudut, kode waktu, nomor bab raksasa

const BAND = 'XP LANE KEBAL  •  SEASON 42  •  MOBILE LEGENDS  •  PATCH 2.2.16  •  ';

export const MotionBackdrop: React.FC<{index: number}> = ({index}) => {
  const {global, pulse} = useBeat();
  const t = global / 30;
  const stroke = (a: number) => `2.5px rgba(15,16,20,${a})`;
  const band = BAND.repeat(6);
  const dots = useMemo(
    () =>
      Array.from({length: 22}, (_, i) => ({
        x: (i * 337) % 1920,
        y: (i * 211) % 1180,
        speed: 14 + ((i * 7) % 5) * 9,
        size: 10 + ((i * 13) % 4) * 7,
        kind: i % 3,
        rot: (i * 47) % 90,
      })),
    [],
  );
  const mm = Math.floor(global / 1800);
  const ss = Math.floor((global % 1800) / 30);
  const ff = global % 30;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* nomor bab raksasa */}
      <div
        style={{
          position: 'absolute',
          right: -30,
          top: 250 + 14 * Math.sin(t * 0.7),
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: 760,
          lineHeight: 1,
          letterSpacing: -30,
          color: 'transparent',
          WebkitTextStroke: stroke(0.075),
          transform: `scale(${1 + 0.012 * pulse})`,
          transformOrigin: '70% 50%',
        }}
      >
        {String(index).padStart(2, '0')}
      </div>
      {/* dua pita teks miring yang berjalan berlawanan arah */}
      <div style={{position: 'absolute', left: 0, top: 560, width: 2200, transform: 'rotate(-6deg)', transformOrigin: 'left center'}}>
        <div style={{whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 900, fontSize: 168, letterSpacing: -5, color: 'transparent', WebkitTextStroke: stroke(0.08), transform: `translateX(${-t * 90 - 200}px)`}}>
          {band}
        </div>
      </div>
      <div style={{position: 'absolute', right: 0, top: 200, width: 2200, transform: 'rotate(5deg)', transformOrigin: 'right center'}}>
        <div style={{whiteSpace: 'nowrap', textAlign: 'right', fontFamily: F.sans, fontWeight: 900, fontSize: 120, letterSpacing: -4, color: 'transparent', WebkitTextStroke: stroke(0.06), transform: `translateX(${t * 70 + 200}px)`}}>
          {band}
        </div>
      </div>
      {/* partikel */}
      {dots.map((d, i) => {
        const y = (((d.y - t * d.speed) % 1180) + 1180) % 1180 - 50;
        const o = 0.16 + 0.08 * Math.sin(t * 1.3 + i);
        const common = {position: 'absolute' as const, left: d.x + 20 * Math.sin(t * 0.5 + i), top: y, opacity: o};
        if (d.kind === 0)
          return (
            <div key={i} style={{...common, width: d.size, height: d.size, transform: `rotate(${d.rot + t * 20}deg)`}}>
              <div style={{position: 'absolute', left: '45%', top: 0, width: '10%', height: '100%', background: C.ink}} />
              <div style={{position: 'absolute', top: '45%', left: 0, height: '10%', width: '100%', background: C.ink}} />
            </div>
          );
        if (d.kind === 1) return <div key={i} style={{...common, width: d.size * 0.7, height: d.size * 0.7, borderRadius: '50%', border: `2px solid ${C.ink}`}} />;
        return <div key={i} style={{...common, width: d.size * 0.6, height: d.size * 0.6, background: i % 2 ? C.accent : C.ink, transform: `rotate(${45 + t * 30}deg)`, opacity: o * 0.8}} />;
      })}
      {/* penanda sudut ala jendela desain */}
      {[
        [34, 34, 1, 1],
        [1886, 34, -1, 1],
        [34, 1046, 1, -1],
        [1886, 1046, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <svg key={i} width={40} height={40} style={{position: 'absolute', left: x - (sx < 0 ? 40 : 0), top: y - (sy < 0 ? 40 : 0), overflow: 'visible', opacity: 0.55}}>
          <path d={`M ${sx < 0 ? 40 : 0} ${sy < 0 ? 40 : 0} L ${sx < 0 ? 40 - 28 : 28} ${sy < 0 ? 40 : 0} M ${sx < 0 ? 40 : 0} ${sy < 0 ? 40 : 0} L ${sx < 0 ? 40 : 0} ${sy < 0 ? 40 - 28 : 28}`} stroke={C.ink} strokeWidth={3} fill="none" />
        </svg>
      ))}
      {/* kode waktu */}
      <div style={{position: 'absolute', left: 120, top: 62, fontFamily: F.mono, fontSize: 19, color: C.muted, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 10}}>
        <span style={{display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: C.coral, opacity: Math.floor(t * 2) % 2 ? 0.25 : 1}} />
        REC {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}:{String(ff).padStart(2, '0')}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Subtitle bergaya TikTok: per kata, kata yang sedang diucapkan menyala

const EMPHASIS = new Set(
  ['level', 'freeze', 'last', 'hit', 'ban', 'win', 'rate', 'gold', 'push', 'counter', 'draft', 'pick', 'solo', 'farming', 'rotasi', 'meta', 'wajib', 'bohong', 'mundur', 'overextend', 'minimap', 'persen', 'revamp', 'almarhum', 'transparan', 'mangkrak', 'audit', 'share', 'menderita', 'xp', 'hp', 'mlbb', 'cannon', 'exp', 'tank', 'lord', 'turtle', 'wisp'],
);

type CWord = {w: string; s: number; e: number; text: string; emph: boolean};

const buildChunks = (vo: string) => {
  const words = wordsOf(vo);
  const chunks: CWord[][] = [];
  let cur: CWord[] = [];
  let sentenceStart = true;
  words.forEach((w) => {
    const bare = w.w.replace(/[^\p{L}\p{N}+]/gu, '');
    const text = w.w.replace(/[.,:;]+$/g, '').replace(/^["']|["']$/g, '').toUpperCase();
    const emph = !!bare && (EMPHASIS.has(bare.toLowerCase()) || /\d/.test(bare) || (/^[A-Z]/.test(bare) && !sentenceStart) || (bare.length > 1 && bare === bare.toUpperCase() && /[A-Z]/.test(bare)));
    const prev = cur[cur.length - 1];
    const len = cur.reduce((n, x) => n + x.text.length + 1, 0);
    if (
      prev &&
      (cur.length >= 4 || len + text.length > 26 || /[.?!:]$/.test(prev.w) || (/[,;]$/.test(prev.w) && cur.length >= 2) || w.s - prev.e > 0.4)
    ) {
      chunks.push(cur);
      cur = [];
    }
    cur.push({...w, text, emph});
    sentenceStart = /[.?!]$/.test(w.w);
  });
  if (cur.length) chunks.push(cur);
  return chunks;
};

const CaptionWord: React.FC<{w: CWord; frame: number; active: boolean; idx: number}> = ({w, frame, active, idx}) => {
  const {fps} = useVideoConfig();
  const start = Math.round((LEAD + w.s) * fps) - 1;
  const shown = frame >= start;
  const p = shown ? spring({frame: frame - start, fps, config: {damping: 11, stiffness: 300, mass: 0.45}}) : 0;
  const color = active ? '#FFE14A' : w.emph ? '#FF8A3D' : '#FFFFFF';
  return (
    <span
      style={{
        display: 'inline-block',
        opacity: shown ? Math.min(1, p * 4) : 0,
        transform: `translateY(${(1 - p) * 26}px) scale(${(0.55 + 0.45 * p) * (active ? 1.06 : 1)}) rotate(${active ? (idx % 2 ? 2.2 : -2.2) : 0}deg)`,
        color,
        WebkitTextStroke: '13px #0B0B0E',
        paintOrder: 'stroke fill',
        textShadow: active ? FRINGE : undefined,
        margin: '0 0.27em',
      }}
    >
      {w.text}
    </span>
  );
};

export const Captions: React.FC<{vo: string}> = ({vo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chunks = useMemo(() => buildChunks(vo), [vo]);
  const t = frame / fps - LEAD;
  let shown = -1;
  for (let i = 0; i < chunks.length; i++) {
    const from = chunks[i][0].s - 0.05;
    const until = i + 1 < chunks.length ? chunks[i + 1][0].s - 0.05 : chunks[i][chunks[i].length - 1].e + 0.35;
    if (t >= from && t < until) shown = i;
  }
  if (shown < 0) return null;
  const chunk = chunks[shown];
  const first = Math.round((LEAD + chunk[0].s) * fps) - 2;
  const enter = spring({frame: frame - first, fps, config: {damping: 14, stiffness: 240, mass: 0.5}});
  let active = 0;
  chunk.forEach((w, i) => {
    if (t >= w.s - 0.04) active = i;
  });
  const ended = t > chunk[chunk.length - 1].e + 0.12;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', justifyContent: 'flex-end', alignItems: 'center'}}>
      <div
        style={{
          marginBottom: 34,
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: 74,
          lineHeight: 1,
          letterSpacing: -1.5,
          whiteSpace: 'nowrap',
          transform: `translateY(${(1 - enter) * 24}px) scale(${0.9 + 0.1 * enter})`,
          opacity: Math.min(1, enter * 3),
          filter: 'drop-shadow(0 7px 0 rgba(11,11,14,0.28))',
        }}
      >
        {chunk.map((w, i) => (
          <CaptionWord key={`${shown}-${i}`} w={w} frame={frame} active={!ended && i === active} idx={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
// Kata raksasa untuk punchline, plus coretan tangan (lingkaran dan panah)

export const BigWord: React.FC<{text: string; start: number; dur?: number; color?: string; rotate?: number; size?: number; top?: number; sub?: string}> = ({
  text,
  start,
  dur = 30,
  color = C.accent,
  rotate = -3,
  size = 300,
  top = 330,
  sub,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < start - 1 || frame > start + dur + 2) return null;
  const p = spring({frame: frame - start, fps, config: {damping: 9, stiffness: 230, mass: 0.6}});
  const out = interpolate(frame, [start + dur - 8, start + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rays = 14;
  const grow = interpolate(frame, [start, start + 12], [0.3, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{pointerEvents: 'none', alignItems: 'center'}}>
      <Sfx name="stamp" at={start} volume={0.4} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: (1 - out) * 0.9}}>
        {Array.from({length: rays}, (_, i) => {
          const a = (i / rays) * Math.PI * 2 + 0.2;
          const r0 = 260 * grow;
          const r1 = (520 + 420 * grow) * (0.7 + 0.3 * ((i * 5) % 3) / 2);
          return <line key={i} x1={960 + Math.cos(a) * r0} y1={top + size * 0.5 + Math.sin(a) * r0 * 0.6} x2={960 + Math.cos(a) * r1} y2={top + size * 0.5 + Math.sin(a) * r1 * 0.6} stroke={i % 2 ? C.ink : color} strokeWidth={5} strokeLinecap="round" opacity={0.55} />;
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          top,
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.05,
          whiteSpace: 'nowrap',
          color,
          WebkitTextStroke: `${size * 0.09}px #0B0B0E`,
          paintOrder: 'stroke fill',
          transform: `scale(${(1.9 - 0.9 * p) * (1 - 0.15 * out)}) rotate(${rotate}deg)`,
          opacity: (1 - out) * Math.min(1, p * 4),
          filter: `blur(${(1 - p) * 10}px) drop-shadow(${size * 0.04}px ${size * 0.04}px 0 rgba(11,11,14,0.35))`,
          textShadow: FRINGE,
        }}
      >
        {text}
      </div>
      {sub ? (
        <div style={{position: 'absolute', top: top + size * 1.08, fontFamily: F.sans, fontWeight: 900, fontSize: size * 0.17, letterSpacing: 4, color: C.ink, opacity: (1 - out) * Math.min(1, p * 3), transform: `translateY(${(1 - p) * 20}px)`}}>
          {sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Lingkaran coretan tangan yang tidak rapi. Mengembalikan path SVG. */
export const scribbleCircle = (cx: number, cy: number, rx: number, ry: number) => {
  let d = '';
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2.25 - 0.4;
    const wob = 1 + 0.045 * Math.sin(a * 3 + 1) + 0.03 * Math.sin(a * 5) + (i / n) * 0.07;
    const x = cx + Math.cos(a) * rx * wob;
    const y = cy + Math.sin(a) * ry * wob;
    d += `${i ? ' L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

/** Garis bawah zig-zag ala spidol. */
export const scribbleUnderline = (x0: number, x1: number, y: number) => {
  let d = `M ${x0} ${y}`;
  const n = 7;
  for (let i = 1; i <= n; i++) d += ` L ${x0 + ((x1 - x0) * i) / n} ${y + (i % 2 ? 9 : -5)}`;
  return d;
};

export const arrowPath = (x0: number, y0: number, x1: number, y1: number, bend = 0.25) => {
  const mx = (x0 + x1) / 2 + (y1 - y0) * bend;
  const my = (y0 + y1) / 2 - (x1 - x0) * bend;
  return `M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`;
};

/** Menggambar sebuah path dengan gaya spidol. Kepala panah muncul di akhir kalau `head` diberi sudut. */
export const Doodle: React.FC<{d: string; start: number; dur?: number; color?: string; width?: number; head?: {x: number; y: number; angle: number}}> = ({
  d,
  start,
  dur = 22,
  color = C.accent,
  width = 9,
  head,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (p <= 0.001) return null;
  const ev = evolvePath(p, d);
  const a = ((head?.angle ?? 0) * Math.PI) / 180;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible'}}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
      {head && p > 0.92 ? (
        <path
          d={`M ${head.x - Math.cos(a - 0.5) * 34} ${head.y - Math.sin(a - 0.5) * 34} L ${head.x} ${head.y} L ${head.x - Math.cos(a + 0.5) * 34} ${head.y - Math.sin(a + 0.5) * 34}`}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
};

/** Garis radial yang meledak keluar dari pusat elemen induk, dipakai di stiker. */
export const BurstLines: React.FC<{start: number; color?: string; size?: number}> = ({start, color = C.ink, size = 520}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  if (p <= 0 || p >= 1) return null;
  const n = 12;
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{position: 'absolute', left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2, overflow: 'visible', pointerEvents: 'none', opacity: 1 - p}}>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.15;
        const r0 = 90 + 120 * p;
        const r1 = r0 + 60 * (1 - p) + 20;
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0 * 0.7} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1 * 0.7} stroke={color} strokeWidth={5} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** Kunci kamera yang mendekat ke titik (px, py) di layar 1920 x 1080. `pull` = seberapa jauh titik itu ditarik ke tengah. */
export const focus = (f: number, px: number, py: number, s = 1.08, pull = 0.5): CamKey => {
  const z = Math.min(s, 1.07);
  const k = (z - 1) * (1 + pull * 0.5); // zoom mendekati titik itu, sedikit ditarik ke tengah, margin 120 px tidak terpotong
  return {f, s: z, x: -(px - 960) * k, y: -(py - 540) * k};
};
export const unfocus = (f: number): CamKey => ({f, s: 1, x: 0, y: 0});

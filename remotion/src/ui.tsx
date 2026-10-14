import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {LEAD} from './cue';
import {C, F, FRINGE} from './theme';

type Mode = 'smooth' | 'pop';

/** 0 sampai 1 mulai dari frame `start`. "pop" sedikit melewati 1 supaya terasa memantul. */
export const useEnter = (start: number, mode: Mode = 'smooth') => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({
    frame: frame - start,
    fps,
    config: mode === 'pop' ? {damping: 11, stiffness: 190, mass: 0.7} : {damping: 200, stiffness: 120},
  });
};

/** Kartu putih di atas latar krem. */
export const paper: React.CSSProperties = {
  background: C.paper,
  border: '1.5px solid rgba(15,16,20,0.07)',
  borderRadius: 36,
  boxShadow: '0 28px 70px rgba(30,28,20,0.13), 0 2px 0 rgba(255,255,255,0.9) inset',
};

/** Panel gelap untuk grafik: di sinilah garis saber menyala paling jelas. */
export const night: React.CSSProperties = {
  background: `linear-gradient(165deg, #1B1D28 0%, ${C.night} 70%)`,
  border: '1.5px solid rgba(255,255,255,0.08)',
  borderRadius: 36,
  boxShadow: '0 34px 80px rgba(10,10,20,0.35), 0 1px 0 rgba(255,255,255,0.1) inset',
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export type BlobMode = 'none' | 'corner' | 'bold';

/** Bentuk hitam organik (bintang berujung bulat) dengan tepi RGB-split, seperti di video referensi. */
export const Asterisk: React.FC<{x: number; y: number; scale: number; rot: number}> = ({x, y, scale, rot}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 0,
      height: 0,
      transform: `scale(${scale}) rotate(${rot}deg)`,
      filter: 'blur(1.6px) drop-shadow(-7px 0 0 rgba(47,107,255,0.35)) drop-shadow(7px 0 0 rgba(255,106,30,0.38))',
    }}
  >
    {[0, 45, 90, 135].map((a) => (
      <div key={a} style={{position: 'absolute', left: -85, top: -300, width: 170, height: 600, borderRadius: 85, background: '#0B0B0E', transform: `rotate(${a}deg)`}} />
    ))}
  </div>
);

/** Latar putih tulang: titik halus, bentuk hitam di sudut, dan grain tipis. */
export const Backdrop: React.FC<{blobs?: BlobMode}> = ({blobs = 'corner'}) => {
  const t = useCurrentFrame() / 30;
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, #F8F7F3 0%, ${C.bg2} 100%)`}}>
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(15,16,20,0.22) 1.3px, transparent 1.6px)',
          backgroundSize: '60px 60px',
          backgroundPosition: `${(t * 10) % 60}px 30px`,
          opacity: 0.32,
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 85%)',
        }}
      />
      {blobs === 'corner' ? (
        <>
          <Asterisk x={1990 + 14 * Math.sin(t * 0.6)} y={1160} scale={0.66} rot={t * 7} />
          <Asterisk x={-70} y={-100} scale={0.42} rot={-t * 6} />
        </>
      ) : null}
      {blobs === 'bold' ? (
        <>
          <Asterisk x={2045 + 12 * Math.sin(t * 0.5)} y={10} scale={0.74} rot={t * 6} />
          <Asterisk x={-10} y={1070 + 12 * Math.cos(t * 0.5)} scale={0.8} rot={-t * 5} />
        </>
      ) : null}
      <AbsoluteFill style={{backgroundImage: GRAIN, opacity: 0.05}} />
    </AbsoluteFill>
  );
};

const Word: React.FC<{word: string; start: number; color: string; gradient?: string}> = ({word, start, color, gradient}) => {
  const p = useEnter(start);
  return (
    <span style={{display: 'inline-block', overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em'}}>
      <span
        style={{
          display: 'inline-block',
          transform: `translateY(${(1 - p) * 115}%)`,
          opacity: Math.min(1, p * 3),
          color: gradient ? 'transparent' : color,
          background: gradient,
          WebkitBackgroundClip: gradient ? 'text' : undefined,
        }}
      >
        {word}
      </span>
    </span>
  );
};

/** Teks yang naik dari balik garis, kata demi kata. */
export const RiseText: React.FC<{
  text: string;
  start: number;
  size: number;
  weight?: number;
  color?: string;
  gradient?: string;
  stagger?: number;
  fringe?: boolean;
}> = ({text, start, size, weight = 900, color = C.ink, gradient, stagger = 4, fringe}) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: `0 ${size * 0.26}px`,
      fontFamily: F.sans,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.05,
      letterSpacing: -size * 0.045,
      textShadow: fringe ? FRINGE : undefined,
    }}
  >
    {text.split(' ').map((w, i) => (
      <Word key={i} word={w} start={start + i * stagger} color={color} gradient={gradient} />
    ))}
  </div>
);

export const Chip: React.FC<{
  text: string;
  start: number;
  bg: string;
  fg?: string;
  size?: number;
  mode?: Mode;
  style?: React.CSSProperties;
}> = ({text, start, bg, fg = '#FFFFFF', size = 28, mode = 'pop', style}) => {
  const p = useEnter(start, mode);
  return (
    <div
      style={{
        display: 'inline-block',
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: size * 0.04,
        boxShadow: `0 10px 28px ${bg}44`,
        transform: `scale(${0.55 + 0.45 * p})`,
        opacity: Math.min(1, p * 3),
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Potret hero berbingkai gradien. Ikon asli 128 px, jadi dipakai paling besar sekitar 128 px. */
export const Portrait: React.FC<{hero: string; size: number; ring: string}> = ({hero, size, ring}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      padding: 5,
      background: `conic-gradient(from 200deg, ${ring}, rgba(255,255,255,0.9), ${ring})`,
      boxShadow: `0 12px 30px ${ring}55`,
      boxSizing: 'border-box',
    }}
  >
    <Img src={staticFile(`heroes/${hero}.png`)} style={{width: '100%', height: '100%', borderRadius: '50%', display: 'block'}} />
  </div>
);

/** Definisi filter untuk garis saber. Taruh sekali di dalam <svg>. */
export const SaberDefs: React.FC = () => (
  <defs>
    <filter id="saberGlowWide" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <filter id="saberGlowNear" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
  </defs>
);

/**
 * Garis ala light saber: halo lebar, halo dekat, inti berwarna, inti putih tipis, dan kepala terang
 * yang bergerak di ujung garis. `progress` 0 sampai 1 menentukan seberapa panjang garis tergambar.
 */
export const Saber: React.FC<{
  d: string;
  progress: number;
  color: string;
  width?: number;
  head?: boolean;
}> = ({d, progress, color, width = 6, head = true}) => {
  if (progress <= 0.002) return null;
  const evolved = evolvePath(progress, d);
  const common = {
    d,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: evolved.strokeDasharray,
    strokeDashoffset: evolved.strokeDashoffset,
  };
  const point = getPointAtLength(d, getLength(d) * progress);
  const alive = progress < 0.995 && point !== null;
  return (
    <>
      <path {...common} stroke={color} strokeWidth={width * 3.4} opacity={0.5} filter="url(#saberGlowWide)" />
      <path {...common} stroke={color} strokeWidth={width * 1.9} opacity={0.85} filter="url(#saberGlowNear)" />
      <path {...common} stroke={color} strokeWidth={width} />
      <path {...common} stroke="#FFFFFF" strokeWidth={width * 0.38} opacity={0.95} />
      {head && alive && point ? (
        <>
          <circle cx={point.x} cy={point.y} r={width * 2.6} fill={color} opacity={0.55} filter="url(#saberGlowNear)" />
          <circle cx={point.x} cy={point.y} r={width * 0.9} fill="#FFFFFF" />
        </>
      ) : null}
    </>
  );
};

/** Progres scene di bagian atas layar, plus penanda scene. */
export const Hud: React.FC<{index: number; total: number; label: string; durationInFrames: number}> = ({
  index,
  total,
  label,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <>
      <div style={{position: 'absolute', left: 120, right: 120, top: 49, height: 6, borderRadius: 3, background: C.line}}>
        <div style={{width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: C.violet, boxShadow: `0 0 12px ${C.violet}88`}} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 70,
          fontFamily: F.mono,
          fontSize: 22,
          color: C.muted,
          letterSpacing: 1.5,
        }}
      >
        {String(index).padStart(2, '0')} / {total} {label.toUpperCase()}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------------------------
// Komponen bersama untuk semua scene


export type SceneProps = {vo: string; a: number; audio?: string; dur?: number};

/** Latar, progres scene, dan audio VO (mulai setelah LEAD detik). */
export const Shell: React.FC<{index: number; label: string; audio?: string; dur?: number; blobs?: BlobMode; children: React.ReactNode}> = ({
  index,
  label,
  audio,
  dur,
  blobs,
  children,
}) => {
  const {fps, durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop blobs={blobs} />
      {audio ? (
        <Sequence from={Math.round(LEAD * fps)}>
          <Audio src={staticFile(audio)} />
        </Sequence>
      ) : null}
      <Hud index={index} total={10} label={label} durationInFrames={dur ?? durationInFrames} />
      {children}
    </AbsoluteFill>
  );
};

/** Garis bergelombang: poin (x, y) disampel tiap 8 px supaya halus. `phase` menggeser gelombang. */
export const wavePath = (x0: number, x1: number, y: number, amp: number, wavelength: number, phase: number) => {
  let d = `M ${x0} ${y + amp * Math.sin(phase)}`;
  for (let x = x0 + 8; x <= x1; x += 8) d += ` L ${x} ${y + amp * Math.sin(((x - x0) / wavelength) * 2 * Math.PI + phase)}`;
  return d;
};

/** Judul scene: naik per kata, dengan garis saber bergelombang di bawahnya. */
export const Title: React.FC<{text: string; color?: string}> = ({text, color = C.accent}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [8, 44], [0, 1], {extrapolateRight: 'clamp', extrapolateLeft: 'clamp'});
  return (
    <>
      <div style={{position: 'absolute', left: 120, top: 100}}>
        <RiseText text={text} start={4} size={102} fringe />
      </div>
      <svg width={900} height={70} style={{position: 'absolute', left: 110, top: 212, overflow: 'visible'}}>
        <SaberDefs />
        <Saber d={wavePath(10, 660, 36, 7, 150, frame / 9)} progress={p} color={color} width={5} />
      </svg>
    </>
  );
};

/** Stiker miring yang muncul dengan pantulan. */
export const Sticker: React.FC<{
  text: string;
  start: number;
  bg: string;
  fg?: string;
  rotate?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({text, start, bg, fg = C.ink, rotate = -4, size = 34, style}) => {
  const p = useEnter(start, 'pop');
  return (
    <div
      style={{
        position: 'absolute',
        transform: `rotate(${rotate}deg) scale(${0.5 + 0.5 * p})`,
        opacity: Math.min(1, p * 3),
        background: bg,
        color: fg,
        fontFamily: F.sans,
        fontWeight: 900,
        fontSize: size,
        padding: `${size * 0.4}px ${size * 0.85}px`,
        borderRadius: size * 0.55,
        boxShadow: `0 14px 40px ${bg}66`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** Peta Sanctum Island di dalam panel gelap. Anak (SVG) memakai koordinat peta 512 x 512. */
export const MapPanel: React.FC<{
  left: number;
  top: number;
  size: number;
  enter: number;
  children?: React.ReactNode;
}> = ({left, top, size, enter, children}) => {
  const pad = 22;
  return (
    <div
      style={{
        ...night,
        position: 'absolute',
        left,
        top,
        width: size + pad * 2,
        height: size + pad * 2,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 60}px)`,
      }}
    >
      <div style={{position: 'absolute', left: pad, top: pad, width: size, height: size, borderRadius: 26, overflow: 'hidden'}}>
        <Img src={staticFile('map/sanctum_island.png')} style={{width: '100%', height: '100%', display: 'block'}} />
        <div style={{position: 'absolute', inset: 0, background: 'rgba(8,10,34,0.35)'}} />
        <svg viewBox="0 0 512 512" width={size} height={size} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <SaberDefs />
          {children}
        </svg>
      </div>
    </div>
  );
};

/** Naik dari 0 ke 1 di antara dua frame, dengan easing (default: keluar halus). */
export const ramp = (frame: number, from: number, to: number, easing: (t: number) => number = Easing.out(Easing.cubic)) =>
  interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** Garis coret ala saber di atas sebuah elemen (dipakai untuk "ilang" dan "dicoret"). */
export const Strike: React.FC<{left: number; top: number; width: number; progress: number; color?: string}> = ({
  left,
  top,
  width,
  progress,
  color = C.coral,
}) => (
  <svg width={width + 40} height={40} style={{position: 'absolute', left: left - 20, top: top - 20, overflow: 'visible'}}>
    <SaberDefs />
    <Saber d={`M 20 20 L ${width + 20} 20`} progress={progress} color={color} width={4} />
  </svg>
);

/** Kotak seleksi ala aplikasi desain: garis putus-putus dengan empat titik pegangan. */
export const Select: React.FC<{left: number; top: number; width: number; height: number; start: number; color?: string}> = ({
  left,
  top,
  width,
  height,
  start,
  color = C.ink,
}) => {
  const p = useEnter(start);
  const h = 12;
  return (
    <div style={{position: 'absolute', left, top, width, height, opacity: Math.min(1, p * 3), transform: `scale(${0.92 + 0.08 * p})`, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, border: `2.5px dashed ${color}`, borderRadius: 4}} />
      {[
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
      ].map(([x, y], i) => (
        <div key={i} style={{position: 'absolute', left: x - h / 2, top: y - h / 2, width: h, height: h, background: '#fff', border: `2.5px solid ${color}`}} />
      ))}
    </div>
  );
};

/** Kursor panah yang meluncur ke target lalu "klik" dengan riak. */
export const Cursor: React.FC<{from: [number, number]; to: [number, number]; start: number; dur?: number}> = ({from, to, start, dur = 22}) => {
  const frame = useCurrentFrame();
  const t = ramp(frame, start, start + dur, Easing.inOut(Easing.cubic));
  if (frame < start - 1 || frame > start + dur + 40) return null;
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 50;
  const click = ramp(frame, start + dur, start + dur + 12);
  const fade = 1 - ramp(frame, start + dur + 18, start + dur + 36);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: fade}}>
      {click > 0 && click < 1 ? <circle cx={to[0]} cy={to[1]} r={10 + 40 * click} fill="none" stroke={C.accent} strokeWidth={4} opacity={1 - click} /> : null}
      <g transform={`translate(${x} ${y}) scale(${click > 0 && click < 0.5 ? 0.88 : 1})`}>
        <path d="M 0 0 L 0 34 L 9 26 L 15 40 L 21 37 L 15 24 L 27 24 Z" fill={C.ink} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

/** Pembungkus kotak seleksi: kotaknya mengikuti ukuran isi, jadi tidak perlu mengukur teks. */
export const Marquee: React.FC<{start: number; color?: string; pad?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  start,
  color = C.ink,
  pad = 18,
  children,
  style,
}) => {
  const p = useEnter(start);
  const h = 13;
  return (
    <div style={{position: 'relative', display: 'inline-block', ...style}}>
      {children}
      <div
        style={{
          position: 'absolute',
          left: -pad,
          right: -pad,
          top: -pad,
          bottom: -pad,
          opacity: Math.min(1, p * 3),
          transform: `scale(${0.94 + 0.06 * p})`,
          pointerEvents: 'none',
        }}
      >
        <div style={{position: 'absolute', inset: 0, border: `2.5px dashed ${color}`}} />
        {[
          [0, 0],
          [100, 0],
          [0, 100],
          [100, 100],
        ].map(([x, y], i) => (
          <div key={i} style={{position: 'absolute', left: `${x}%`, top: `${y}%`, marginLeft: -h / 2, marginTop: -h / 2, width: h, height: h, background: '#fff', border: `2.5px solid ${color}`}} />
        ))}
      </div>
    </div>
  );
};

/** Kartu melayang miring 3D: bergoyang pelan supaya terasa hidup. */
export const Float: React.FC<{phase?: number; tilt?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({phase = 0, tilt = -9, children, style}) => {
  const t = useCurrentFrame() / 30 + phase;
  return (
    <div
      style={{
        transform: `perspective(1800px) rotateY(${tilt + 2.2 * Math.sin(t * 0.9)}deg) rotateX(${2 * Math.cos(t * 0.7)}deg) translateY(${6 * Math.sin(t * 1.1)}px)`,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Menara sederhana untuk peta dan diagram lane. */
export const Tower: React.FC<{x: number; y: number; s: number; color: string}> = ({x, y, s, color}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <polygon points="-22,-4 22,-4 0,-34" fill={color} />
    <rect x={-15} y={-4} width={30} height={34} rx={4} fill={color} />
    <rect x={-6} y={10} width={12} height={20} rx={3} fill="rgba(8,10,34,0.65)" />
  </g>
);

/** Centang yang tergambar sebagai garis saber kecil. */
export const Check: React.FC<{progress: number; color: string; size?: number}> = ({progress, color, size = 64}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{overflow: 'visible'}}>
    <SaberDefs />
    <Saber d="M 10 34 L 26 50 L 54 14" progress={progress} color={color} width={6} head={false} />
  </svg>
);

/** Garis saber yang mencoret isi di dalamnya, panjangnya mengikuti lebar isi. */
export const Slash: React.FC<{progress: number; color?: string; top?: string; children: React.ReactNode}> = ({progress, color = C.coral, top = '54%', children}) => (
  <div style={{position: 'relative', display: 'inline-block'}}>
    {children}
    <svg viewBox="0 0 1000 40" preserveAspectRatio="none" style={{position: 'absolute', left: -16, width: 'calc(100% + 32px)', top, height: 40, marginTop: -20, overflow: 'visible', pointerEvents: 'none'}}>
      <SaberDefs />
      <Saber d="M 0 20 L 1000 20" progress={progress} color={color} width={5} head={false} />
    </svg>
  </div>
);

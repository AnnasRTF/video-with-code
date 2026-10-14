import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

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

export const glass: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(36,48,104,0.86), rgba(15,21,50,0.9))',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 36,
  boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)',
};

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Latar: gradien gelap, dua cahaya yang melayang, titik-titik halus, vinyet, dan grain. */
export const Backdrop: React.FC = () => {
  const t = useCurrentFrame() / 30;
  const orb = (x: number, y: number, r: number, color: string, alpha: string) => (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}${alpha} 0%, transparent 65%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navy2} 100%)`}}>
      {orb(1500 + 220 * Math.cos(t * 0.5), 300 + 120 * Math.sin(t * 0.7), 700, C.violet, '55')}
      {orb(300 + 180 * Math.sin(t * 0.4), 950 + 90 * Math.cos(t * 0.6), 650, C.teal, '33')}
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.4px, transparent 1.7px)',
          backgroundSize: '60px 60px',
          backgroundPosition: `${(t * 14) % 60}px 30px`,
          opacity: 0.5,
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 85%)',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
      <AbsoluteFill style={{backgroundImage: GRAIN, opacity: 0.07, mixBlendMode: 'overlay'}} />
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
}> = ({text, start, size, weight = 900, color = C.white, gradient, stagger = 4}) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: `0 ${size * 0.26}px`,
      fontFamily: F.sans,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.05,
      letterSpacing: -size * 0.02,
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
}> = ({text, start, bg, fg = C.navy, size = 28, mode = 'pop', style}) => {
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
        boxShadow: `0 10px 34px ${bg}55`,
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

/** Potret hero berbingkai gradien dengan cahaya. Ikon asli 128 px, jadi dipakai paling besar sekitar 128 px. */
export const Portrait: React.FC<{hero: string; size: number; ring: string}> = ({hero, size, ring}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      padding: 5,
      background: `conic-gradient(from 200deg, ${ring}, rgba(255,255,255,0.35), ${ring})`,
      boxShadow: `0 0 46px ${ring}66`,
      boxSizing: 'border-box',
    }}
  >
    <Img src={staticFile(`heroes/${hero}.png`)} style={{width: '100%', height: '100%', borderRadius: '50%', display: 'block'}} />
  </div>
);

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
      <div style={{position: 'absolute', left: 120, right: 120, top: 49, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)'}}>
        <div style={{width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: C.violet, boxShadow: `0 0 14px ${C.violet}`}} />
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

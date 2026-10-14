import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {C, F} from '../theme';
import {Backdrop, Chip, glass, Hud, Portrait, RiseText, useEnter} from '../ui';

export type SceneProps = {vo: string; a: number};

const ROWS = [
  {hero: 'aulus', name: 'AULUS', wr: 59.97, ban: 81, cue: 'Aulus sama Masha', delay: 0, ring: C.coral},
  {hero: 'masha', name: 'MASHA', wr: 59.96, ban: 75, cue: 'Aulus sama Masha', delay: 14, ring: C.violet},
  {hero: 'argus', name: 'ARGUS', wr: 55.88, ban: null, cue: 'Argus sama Gloo', delay: 0, ring: C.teal},
  {hero: 'gloo', name: 'GLOO', wr: 54.1, ban: null, cue: 'Argus sama Gloo', delay: 14, ring: C.yellow},
] as const;

const fmt = (v: number) => v.toFixed(2).replace('.', ',');

const Row: React.FC<{i: number; start: number; banStart: number} & (typeof ROWS)[number]> = ({i, start, banStart, ...row}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  const fill = interpolate(frame, [start + 6, start + 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const barW = ((row.wr - 40) / 30) * 380 * fill;
  return (
    <div
      style={{
        position: 'absolute',
        left: 28,
        right: 28,
        top: 30 + i * 132,
        height: 118,
        opacity: Math.min(1, p * 2.5),
        transform: `translateX(${(1 - p) * 90}px)`,
      }}
    >
      <div style={{position: 'absolute', left: 0, top: 22, fontFamily: F.sans, fontWeight: 900, fontSize: 54, color: 'rgba(150,163,208,0.45)'}}>
        {i + 1}
      </div>
      <div style={{position: 'absolute', left: 66, top: 4}}>
        <Portrait hero={row.hero} size={110} ring={row.ring} />
      </div>
      <div style={{position: 'absolute', left: 206, top: 6, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: C.white, letterSpacing: 1}}>{row.name}</span>
        <span style={{fontFamily: F.sans, fontWeight: 800, fontSize: 20, color: C.navy, background: C.teal, borderRadius: 8, padding: '3px 12px'}}>S</span>
        {row.ban !== null ? <Chip text={`BAN ${row.ban}%`} start={banStart + i * 8} bg={C.coral} size={18} /> : null}
      </div>
      <div style={{position: 'absolute', left: 206, top: 74, width: 380, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.1)'}}>
        <div
          style={{
            width: barW,
            height: '100%',
            borderRadius: 8,
            background: `linear-gradient(90deg, ${row.ring}, ${C.white})`,
            boxShadow: `0 0 22px ${row.ring}aa`,
          }}
        />
      </div>
      <div style={{position: 'absolute', right: 0, top: 16, fontFamily: F.sans, fontWeight: 900, fontSize: 56, color: C.white, letterSpacing: -1}}>
        {fmt(row.wr * fill)}
        <span style={{fontSize: 32, color: C.muted, marginLeft: 4}}>%</span>
      </div>
    </div>
  );
};

/** Scene 4: hero XP lane teratas menurut MLBB Hub (13 Okt 2026, semua rank). */
export const Hero: React.FC<SceneProps> = ({vo, a}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tData = cue('ini data');
  const tDua = cue('Dua hero XP lane');
  const tBan = cue('Masalahnya');
  const tPick = cue('Jadi kuasai satu');
  const tNote = cue('Catatan:');
  const tSurvey = cue('Kayak survei');

  const swap = useEnter(tBan - 4);
  const stat1 = interpolate(frame, [tDua, tDua + 45], [0, 59.97], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ghost = useEnter(tDua - 10);
  const note = useEnter(tNote);
  const survey = useEnter(tSurvey, 'pop');

  const big = (value: string, gradient: string, opacity: number, y: number) => (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 40,
        fontFamily: F.sans,
        fontWeight: 900,
        fontSize: 215,
        lineHeight: 1,
        letterSpacing: -7,
        opacity,
        transform: `translateY(${y}px)`,
        background: gradient,
        WebkitBackgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {value}
    </div>
  );

  return (
    <AbsoluteFill>
      <Backdrop />
      <Hud index={4} total={10} label="Hero XP lane" durationInFrames={durationInFrames} />

      {/* cincin dekoratif di balik angka */}
      <div style={{position: 'absolute', left: -260, top: 330, width: 900, height: 900, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', opacity: ghost}} />
      <div style={{position: 'absolute', left: -140, top: 450, width: 660, height: 660, borderRadius: '50%', border: '2px solid rgba(124,92,255,0.18)', opacity: ghost}} />

      <div style={{position: 'absolute', left: 120, top: 104}}>
        <RiseText text="Hero XP lane" start={4} size={98} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 250, display: 'flex', gap: 16}}>
        <Chip text="DATA: MLBB HUB" start={tData} bg={C.violet} fg={C.white} size={24} />
        <Chip text="13 OKTOBER 2026" start={tData + 8} bg={C.teal} size={24} />
        <Chip text="SEMUA RANK" start={tData + 16} bg={C.yellow} size={24} />
      </div>

      {/* angka besar: win rate, lalu ban rate */}
      <div style={{position: 'absolute', left: 120, top: 350, width: 800, height: 420}}>
        <div style={{opacity: 1 - swap, transform: `translateY(${-swap * 50}px)`}}>
          <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 26, color: C.muted, letterSpacing: 6}}>WIN RATE, SEMUA RANK</div>
        </div>
        <div style={{position: 'absolute', left: 0, top: 0, opacity: swap, transform: `translateY(${(1 - swap) * 50}px)`}}>
          <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 26, color: C.coral, letterSpacing: 6}}>DI-BAN, MYTHICAL GLORY+</div>
        </div>
        {big(`${fmt(stat1)}%`, `linear-gradient(95deg, ${C.yellow}, ${C.coral})`, 1 - swap, -swap * 70)}
        {big('81%', `linear-gradient(95deg, ${C.coral}, ${C.violet})`, swap, (1 - swap) * 70)}
        <div style={{position: 'absolute', left: 4, top: 300, fontFamily: F.sans, fontWeight: 800, fontSize: 38, color: C.white, opacity: 1 - swap}}>
          AULUS <span style={{color: C.muted, fontWeight: 600}}>dan</span> MASHA <span style={{color: C.muted, fontWeight: 600}}>hampir 60%</span>
        </div>
        <div style={{position: 'absolute', left: 4, top: 300, fontFamily: F.sans, fontWeight: 800, fontSize: 38, color: C.white, opacity: swap}}>
          AULUS <span style={{color: C.muted, fontWeight: 600}}>81%, Masha</span> 75%
        </div>
      </div>

      {/* papan peringkat */}
      <div style={{...glass, position: 'absolute', left: 960, top: 330, width: 840, height: 585}}>
        {ROWS.map((r, i) => (
          <Row key={r.hero} i={i} start={cue(r.cue) + r.delay} banStart={tBan} {...r} />
        ))}
        <div style={{position: 'absolute', right: 36, bottom: 14, fontFamily: F.sans, fontSize: 20, color: 'rgba(150,163,208,0.7)'}}>
          skala bar mulai dari 40%
        </div>
      </div>

      <div style={{position: 'absolute', left: 120, top: 935, display: 'flex', gap: 16}}>
        <Chip text="1 HERO UTAMA" start={tPick} bg={C.violet} fg={C.white} size={30} />
        <Chip text="+ 1 CADANGAN" start={tPick + 10} bg={C.teal} size={30} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 120,
          top: 950,
          fontFamily: F.sans,
          fontSize: 24,
          color: C.muted,
          opacity: note,
          transform: `translateY(${(1 - note) * 12}px)`,
        }}
      >
        Angka campuran semua lane, bukan khusus XP lane.
      </div>
      <div
        style={{
          position: 'absolute',
          right: 130,
          top: 176,
          transform: `rotate(-4deg) scale(${0.5 + 0.5 * survey})`,
          opacity: Math.min(1, survey * 3),
          background: C.yellow,
          color: C.navy,
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: 34,
          padding: '14px 30px',
          borderRadius: 18,
          boxShadow: '0 14px 40px rgba(255,209,102,0.35)',
        }}
      >
        BAGUS DI KERTAS
      </div>
    </AbsoluteFill>
  );
};

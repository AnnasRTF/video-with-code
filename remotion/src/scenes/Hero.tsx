import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {C, F} from '../theme';
import {Chip, Cursor, night, paper, Portrait, Saber, SaberDefs, SceneProps, Select, Shell, Title, useEnter} from '../ui';

const ROWS = [
  {hero: 'aulus', name: 'AULUS', wr: 59.97, cue: 'Aulus sama Masha', delay: 0, ring: C.coral},
  {hero: 'masha', name: 'MASHA', wr: 59.96, cue: 'Aulus sama Masha', delay: 14, ring: C.violet},
  {hero: 'argus', name: 'ARGUS', wr: 55.88, cue: 'Argus sama Gloo', delay: 0, ring: C.teal},
  {hero: 'gloo', name: 'GLOO', wr: 54.1, cue: 'Argus sama Gloo', delay: 14, ring: C.yellow},
] as const;

// Data MLBB Hub (13 Okt 2026): win rate semua rank dan Mythical Glory+ (MG+), ban rate MG+.
const LINES = [
  {hero: 'aulus', name: 'AULUS', a: 59.97, b: 61.42, ban: 81, color: C.nCoral},
  {hero: 'masha', name: 'MASHA', a: 59.96, b: 60.86, ban: 75, color: C.nViolet},
  {hero: 'argus', name: 'ARGUS', a: 55.88, b: 54.54, ban: null, color: C.nTeal},
] as const;

const fmt = (v: number) => v.toFixed(2).replace('.', ',');

const Row: React.FC<{i: number; start: number} & (typeof ROWS)[number]> = ({i, start, ...row}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  const fill = interpolate(frame, [start + 6, start + 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: 30,
        right: 30,
        top: 34 + i * 130,
        height: 116,
        opacity: Math.min(1, p * 2.5),
        transform: `translateX(${(1 - p) * 90}px)`,
      }}
    >
      <div style={{position: 'absolute', left: 0, top: 22, fontFamily: F.sans, fontWeight: 900, fontSize: 54, color: 'rgba(18,21,40,0.18)'}}>
        {i + 1}
      </div>
      <div style={{position: 'absolute', left: 66, top: 3}}>
        <Portrait hero={row.hero} size={110} ring={row.ring} />
      </div>
      <div style={{position: 'absolute', left: 206, top: 8, display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontFamily: F.sans, fontWeight: 800, fontSize: 40, color: C.ink, letterSpacing: 1}}>{row.name}</span>
        <span style={{fontFamily: F.sans, fontWeight: 800, fontSize: 20, color: '#fff', background: C.violet, borderRadius: 8, padding: '3px 12px'}}>S</span>
      </div>
      <div style={{position: 'absolute', left: 206, top: 72, width: 380, height: 16, borderRadius: 8, background: 'rgba(18,21,40,0.08)'}}>
        <div
          style={{
            width: ((row.wr - 40) / 30) * 380 * fill,
            height: '100%',
            borderRadius: 8,
            background: `linear-gradient(90deg, ${row.ring}, ${row.ring}cc)`,
            boxShadow: `0 4px 16px ${row.ring}66`,
          }}
        />
      </div>
      <div style={{position: 'absolute', right: 0, top: 16, fontFamily: F.sans, fontWeight: 900, fontSize: 56, color: C.ink, letterSpacing: -1}}>
        {fmt(row.wr * fill)}
        <span style={{fontSize: 30, color: C.muted, marginLeft: 4}}>%</span>
      </div>
    </div>
  );
};

// Grafik kemiringan (slope graph): win rate naik atau turun dari semua rank ke Mythical Glory+.
const GW = 840;
const GH = 600;
const X1 = 170;
const X2 = 480;
const Y0 = 150;
const Y1 = 490;
const V0 = 53.5;
const V1 = 62.5;
const yOf = (v: number) => Y0 + ((V1 - v) / (V1 - V0)) * (Y1 - Y0);

const Slope: React.FC<{start: number; banStart: number}> = ({start, banStart}) => {
  const frame = useCurrentFrame();
  const enter = useEnter(start);
  const ease = (from: number, to: number) =>
    interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const labelY = {aulus: 168, masha: 262, argus: yOf(54.54)} as const;
  return (
    <div style={{...night, position: 'absolute', left: 960, top: 330, width: GW, height: GH, opacity: enter, transform: `translateX(${(1 - enter) * 120}px)`}}>
      <svg width={GW} height={GH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <SaberDefs />
        {[54, 56, 58, 60, 62].map((v) => (
          <g key={v}>
            <line x1={64} x2={GW - 40} y1={yOf(v)} y2={yOf(v)} stroke="rgba(255,255,255,0.09)" strokeWidth={1.5} strokeDasharray="4 8" />
            <text x={46} y={yOf(v) + 6} textAnchor="end" fill="rgba(255,255,255,0.45)" fontFamily={F.sans} fontSize={18} fontWeight={600}>
              {v}%
            </text>
          </g>
        ))}
        <text x={X1} y={104} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontFamily={F.sans} fontSize={19} fontWeight={800} letterSpacing={2}>
          SEMUA RANK
        </text>
        <text x={X2} y={104} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontFamily={F.sans} fontWeight={800} fontSize={19} letterSpacing={2}>
          MYTHICAL GLORY+
        </text>
        <line x1={X1} x2={X1} y1={120} y2={Y1 + 20} stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
        <line x1={X2} x2={X2} y1={120} y2={Y1 + 20} stroke="rgba(255,255,255,0.14)" strokeWidth={2} />
        {LINES.map((l, i) => {
          const p = ease(start + 12 + i * 10, start + 62 + i * 10);
          return (
            <g key={l.hero}>
              <Saber d={`M ${X1} ${yOf(l.a)} L ${X2} ${yOf(l.b)}`} progress={p} color={l.color} width={6} />
              <circle cx={X1} cy={yOf(l.a)} r={9} fill={C.night} stroke={l.color} strokeWidth={4} opacity={Math.min(1, p * 8)} />
              {p > 0.97 ? <circle cx={X2} cy={yOf(l.b)} r={9} fill={C.night} stroke={l.color} strokeWidth={4} /> : null}
              <text
                x={X1 - 22}
                y={yOf(l.a) + (l.hero === 'masha' ? 26 : l.hero === 'aulus' ? -12 : 6)}
                textAnchor="end"
                fill={l.color}
                fontFamily={F.sans}
                fontWeight={800}
                fontSize={20}
                opacity={Math.min(1, p * 4)}
              >
                {fmt(l.a)}
              </text>
            </g>
          );
        })}
        {LINES.map((l, i) => {
          const p = ease(start + 52 + i * 10, start + 72 + i * 10);
          return <line key={l.hero} x1={X2 + 14} y1={yOf(l.b)} x2={X2 + 54} y2={labelY[l.hero]} stroke={l.color} strokeWidth={2} opacity={0.6 * p} />;
        })}
        <g opacity={ease(start + 16, start + 30)}>
          <circle cx={X1} cy={yOf(54.1)} r={9} fill={C.nYellow} />
          <text x={X1 + 18} y={yOf(54.1) + 7} textAnchor="start" fill={C.nYellow} fontFamily={F.sans} fontWeight={800} fontSize={20}>
            GLOO 54,10
          </text>
        </g>
      </svg>
      {LINES.map((l, i) => {
        const p = ease(start + 56 + i * 10, start + 80 + i * 10);
        return (
          <div
            key={l.hero}
            style={{position: 'absolute', left: X2 + 60, top: labelY[l.hero] - 30, display: 'flex', alignItems: 'center', gap: 14, opacity: p, transform: `translateX(${(1 - p) * 20}px)`}}
          >
            <div style={{width: 60, height: 60, borderRadius: '50%', padding: 3, boxSizing: 'border-box', background: l.color, boxShadow: `0 0 24px ${l.color}88`}}>
              <Img src={staticFile(`heroes/${l.hero}.png`)} style={{width: '100%', height: '100%', borderRadius: '50%', display: 'block'}} />
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <span style={{fontFamily: F.sans, fontWeight: 900, fontSize: 24, color: '#fff', lineHeight: 1}}>{l.name}</span>
                {l.ban !== null ? <Chip text={`BAN ${l.ban}%`} start={banStart + i * 12} bg={C.nCoral} fg={C.night} size={16} /> : null}
              </div>
              <div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 22, color: l.color, lineHeight: 1.3}}>{fmt(l.b)}%</div>
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 40, bottom: 20, fontFamily: F.sans, fontSize: 18, color: 'rgba(255,255,255,0.4)'}}>
        skala 53,5% sampai 62,5%. Gloo tidak punya data MG+.
      </div>
    </div>
  );
};

/** Scene 4: hero XP lane teratas menurut MLBB Hub (13 Okt 2026). */
export const Hero: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
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
  const note = useEnter(tNote);
  const panelIn = useEnter(cue('Dua hero XP lane') - 14);
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
    <Shell index={4} label="Hero XP lane" audio={audio} dur={dur}>
      <Title text="Hero XP lane" />
      <div style={{position: 'absolute', left: 120, top: 262, display: 'flex', gap: 16}}>
        <Chip text="DATA: MLBB HUB" start={tData} bg={C.ink} size={22} />
        <Chip text="13 OKTOBER 2026" start={tData + 8} bg={C.violet} size={22} />
        <Chip text="SEMUA RANK" start={tData + 16} bg={C.teal} size={22} />
      </div>

      <div style={{position: 'absolute', left: 120, top: 360, width: 800, height: 420}}>
        <div style={{opacity: 1 - swap, transform: `translateY(${-swap * 50}px)`}}>
          <div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 24, color: C.muted, letterSpacing: 6}}>WIN RATE, SEMUA RANK</div>
        </div>
        <div style={{position: 'absolute', left: 0, top: 0, opacity: swap, transform: `translateY(${(1 - swap) * 50}px)`}}>
          <div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 24, color: C.coral, letterSpacing: 6}}>DI-BAN, MYTHICAL GLORY+</div>
        </div>
        {big(`${fmt(stat1)}%`, `linear-gradient(95deg, ${C.coral}, ${C.violet})`, 1 - swap, -swap * 70)}
        {big('81%', `linear-gradient(95deg, ${C.coral}, #B4232C)`, swap, (1 - swap) * 70)}
        <div style={{position: 'absolute', left: 4, top: 300, fontFamily: F.sans, fontWeight: 800, fontSize: 38, color: C.ink, opacity: 1 - swap}}>
          AULUS <span style={{color: C.muted, fontWeight: 600}}>dan</span> MASHA <span style={{color: C.muted, fontWeight: 600}}>hampir 60%</span>
        </div>
        <div style={{position: 'absolute', left: 4, top: 300, fontFamily: F.sans, fontWeight: 800, fontSize: 38, color: C.ink, opacity: swap}}>
          AULUS <span style={{color: C.muted, fontWeight: 600}}>81%, Masha</span> 75%
        </div>
      </div>

      <div style={{...paper, position: 'absolute', left: 960, top: 330, width: GW, height: GH, opacity: (1 - swap) * panelIn, transform: `translateX(${-swap * 140 + (1 - panelIn) * 110}px)`}}>
        {ROWS.map((r, i) => (
          <Row key={r.hero} i={i} start={cue(r.cue) + r.delay} {...r} />
        ))}
        <div style={{position: 'absolute', right: 36, bottom: 16, fontFamily: F.sans, fontSize: 20, color: C.muted}}>skala bar mulai dari 40%</div>
      </div>
      {swap > 0.02 ? <Slope start={tBan - 4} banStart={tBan + 70} /> : null}

      {swap > 0.5 ? <Select left={106} top={648} width={470} height={70} start={tBan + 28} color={C.coral} /> : null}
      <Cursor from={[760, 900]} to={[576, 718]} start={tBan + 22} />
      <div style={{position: 'absolute', left: 120, top: 960, display: 'flex', gap: 16}}>
        <Chip text="1 HERO UTAMA" start={tPick} bg={C.violet} size={28} />
        <Chip text="+ 1 CADANGAN" start={tPick + 10} bg={C.teal} size={28} />
      </div>
      <div style={{position: 'absolute', right: 120, top: 972, fontFamily: F.sans, fontSize: 24, color: C.muted, opacity: note, transform: `translateY(${(1 - note) * 12}px)`}}>
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
          color: C.ink,
          fontFamily: F.sans,
          fontWeight: 900,
          fontSize: 34,
          padding: '14px 30px',
          borderRadius: 18,
          boxShadow: '0 14px 40px rgba(245,165,36,0.35)',
        }}
      >
        BAGUS DI KERTAS
      </div>
    </Shell>
  );
};

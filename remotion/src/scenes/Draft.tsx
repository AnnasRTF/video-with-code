import React from 'react';
import {Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {C, F} from '../theme';
import {Chip, Cursor, night, paper, Portrait, ramp, Saber, SaberDefs, SceneProps, Select, Shell, Sticker, Title, useEnter} from '../ui';

/** Scene 5: draft saat kita pick duluan. */
export const PickDuluan: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tBoard = cue('Sekarang draft');
  const tFirst = cue('Pick duluan?');
  const tFlex = cue('Ambil yang fleksibel');
  const tTank = cue('tank atau fighter');
  const tNo = cue('Jangan ambil hero');
  const tQuote = cue('first pick itu');
  const tPro = cue('Pemain jago');
  const tRevisi = cue('kebijakan dadakan');
  const board = useEnter(tBoard);
  const lit = ramp(frame, tFirst, tFirst + 12);
  const glow = 0.5 + 0.5 * Math.sin(frame / 5);
  const quote = useEnter(tQuote);
  const underline = ramp(frame, tQuote + 10, tQuote + 40, Easing.inOut(Easing.cubic));
  const pro = useEnter(tPro);
  return (
    <Shell index={5} label="Draft: pick duluan" audio={audio} dur={dur}>
      <Title text="Draft: pick duluan" />
      <div style={{...paper, position: 'absolute', left: 120, top: 300, width: 1680, height: 230, opacity: board, transform: `translateY(${(1 - board) * 50}px)`}}>
        <div style={{position: 'absolute', left: 40, top: 22, fontFamily: F.sans, fontWeight: 800, fontSize: 24, color: C.blue, letterSpacing: 4}}>TIM KAMU</div>
        <div style={{position: 'absolute', right: 40, top: 22, fontFamily: F.sans, fontWeight: 800, fontSize: 24, color: C.coral, letterSpacing: 4}}>MUSUH</div>
        {[0, 1, 2, 3, 4].map((k) => {
          const first = k === 0;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: 40 + k * 150,
                top: 70,
                width: 120,
                height: 120,
                borderRadius: 26,
                background: first && lit > 0.5 ? '#FFF6DB' : 'rgba(47,107,255,0.08)',
                border: `3px solid ${first && lit > 0.5 ? C.yellow : 'rgba(47,107,255,0.45)'}`,
                boxShadow: first && lit > 0.5 ? `0 0 ${24 + glow * 24}px ${C.yellow}aa` : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: F.sans,
                fontWeight: 900,
                fontSize: 60,
                color: first && lit > 0.5 ? C.yellow : 'rgba(47,107,255,0.55)',
              }}
            >
              {first && lit > 0.5 ? '?' : k + 1}
            </div>
          );
        })}
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} style={{position: 'absolute', right: 40 + k * 150, top: 70, width: 120, height: 120, borderRadius: 26, background: 'rgba(255,77,85,0.06)', border: '3px dashed rgba(255,77,85,0.4)'}} />
        ))}
      </div>
      <div style={{position: 'absolute', left: 120, top: 664, display: 'flex', alignItems: 'center', gap: 20}}>
        <Chip text="FLEKSIBEL" start={tFlex} bg={C.yellow} fg={C.ink} size={44} />
        <Chip text="TANK" start={tTank} bg={C.teal} size={34} />
        <Chip text="FIGHTER" start={tTank + 8} bg={C.coral} size={34} />
        <Chip text="+ CROWD CONTROL" start={tTank + 16} bg={C.violet} size={34} />
      </div>
      <div style={{position: 'absolute', left: 120, top: 584}}>
        <Chip text="JANGAN MUDAH DI-COUNTER" start={tNo} bg={C.ink} size={30} />
      </div>
      {lit > 0.5 ? <Select left={146} top={364} width={148} height={148} start={tFirst + 2} color={C.yellow} /> : null}
      <Cursor from={[640, 760]} to={[300, 500]} start={tFirst + 4} />
      <div style={{...night, position: 'absolute', left: 120, top: 780, width: 1680, height: 240, opacity: quote, transform: `translateY(${(1 - quote) * 60}px)`}}>
        <div style={{position: 'absolute', left: 60, top: 36, fontFamily: F.sans, fontWeight: 900, fontSize: 96, color: '#fff', letterSpacing: -3}}>
          FIRST PICK <span style={{color: C.nCoral}}>≠</span> KEUNTUNGAN
        </div>
        <svg width={1500} height={50} style={{position: 'absolute', left: 50, top: 152, overflow: 'visible'}}>
          <SaberDefs />
          <Saber d="M 10 25 L 900 25" progress={underline} color={C.nViolet} width={6} />
        </svg>
        <div style={{position: 'absolute', left: 60, top: 190, fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: 'rgba(255,255,255,0.7)', opacity: pro, transform: `translateY(${(1 - pro) * 14}px)`}}>
          Pemain jago lebih suka pick terakhir: bisa menyesuaikan diri dengan lawan.
        </div>
      </div>
      <Sticker text="REVISI v2" start={tRevisi} bg={C.coral} fg="#fff" rotate={6} size={44} style={{right: 160, top: 760}} />
    </Shell>
  );
};

type Counter = {hero: string; name: string; pp: number};
const MATCHUPS: {enemy: string; name: string; cue: string; note?: string; counters: Counter[]}[] = [
  {
    enemy: 'aulus',
    name: 'AULUS',
    cue: 'Lawan Aulus',
    counters: [
      {hero: 'alice', name: 'ALICE', pp: 2.7},
      {hero: 'balmond', name: 'BALMOND', pp: 2.2},
      {hero: 'julian', name: 'JULIAN', pp: 2.0},
    ],
  },
  {
    enemy: 'masha',
    name: 'MASHA',
    cue: 'Lawan Masha',
    note: 'skill 2 reset tiap 1 bar HP habis',
    counters: [
      {hero: 'freya', name: 'FREYA', pp: 2.8},
      {hero: 'uranus', name: 'URANUS', pp: 2.0},
    ],
  },
  {
    enemy: 'argus',
    name: 'ARGUS',
    cue: 'Lawan Argus',
    counters: [
      {hero: 'barats', name: 'BARATS', pp: 3.2},
      {hero: 'uranus', name: 'URANUS', pp: 2.9},
      {hero: 'terizla', name: 'TERIZLA', pp: 2.7},
    ],
  },
];
const RINGS = [C.coral, C.violet, C.teal];

const Matchup: React.FC<{i: number; start: number} & (typeof MATCHUPS)[number]> = ({i, start, ...m}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  const line = ramp(frame, start + 10, start + 34, Easing.inOut(Easing.cubic));
  return (
    <div style={{...paper, position: 'absolute', left: 120, top: 290 + i * 215, width: 1680, height: 190, borderRadius: 32, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * -100}px)`}}>
      <div style={{position: 'absolute', left: 36, top: 32}}>
        <Portrait hero={m.enemy} size={126} ring={RINGS[i]} />
      </div>
      <div style={{position: 'absolute', left: 190, top: 36, fontFamily: F.sans, fontWeight: 700, fontSize: 22, color: C.muted, letterSpacing: 3}}>LAWAN</div>
      <div style={{position: 'absolute', left: 190, top: 64, fontFamily: F.sans, fontWeight: 900, fontSize: 52, color: C.ink, letterSpacing: -1}}>{m.name}</div>
      {m.note ? <div style={{position: 'absolute', left: 190, top: 134, fontFamily: F.sans, fontWeight: 600, fontSize: 20, color: C.coral}}>{m.note}</div> : null}
      <svg width={260} height={60} style={{position: 'absolute', left: 420, top: 66, overflow: 'visible'}}>
        <SaberDefs />
        <Saber d="M 10 30 L 230 30" progress={line} color={C.teal} width={5} />
      </svg>
      {m.counters.map((c, j) => {
        const t = start + 24 + j * 14;
        const pj = useEnter(t);
        const bar = ramp(frame, t + 6, t + 34);
        return (
          <div key={c.hero + j} style={{position: 'absolute', left: 710 + j * 330, top: 28, width: 310, opacity: Math.min(1, pj * 2), transform: `translateY(${(1 - pj) * 30}px)`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <Portrait hero={c.hero} size={100} ring={C.teal} />
              <div>
                <div style={{fontFamily: F.sans, fontWeight: 900, fontSize: 28, color: C.ink}}>{c.name}</div>
                <div style={{fontFamily: F.sans, fontWeight: 900, fontSize: 38, color: C.teal, letterSpacing: -1}}>+{(c.pp * bar).toFixed(1).replace('.', ',')}</div>
              </div>
            </div>
            <div style={{marginTop: 18, width: 290, height: 14, borderRadius: 7, background: 'rgba(18,21,40,0.08)'}}>
              <div style={{width: (c.pp / 3.5) * 290 * bar, height: '100%', borderRadius: 7, background: `linear-gradient(90deg, ${C.teal}, #57E3D0)`, boxShadow: `0 4px 14px ${C.teal}66`}} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Scene 6: draft saat kita pick terakhir. Angka = keunggulan win rate (poin) menurut MLBB Hub, 9 Okt 2026. */
export const Counter: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  return (
    <Shell index={6} label="Draft: pick terakhir" audio={audio} dur={dur}>
      <Title text="Draft: pick terakhir" />
      {MATCHUPS.map((m, i) => (
        <Matchup key={m.enemy} i={i} start={cue(m.cue)} {...m} />
      ))}
      <Select left={818} top={738} width={330} height={134} start={cue('Lawan Argus') + 54} color={C.accent} />
      <Cursor from={[1500, 980]} to={[1148, 872]} start={cue('Lawan Argus') + 48} />
      <div style={{position: 'absolute', left: 120, top: 960}}>
        <Chip text="DATA MLBB HUB, 9 OKT 2026. ANGKA = KEUNGGULAN WIN RATE, SELISIH KECIL" start={cue('Tapi ingat, selisih')} bg={C.violet} size={22} />
      </div>
      <Sticker text="JANGAN KEGIRANGAN" start={cue('Jangan kegirangan')} bg={C.yellow} rotate={-4} size={32} style={{right: 130, top: 170}} />
    </Shell>
  );
};

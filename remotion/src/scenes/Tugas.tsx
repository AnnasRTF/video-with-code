import {getPointAtLength} from '@remotion/paths';
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {EXP_LANE} from '../mapdata';
import {C, F} from '../theme';
import {Chip, Cursor, MapPanel, paper, ramp, Saber, SceneProps, Select, Shell, Strike, Title, useEnter} from '../ui';
import {Easing} from 'remotion';

const ROWS = [
  {n: '1', head: 'LEVEL', sub: 'Ambil level lebih cepat dari lawan', color: C.teal, cue: 'Satu,'},
  {n: '2', head: 'FRONTLINE', sub: 'Jadi frontline saat teamfight', color: C.coral, cue: 'Dua,'},
  {n: '3', head: 'TEKANAN', sub: 'Beri tekanan di side lane', color: C.yellow, cue: 'Tiga,'},
] as const;

const Row: React.FC<{i: number; start: number; gone: number} & (typeof ROWS)[number]> = ({i, start, gone, ...r}) => {
  const p = useEnter(start);
  return (
    <div
      style={{
        ...paper,
        position: 'absolute',
        left: 800,
        top: 320 + i * 200,
        width: 1000,
        height: 160,
        opacity: Math.min(1, p * 2) * (1 - 0.45 * gone),
        transform: `translateX(${(1 - p) * 120}px)`,
      }}
    >
      <div style={{position: 'absolute', left: 36, top: 36, width: 88, height: 88, borderRadius: '50%', background: r.color, boxShadow: `0 10px 26px ${r.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 900, fontSize: 52, color: r.color === C.yellow ? C.ink : '#fff'}}>
        {r.n}
      </div>
      <div style={{position: 'absolute', left: 156, top: 30, fontFamily: F.sans, fontWeight: 900, fontSize: 48, color: C.ink}}>{r.head}</div>
      <div style={{position: 'absolute', left: 156, top: 94, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: C.muted}}>{r.sub}</div>
    </div>
  );
};

/** Scene 2: tugas XP lane, di jalur atas peta. */
export const Tugas: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tMap = cue('Pertama,');
  const tLane = cue('XP lane itu lane solo');
  const tSolo = cue('Iya, lo sendirian');
  const tGone = cue('Kalau lo kalah level');
  const map = useEnter(tMap);
  const lane = ramp(frame, tLane, tLane + 50, Easing.inOut(Easing.cubic));
  const gone = ramp(frame, tGone, tGone + 24);
  const pt = getPointAtLength(EXP_LANE, 330 + 40 * Math.sin(frame / 22));
  const solo = useEnter(tSolo, 'pop');
  return (
    <Shell index={2} label="Tugas XP lane" audio={audio} dur={dur}>
      <Title text="Tugas XP lane" />
      <MapPanel left={120} top={300} size={560} enter={map}>
        <Saber d={EXP_LANE} progress={lane} color="#2EE6C5" width={7} head={lane < 0.99} />
        {solo > 0.02 && pt ? (
          <>
            <circle cx={pt.x} cy={pt.y} r={20 * solo} fill="#60A5FA" opacity={0.4} />
            <circle cx={pt.x} cy={pt.y} r={11 * solo} fill="#60A5FA" stroke="#fff" strokeWidth={3} />
          </>
        ) : null}
      </MapPanel>
      {solo > 0.02 && pt ? <Select left={142 + pt.x * 1.094 - 46} top={322 + pt.y * 1.094 - 46} width={92} height={92} start={tSolo + 8} color={C.blue} /> : null}
      <Cursor from={[760, 820]} to={[330, 520]} start={tSolo + 14} />
      <div style={{position: 'absolute', left: 150, top: 918}}>
        <Chip text="KAMU, SOLO DI LANE ATAS" start={tSolo} bg={C.blue} size={26} />
      </div>
      {ROWS.map((r, i) => (
        <Row key={r.n} i={i} start={cue(r.cue)} gone={gone} {...r} />
      ))}
      {ROWS.map((r, i) => (
        <Strike key={r.n} left={956} top={355 + i * 200} width={520} progress={ramp(frame, tGone + i * 8, tGone + 22 + i * 8)} />
      ))}
    </Shell>
  );
};

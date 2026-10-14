import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {BigWord, focus, unfocus} from '../fx';
import {C, F} from '../theme';
import {Check, Chip, Cursor, night, paper, ramp, Saber, SaberDefs, SceneProps, Select, Shell, Sticker, Title, Tower, useEnter} from '../ui';

const BLUE = '#60A5FA';
const RED = '#FF6B6B';
const STUCK_X = 575;

const TASKS = [
  {head: 'LAST HIT', sub: 'Fokus farm, jangan asal pukul', color: C.teal, cue: 'fokus last hit'},
  {head: 'FREEZE', sub: 'Tahan wave dekat turret lo', color: C.blue, cue: 'Namanya freeze'},
  {head: 'CANNON', sub: '+35% EXP buat yang last hit (10 wave pertama)', color: C.yellow, cue: 'Prioritasin minion cannon'},
  {head: 'PUSH, BARU ROTASI', sub: 'Dorong wave sebelum Turtle muncul', color: C.coral, cue: 'Sebelum Turtle muncul'},
] as const;

const Task: React.FC<{i: number; start: number} & (typeof TASKS)[number]> = ({i, start, ...t}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  return (
    <div style={{...paper, position: 'absolute', left: 1300, top: 310 + i * 154, width: 500, height: 130, borderRadius: 30, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * 110}px)`}}>
      <div style={{position: 'absolute', left: 26, top: 24, fontFamily: F.sans, fontWeight: 900, fontSize: 38, color: C.ink, letterSpacing: -1}}>{t.head}</div>
      <div style={{position: 'absolute', left: 26, top: 74, width: 380, fontFamily: F.sans, fontWeight: 600, fontSize: 21, lineHeight: 1.2, color: C.muted}}>{t.sub}</div>
      <div style={{position: 'absolute', right: 22, top: 30}}>
        <Check progress={ramp(frame, start + 6, start + 26, Easing.inOut(Easing.cubic))} color={t.color} size={70} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 24, width: 8, height: 82, borderRadius: 4, background: t.color}} />
    </div>
  );
};

/** Scene 8: farming dan freeze, digambar sebagai potongan lane dengan dua wave minion. */
export const Freeze: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tTime = cue('Dua menit pertama');
  const tFreeze = cue('tahan wave');
  const tCannon = cue('Prioritasin minion cannon');
  const tPush = cue('Sebelum Turtle muncul');
  const tLeft = cue('Jangan tinggalin minion');
  const tProyek = cue('proyek mangkrak');

  const panel = useEnter(tTime - 8);
  const E = Easing.inOut(Easing.cubic);
  const cx = interpolate(frame, [0, tFreeze - 4, tFreeze + 46, tPush - 4, tPush + 80], [600, 600, 360, 360, 820], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: E});
  const clock = ramp(frame, tTime, tPush + 80, Easing.linear);
  const stuck = ramp(frame, tLeft, tLeft + 16);
  const turtle = useEnter(tPush, 'pop');
  const cannonPop = useEnter(tCannon + 6, 'pop');
  const wob = (i: number, s = 3) => Math.sin(frame / 7 + i * 1.7) * s;
  const BASE_Y = 310;
  const blue = [0, 1, 2, 3, 4, 5].map((i) => ({x: cx - 26 - i * 31 + wob(i), y: BASE_Y + (i % 2 ? 16 : -16) + wob(i + 3, 2), cannon: i === 3}));
  const red = [0, 1, 2, 3, 4, 5].map((i) => ({
    x: cx + 26 + i * 31 + wob(i + 9),
    y: BASE_Y + (i % 2 ? -16 : 16) + wob(i + 5, 2),
    gone: ramp(frame, tPush + 50 + i * 5, tPush + 64 + i * 5),
  }));

  return (
    <Shell
      vo={vo}
      index={8}
      label="Farming dan freeze"
      audio={audio}
      dur={dur}
      cam={{
        keys: [focus(tTime, 680, 620, 1.05, 0.4), focus(tPush, 980, 560, 1.07, 0.5), unfocus(tLeft - 6)],
        hits: [{f: tFreeze, amp: 14}, {f: tCannon, amp: 12}, {f: tPush, amp: 14}, {f: tProyek, amp: 18, flash: true}],
      }}
    >
      <Title text="Farming dan freeze" />
      <div style={{...night, position: 'absolute', left: 120, top: 310, width: 1130, height: 620, opacity: panel, transform: `translateY(${(1 - panel) * 70}px)`}}>
        <svg width={1130} height={620} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <SaberDefs />
          <rect x={40} y={238} width={1050} height={144} rx={72} fill="rgba(255,255,255,0.05)" />
          <line x1={80} x2={1050} y1={BASE_Y} y2={BASE_Y} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="6 10" />
          <Tower x={118} y={292} s={1.9} color={BLUE} />
          <Tower x={1012} y={292} s={1.9} color={RED} />
          <text x={118} y={400} textAnchor="middle" fill={BLUE} fontFamily={F.sans} fontWeight={800} fontSize={20} letterSpacing={3}>
            TURRET LO
          </text>
          <text x={1012} y={400} textAnchor="middle" fill={RED} fontFamily={F.sans} fontWeight={800} fontSize={20} letterSpacing={3}>
            TURRET MUSUH
          </text>
          {red.map((m, i) => (
            <circle key={`r${i}`} cx={m.x} cy={m.y} r={13} fill={RED} stroke="#fff" strokeWidth={2.5} opacity={1 - m.gone} />
          ))}
          {blue.map((m, i) => (
            <g key={`b${i}`}>
              {m.cannon ? <circle cx={m.x} cy={m.y} r={29} fill="none" stroke={C.nYellow} strokeWidth={3} strokeDasharray="5 6" opacity={ramp(frame, tCannon, tCannon + 10)} /> : null}
              <circle cx={m.x} cy={m.y} r={m.cannon ? 19 : 13} fill={m.cannon ? C.nYellow : BLUE} stroke="#fff" strokeWidth={2.5} />
            </g>
          ))}
          {/* minion yang ditinggal */}
          <g opacity={stuck}>
            <circle cx={STUCK_X} cy={BASE_Y + 54} r={14} fill={BLUE} stroke="#fff" strokeWidth={2.5} />
          </g>
          {/* panah dorong */}
          <Saber d="M 420 200 L 790 200" progress={ramp(frame, tPush, tPush + 40, E)} color={C.nTeal} width={6} />
          <polyline points="760,182 792,200 760,218" fill="none" stroke={C.nTeal} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={ramp(frame, tPush + 36, tPush + 44)} />
          {/* garis waktu 0:00 sampai 2:00 */}
          <line x1={80} x2={1050} y1={520} y2={520} stroke="rgba(255,255,255,0.16)" strokeWidth={3} />
          {[0, 1, 2].map((m) => (
            <g key={m}>
              <line x1={80 + m * 485} x2={80 + m * 485} y1={506} y2={534} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
              <text x={80 + m * 485} y={568} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontFamily={F.mono} fontSize={20}>
                {m}:00
              </text>
            </g>
          ))}
          <Saber d="M 80 520 L 1050 520" progress={clock} color={C.nViolet} width={6} />
        </svg>
        {/* ikon dan penanda */}
        <div style={{position: 'absolute', left: 1050 - 40, top: 520 - 94, opacity: Math.min(1, turtle * 2), transform: `scale(${0.4 + 0.6 * turtle})`}}>
          <Img src={staticFile('icons/turtle.png')} style={{width: 80, height: 80, borderRadius: 18, boxShadow: `0 10px 26px ${C.nTeal}88`}} />
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: 1 - ramp(frame, tPush - 4, tPush + 12)}}>
          <Select left={150} top={206} width={420} height={196} start={tFreeze} color={C.nCoral} />
          <div style={{position: 'absolute', left: 150, top: 150}}>
            <Chip text="FREEZE" start={tFreeze + 6} bg={C.nCoral} fg={C.night} size={22} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 340, top: 40, opacity: cannonPop, transform: `scale(${0.5 + 0.5 * cannonPop})`}}>
          <Chip text="CANNON +35% EXP" start={tCannon + 6} bg={C.nYellow} fg={C.night} size={20} />
        </div>
        <div style={{position: 'absolute', left: 80, top: 36}}>
          <Chip text="2 MENIT PERTAMA" start={tTime} bg="rgba(255,255,255,0.14)" size={20} />
        </div>
        <Select left={STUCK_X - 32} top={BASE_Y + 22} width={64} height={64} start={tLeft + 10} color={C.nYellow} />
      </div>
      {TASKS.map((t, i) => (
        <Task key={t.head} i={i} start={cue(t.cue)} {...t} />
      ))}
      <Cursor from={[1150, 860]} to={[120 + STUCK_X + 20, 310 + 370]} start={tLeft + 4} />
      <Sticker text="PROYEK MANGKRAK" start={tProyek} bg={C.coral} fg="#fff" rotate={-4} size={44} style={{right: 130, top: 150}} />
      <BigWord text="FREEZE!" start={cue('Namanya freeze')} dur={26} color={C.blue} size={260} top={360} />
    </Shell>
  );
};

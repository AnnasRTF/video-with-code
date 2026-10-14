import React from 'react';
import {Easing, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {BigWord, focus, unfocus} from '../fx';
import {EXP_LANE, GOLD_LANE, LORD, PIT} from '../mapdata';
import {C, F} from '../theme';
import {Chip, MapPanel, Marquee, paper, ramp, Saber, SceneProps, Shell, Sticker, Title, useEnter} from '../ui';

const X0 = 76;
const PER_MIN = 98;
const xMin = (m: number) => X0 + m * PER_MIN;

const Timeline: React.FC<{tTurtle: number; tLord: number}> = ({tTurtle, tLord}) => {
  const frame = useCurrentFrame();
  const p = useEnter(tTurtle - 8);
  const axis = ramp(frame, tTurtle, tTurtle + 50, Easing.inOut(Easing.cubic));
  const lord = useEnter(tLord, 'pop');
  return (
    <div style={{...paper, position: 'absolute', left: 720, top: 300, width: 1080, height: 300, opacity: p, transform: `translateY(${(1 - p) * 60}px)`}}>
      <div style={{position: 'absolute', left: 36, top: 26, fontFamily: F.mono, fontSize: 20, color: C.muted, letterSpacing: 3}}>WAKTU MUNCUL OBJEKTIF</div>
      {/* pita menit 8 sampai 9 untuk Lord */}
      <div
        style={{
          position: 'absolute',
          left: xMin(8) - 14,
          top: 92,
          width: PER_MIN + 28,
          height: 120,
          borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(229,56,59,0.16), rgba(229,56,59,0.04))',
          border: '2px dashed rgba(229,56,59,0.55)',
          opacity: lord,
        }}
      />
      <svg width={1080} height={300} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={X0} x2={xMin(9)} y1={196} y2={196} stroke="rgba(15,16,20,0.14)" strokeWidth={4} />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
          <g key={m}>
            <line x1={xMin(m)} x2={xMin(m)} y1={m % 2 ? 188 : 182} y2={m % 2 ? 204 : 210} stroke="rgba(15,16,20,0.35)" strokeWidth={3} />
            {m % 2 === 0 || m === 9 ? (
              <text x={xMin(m)} y={248} textAnchor="middle" fill={C.muted} fontFamily={F.mono} fontSize={22}>
                {m}:00
              </text>
            ) : null}
          </g>
        ))}
        <Saber d={`M ${X0} 196 L ${xMin(9)} 196`} progress={axis} color={C.accent} width={6} />
      </svg>
      {[2, 4, 6, 8].map((m, i) => {
        const t = tTurtle + 22 + i * 14;
        return <TurtleIcon key={m} left={xMin(m) - 34} start={t} />;
      })}
      <div style={{position: 'absolute', left: xMin(9) + 22, top: 98, opacity: Math.min(1, lord * 2), transform: `scale(${0.4 + 0.6 * lord})`}}>
        <Img src={staticFile('icons/lord.png')} style={{width: 72, height: 72, borderRadius: 16, boxShadow: `0 10px 26px ${C.coral}66`}} />
      </div>
      <div style={{position: 'absolute', right: 36, top: 20}}>
        <Chip text="LORD: 8:00, PALING LAMBAT 9:00" start={tLord + 10} bg={C.coral} size={21} />
      </div>
    </div>
  );
};

const TurtleIcon: React.FC<{left: number; start: number}> = ({left, start}) => {
  const p = useEnter(start, 'pop');
  return (
    <div style={{position: 'absolute', left, top: 100, opacity: Math.min(1, p * 2), transform: `scale(${0.4 + 0.6 * p})`}}>
      <Img src={staticFile('icons/turtle.png')} style={{width: 68, height: 68, borderRadius: 16, boxShadow: `0 10px 24px ${C.teal}77`}} />
    </div>
  );
};

const Situation: React.FC<{i: number; start: number; q: string; act: string; color: string; fg?: string}> = ({i, start, q, act, color, fg = '#fff'}) => {
  const p = useEnter(start);
  return (
    <div style={{...paper, position: 'absolute', left: 720 + i * 372, top: 640, width: 336, height: 280, borderRadius: 34, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 70}px)`}}>
      <div style={{position: 'absolute', left: 28, top: 26, width: 280, fontFamily: F.sans, fontWeight: 900, fontSize: 38, lineHeight: 1.08, letterSpacing: -1, color: C.ink}}>
        <Marquee start={start + 14} color={color} pad={10}>
          {q}
        </Marquee>
      </div>
      <div style={{position: 'absolute', left: 28, bottom: 28}}>
        <Chip text={act} start={start + 22} bg={color} fg={fg} size={24} />
      </div>
    </div>
  );
};

/** Scene 9: rotasi dan objektif. Peta di kiri, jadwal Turtle dan Lord serta tiga situasi di kanan. */
export const Rotasi: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tTurtle = cue('Turtle pertama muncul');
  const tRapat = cue('Rapat boleh molor');
  const tAllied = cue('Dengan peta baru');
  const tPush = cue('Ikut dorong');
  const tLord = cue('Lord pertama muncul');
  const tPress = cue('Sebelum itu');
  const tMini = cue('lihat minimap');
  const tHilang = cue('Hero musuh ilang');
  const tJungle = cue('Jungler musuh keliatan');
  const tWisp = cue('Ambil wisp');
  const tMati = cue('Kalau lo tetep mati');

  const map = useEnter(tTurtle - 8);
  const pulse = 1 + 0.12 * Math.sin(frame / 5);
  const E = Easing.inOut(Easing.cubic);
  const wisp = ramp(frame, tWisp + 6, tWisp + 50);
  const gone = ramp(frame, tHilang + 6, tHilang + 30);
  const retreat = ramp(frame, tHilang + 14, tHilang + 44, E);
  const jungle = ramp(frame, tJungle, tJungle + 12);
  const pushLane = ramp(frame, tJungle + 22, tJungle + 70, E);
  const enemyDots: [number, number][] = [
    [34, 170],
    [200, 34],
  ];

  return (
    <Shell
      vo={vo}
      index={9}
      label="Rotasi dan objektif"
      audio={audio}
      dur={dur}
      cam={{
        keys: [
          focus(tTurtle, 1260, 450, 1.07, 0.5),
          focus(tAllied, 390, 590, 1.1, 0.55),
          focus(tLord, 1260, 450, 1.07, 0.5),
          unfocus(tPress),
          focus(tHilang, 1100, 700, 1.06, 0.5),
          unfocus(tMati - 6),
        ],
        hits: [
          {f: tTurtle, amp: 12},
          {f: tRapat, amp: 14},
          {f: tAllied, amp: 14},
          {f: tLord, amp: 18, flash: true},
          {f: tHilang, amp: 12},
          {f: tJungle, amp: 12},
          {f: tWisp, amp: 12},
          {f: tMati, amp: 18, flash: true},
        ],
      }}
    >
      <Title text="Rotasi dan objektif" />
      <MapPanel left={120} top={300} size={540} enter={map}>
        {frame >= tTurtle ? (
          <g>
            <circle cx={PIT.x} cy={PIT.y} r={44 * pulse} fill="none" stroke="#2EE6C5" strokeWidth={4} opacity={0.85} />
            <image href={staticFile('icons/turtle.png')} x={PIT.x - 28} y={PIT.y - 28} width={56} height={56} />
          </g>
        ) : null}
        {frame >= tLord ? (
          <g opacity={ramp(frame, tLord, tLord + 12)}>
            <circle cx={LORD.x} cy={LORD.y} r={44 * pulse} fill="none" stroke="#FF6B6B" strokeWidth={4} opacity={0.85} />
            <image href={staticFile('icons/lord.png')} x={LORD.x - 28} y={LORD.y - 28} width={56} height={56} />
          </g>
        ) : null}
        <Saber d="M 155 158 L 110 80 L 335 40" progress={ramp(frame, tAllied, tAllied + 60, E)} color="#2EE6C5" width={7} head={frame < tPush + 40} />
        <Saber d={EXP_LANE} progress={ramp(frame, tPress, tPress + 50, E)} color="#FFD166" width={6} head={false} />
        <Saber d={GOLD_LANE} progress={ramp(frame, tPress + 12, tPress + 62, E)} color="#FFD166" width={6} head={false} />
        {frame >= tHilang - 20
          ? enemyDots.map(([x, y], i) => (
              <g key={i} opacity={1 - gone}>
                <circle cx={x} cy={y} r={13} fill="#FF6B6B" stroke="#fff" strokeWidth={3} />
              </g>
            ))
          : null}
        {gone > 0 ? (
          <g opacity={gone * (1 - ramp(frame, tHilang + 60, tHilang + 80))}>
            <text x={34} y={176} textAnchor="middle" fill="#fff" fontFamily={F.sans} fontWeight={900} fontSize={30}>
              ?
            </text>
            <text x={200} y={40} textAnchor="middle" fill="#fff" fontFamily={F.sans} fontWeight={900} fontSize={30}>
              ?
            </text>
          </g>
        ) : null}
        <Saber d="M 34 190 L 40 238 L 62 322" progress={retreat} color="#FF6B6B" width={6} />
        <g opacity={jungle}>
          <circle cx={478} cy={300} r={26 * pulse} fill="#FF6B6B" opacity={0.3} />
          <circle cx={478} cy={300} r={12} fill="#FF6B6B" stroke="#fff" strokeWidth={3} />
        </g>
        <Saber d="M 40 238 L 34 130 L 62 55 L 125 34 L 335 34" progress={pushLane} color="#7CFFB2" width={7} head={pushLane < 0.99} />
        {frame >= tWisp ? (
          <g>
            <circle cx={256} cy={256} r={200 * wisp} fill="none" stroke="#7FDBFF" strokeWidth={4} opacity={0.6 * (1 - wisp * 0.4)} />
            <circle cx={256} cy={256} r={24} fill="#7FDBFF" opacity={0.4} />
            <circle cx={256} cy={256} r={11} fill="#fff" />
          </g>
        ) : null}
      </MapPanel>
      <div style={{position: 'absolute', left: 150, top: 896, display: 'flex', gap: 14}}>
        <Chip text="TURTLE: 2:00, LALU TIAP 2 MENIT" start={tTurtle + 6} bg={C.teal} size={22} />
      </div>
      <Timeline tTurtle={tTurtle} tLord={tLord} />
      <Situation i={0} start={tHilang} q="Hero musuh ilang?" act="MUNDUR KE TURRET" color={C.coral} />
      <Situation i={1} start={tJungle} q="Jungler musuh keliatan?" act="WAKTUNYA PUSH" color={C.green} />
      <Situation i={2} start={tWisp} q="Ada wisp di peta?" act="BUKA POSISI" color={C.blue} />
      <Sticker text="RAPAT BOLEH MOLOR, TURTLE NGGAK" start={tRapat} bg={C.yellow} rotate={-3} size={34} style={{left: 1010, top: 640, opacity: 1 - ramp(frame, tAllied - 4, tAllied + 10)}} />
      <Sticker text="BUKAN SALAH JUNGLER" start={tMati} bg={C.coral} fg="#fff" rotate={-4} size={44} style={{right: 130, top: 150}} />
      <BigWord text="JANGAN TELAT!" start={cue('Jangan telat')} dur={34} color={C.coral} size={200} top={380} />
    </Shell>
  );
};

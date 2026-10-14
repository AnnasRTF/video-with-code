import React from 'react';
import {Easing, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {BigWord, focus, unfocus} from '../fx';
import {PIT} from '../mapdata';
import {C, F} from '../theme';
import {Chip, Cursor, MapPanel, paper, Portrait, ramp, Saber, SaberDefs, SceneProps, Select, Shell, Sticker, Strike, Title, Tower, useEnter} from '../ui';

const Callout: React.FC<{
  start: number;
  end: number;
  head: string;
  color: string;
  main: string[];
  sub: string[];
  icon: React.ReactNode;
}> = ({start, end, head, color, main, sub, icon}) => {
  const frame = useCurrentFrame();
  const p = useEnter(start);
  const out = ramp(frame, end - 8, end + 8);
  if (frame < start - 2 || out >= 1) return null;
  return (
    <div style={{...paper, position: 'absolute', left: 120, top: 300, width: 820, height: 580, opacity: Math.min(1, p * 2) * (1 - out), transform: `translateX(${(1 - p) * -80 - out * 80}px)`}}>
      <div style={{position: 'absolute', left: 50, top: 50, width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{icon}</div>
      <div style={{position: 'absolute', left: 270, top: 78, fontFamily: F.sans, fontWeight: 900, fontSize: 54, color, letterSpacing: -1}}>{head}</div>
      <div style={{position: 'absolute', left: 270, top: 158, width: 480, height: 6, borderRadius: 3, background: color, opacity: 0.85}} />
      {main.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: 50, top: 300 + i * 56, fontFamily: F.sans, fontWeight: 800, fontSize: 42, color: C.ink}}>
          {l}
        </div>
      ))}
      {sub.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: 50, top: 300 + main.length * 56 + 24 + i * 44, fontFamily: F.sans, fontWeight: 500, fontSize: 30, color: C.muted}}>
          {l}
        </div>
      ))}
    </div>
  );
};

/** Scene 3: meta Season 42, patch 2.2.16, revamp Masha, dan perubahan peta 28 September 2026. */
export const Meta: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tS = cue('Season empat');
  const tM = cue('Masha direvamp');
  const tRip = cue('dia udah almarhum');
  const tMap = cue('petanya berubah');
  const tH = cue('Healing Turtle');
  const tG = cue('Golden Turret');
  const tW = cue('wisp di peta');
  const tTr = cue('Akhirnya ada yang');

  const season = useEnter(tS);
  const seasonOut = ramp(frame, tH - 8, tH + 8);
  const masha = useEnter(tM);
  const mashaOut = ramp(frame, tMap, tMap + 14);
  const map = useEnter(tMap + 6);
  const pulse = 1 + 0.12 * Math.sin(frame / 5);
  const wisp = ramp(frame, tW + 8, tW + 50);

  return (
    <Shell
      vo={vo}
      index={3}
      label="Meta Season 42"
      audio={audio}
      dur={dur}
      cam={{
        keys: [focus(tM, 1400, 590, 1.07, 0.5), unfocus(tMap - 2)],
        hits: [{f: tM, amp: 14}, {f: tRip, amp: 18, flash: true}, {f: tMap, amp: 12}, {f: tH, amp: 10}, {f: tG, amp: 10}, {f: tW, amp: 10}, {f: tTr, amp: 14}],
      }}
    >
      <Title text="Meta Season 42" />

      {seasonOut < 1 ? <Select left={160} top={660} width={430} height={130} start={tS + 30} color={C.accent} /> : null}
      <Cursor from={[880, 940]} to={[590, 790]} start={tS + 24} />
      {/* kiri: musim, lalu callout peta */}
      {seasonOut < 1 ? (
        <div style={{...paper, position: 'absolute', left: 120, top: 300, width: 820, height: 580, opacity: Math.min(1, season * 2) * (1 - seasonOut), transform: `translateY(${(1 - season) * 50}px)`}}>
          <div style={{position: 'absolute', left: 60, top: 70, fontFamily: F.mono, fontSize: 26, color: C.muted, letterSpacing: 4}}>SEKARANG</div>
          <div style={{position: 'absolute', left: 56, top: 120, fontFamily: F.sans, fontWeight: 900, fontSize: 130, color: C.ink, letterSpacing: -5, lineHeight: 1}}>SEASON 42</div>
          <div style={{position: 'absolute', left: 60, top: 270, fontFamily: F.sans, fontWeight: 800, fontSize: 46, color: C.yellow, letterSpacing: 3}}>STARWARD DECADE</div>
          <div style={{position: 'absolute', left: 60, top: 380}}>
            <Chip text="PATCH 2.2.16" start={tS + 10} bg={C.violet} size={44} />
          </div>
          <div style={{position: 'absolute', left: 60, top: 490, fontFamily: F.sans, fontWeight: 500, fontSize: 30, color: C.muted}}>mulai 16 September 2026</div>
        </div>
      ) : null}
      <Callout
        start={tH}
        end={tG}
        head="HEALING TURTLE"
        color={C.teal}
        main={['Tanpa shield lagi.']}
        sub={['Turtle sekutu bantu push lane musuh terkuat.', 'Hero sekutu di dekatnya pulih HP cepat.']}
        icon={
          <div style={{position: 'relative', width: 190, height: 190}}>
            <Img src={staticFile('icons/turtle.png')} style={{width: 150, height: 150, borderRadius: 30, boxShadow: `0 14px 34px ${C.teal}55`}} />
            <svg width={190} height={190} style={{position: 'absolute', left: 0, top: 0}}>
              <path d="M 120 40 L 190 40 L 184 110 L 155 150 L 126 110 Z" fill={C.muted} opacity={0.9} />
            </svg>
            <Strike left={110} top={95} width={90} progress={ramp(frame, tH + 20, tH + 40)} />
          </div>
        }
      />
      <Callout
        start={tG}
        end={tW}
        head="GOLDEN TURRET"
        color={C.yellow}
        main={['Gold tim naik besar saat', 'turret mana pun hancur.']}
        sub={['HP Inner dan Base Turret ikut naik.']}
        icon={
          <svg width={190} height={190} viewBox="-60 -60 120 120">
            <Tower x={0} y={8} s={1.6} color={C.yellow} />
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={-40 + i * 40} cy={-46 - (i % 2) * 8} r={11} fill={C.yellow} stroke="#B97800" strokeWidth={3} />
            ))}
          </svg>
        }
      />
      <Callout
        start={tW}
        end={1e9}
        head="REVEALING WISP"
        color="#1AA7D9"
        main={['Buka posisi musuh yang', 'tersembunyi.']}
        sub={['Ambil wisp di peta: area luas, beberapa detik.']}
        icon={
          <svg width={190} height={190} viewBox="-95 -95 190 190">
            <circle r={90} fill="#1AA7D9" opacity={0.14} />
            <circle r={62} fill="#1AA7D9" opacity={0.3} />
            <circle r={34} fill="#1AA7D9" />
            <circle r={13} fill="#fff" />
          </svg>
        }
      />

      {/* kanan: kartu Masha, lalu peta */}
      {mashaOut < 1 ? (
        <div style={{...paper, position: 'absolute', left: 1000, top: 300, width: 800, height: 580, opacity: Math.min(1, masha * 2) * (1 - mashaOut), transform: `translateY(${(1 - masha) * 50}px) scale(${1 - mashaOut * 0.06})`}}>
          <div style={{position: 'absolute', left: 50, top: 50}}>
            <Portrait hero="masha" size={150} ring={C.coral} />
          </div>
          <div style={{position: 'absolute', left: 230, top: 56, fontFamily: F.sans, fontWeight: 900, fontSize: 70, color: C.ink, letterSpacing: -2}}>MASHA</div>
          <div style={{position: 'absolute', left: 230, top: 150}}>
            <Chip text="REVAMP" start={tM + 8} bg={C.coral} size={28} />
          </div>
          <div style={{position: 'absolute', left: 60, top: 250, fontFamily: F.sans, fontWeight: 700, fontSize: 36, color: C.inkSoft}}>Berserker dengan tiga HP bar</div>
          {[0, 1, 2].map((k) => (
            <div key={k} style={{position: 'absolute', left: 60, top: 320 + k * 64, width: 680, height: 28, borderRadius: 14, background: 'rgba(18,21,40,0.08)'}}>
              <div
                style={{
                  width: `${ramp(frame, tM + 10 + k * 8, tM + 40 + k * 8) * 100}%`,
                  height: '100%',
                  borderRadius: 14,
                  background: `linear-gradient(90deg, ${C.coral}, #FF8A8F)`,
                  boxShadow: `0 6px 20px ${C.coral}66`,
                }}
              />
            </div>
          ))}
          <div style={{position: 'absolute', left: 60, top: 520, fontFamily: F.sans, fontWeight: 500, fontSize: 26, color: C.muted}}>Skill 2 reset cooldown tiap satu bar HP habis</div>
          <Sticker text="VERSI LAMA: RIP" start={tRip} bg="#9CA3C7" fg="#fff" rotate={6} size={38} style={{right: 40, top: 80}} />
        </div>
      ) : null}
      <MapPanel left={1070} top={286} size={560} enter={map}>
        {frame >= tH - 10 ? (
          <g>
            <circle cx={PIT.x} cy={PIT.y} r={44 * pulse} fill="none" stroke="#2EE6C5" strokeWidth={4} opacity={0.9} />
            <image href={staticFile('icons/turtle.png')} x={PIT.x - 28} y={PIT.y - 28} width={56} height={56} />
          </g>
        ) : null}
        {frame >= tG ? (
          <g opacity={ramp(frame, tG, tG + 14)}>
            <Tower x={335} y={50} s={0.9} color="#FFD166" />
            <Tower x={72} y={72} s={0.9} color="#FFD166" />
          </g>
        ) : null}
        {frame >= tW ? (
          <g>
            <circle cx={256} cy={256} r={190 * wisp} fill="none" stroke="#7FDBFF" strokeWidth={4} opacity={0.6 * (1 - wisp * 0.4)} />
            <circle cx={256} cy={256} r={26} fill="#7FDBFF" opacity={0.35} />
            <circle cx={256} cy={256} r={12} fill="#fff" />
            {[
              [340, 340],
              [210, 120],
              [380, 200],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={11} fill="#FF6B6B" opacity={ramp(frame, tW + 26 + i * 8, tW + 40 + i * 8)} />
            ))}
          </g>
        ) : null}
      </MapPanel>
      <div style={{position: 'absolute', left: 1070, top: 230, opacity: map}}>
        <Chip text="AKTIF 28 SEPTEMBER 2026" start={tMap + 6} bg={C.yellow} fg={C.ink} size={24} />
      </div>
      <Sticker
        text="TRANSPARAN"
        start={tTr}
        bg={C.teal}
        fg="#fff"
        rotate={-4}
        size={46}
        style={{left: 620, top: 790, opacity: 1 - ramp(frame, tTr + 60, tTr + 76)}}
      />
      <BigWord text="RIP." start={tRip} dur={26} color="#7A7F94" size={300} top={340} />
    </Shell>
  );
};

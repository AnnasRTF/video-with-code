import React from 'react';
import {Easing, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeCue} from '../cue';
import {focus, unfocus} from '../fx';
import {C, F} from '../theme';
import {Chip, Cursor, Float, Marquee, night, paper, ramp, RiseText, Saber, SaberDefs, SceneProps, Shell, Slash, Sticker, Title, useEnter} from '../ui';

const ItemIcon: React.FC<{item: string; size: number; color: string}> = ({item, size, color}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.24,
      padding: 4,
      background: `linear-gradient(145deg, ${color}, #fff)`,
      boxShadow: `0 14px 34px ${color}55`,
      boxSizing: 'border-box',
    }}
  >
    <Img src={staticFile(`items/${item}.png`)} style={{width: '100%', height: '100%', borderRadius: size * 0.2, display: 'block'}} />
  </div>
);

type CardItem = {img: string; name: string; tag?: string; tagBg?: string; start?: number};

const Card: React.FC<{
  x: number;
  start: number;
  phase: number;
  head: string;
  color: string;
  items: CardItem[];
  foot: string;
  children: React.ReactNode;
}> = ({x, start, phase, head, color, items, foot, children}) => {
  const p = useEnter(start);
  return (
    <div style={{position: 'absolute', left: x, top: 320, width: 520, height: 620, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 90}px)`}}>
      <Float phase={phase} tilt={x < 600 ? 7 : x > 1000 ? -7 : 0}>
        <div style={{...paper, width: 520, height: 620, position: 'relative', borderRadius: 40}}>
          <div style={{position: 'absolute', left: 36, top: 30}}>
            <Chip text={head} start={start + 4} bg={color} size={24} />
          </div>
          {items.length === 1 ? (
            <>
              <div style={{position: 'absolute', left: 36, top: 100}}>
                <ItemIcon item={items[0].img} size={132} color={color} />
              </div>
              <div style={{position: 'absolute', left: 190, top: 120, fontFamily: F.sans, fontWeight: 900, fontSize: 44, lineHeight: 1.05, color: C.ink, letterSpacing: -1.5}}>
                {items[0].name.split(' ').map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            </>
          ) : (
            items.map((it, i) => (
              <div key={it.img} style={{position: 'absolute', left: 36 + i * 228, top: 94}}>
                <ItemIcon item={it.img} size={92} color={color} />
                <div style={{marginTop: 8, fontFamily: F.sans, fontWeight: 900, fontSize: 21, color: C.ink, letterSpacing: -0.5, whiteSpace: 'nowrap'}}>{it.name}</div>
                <div style={{marginTop: 6}}>
                  <Chip text={it.tag ?? ''} start={it.start ?? start} bg={it.tagBg ?? color} size={17} />
                </div>
              </div>
            ))
          )}
          <div style={{...night, position: 'absolute', left: 36, top: 268, width: 448, height: 250, borderRadius: 26, overflow: 'hidden'}}>{children}</div>
          <div style={{position: 'absolute', left: 36, right: 36, top: 540, fontFamily: F.sans, fontWeight: 600, fontSize: 24, lineHeight: 1.25, color: C.inkSoft}}>{foot}</div>
        </div>
      </Float>
    </div>
  );
};

/** Blade Armor: serangan masuk, lalu sebagian damage memantul. */
const Reflect: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - start) % 78;
  const hit = ramp(t, 4, 26, Easing.inOut(Easing.cubic));
  const back = ramp(t, 30, 56, Easing.inOut(Easing.cubic));
  return (
    <svg width={448} height={250} style={{position: 'absolute', left: 0, top: 0}}>
      <SaberDefs />
      <text x={24} y={34} fill="rgba(255,255,255,0.55)" fontFamily={F.sans} fontWeight={800} fontSize={16} letterSpacing={3}>
        DAMAGE FISIK MASUK
      </text>
      <circle cx={58} cy={128} r={36} fill={C.nCoral} opacity={0.2} />
      <circle cx={58} cy={128} r={22} fill={C.nCoral} />
      <text x={58} y={196} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily={F.sans} fontWeight={700} fontSize={16}>
        MUSUH
      </text>
      <rect x={366} y={90} width={36} height={76} rx={10} fill={C.nTeal} opacity={0.9} />
      <text x={384} y={196} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontFamily={F.sans} fontWeight={700} fontSize={16}>
        KAMU
      </text>
      <Saber d="M 100 110 L 354 110" progress={hit} color={C.nCoral} width={6} />
      <Saber d="M 354 148 L 100 148" progress={back} color={C.nYellow} width={4} />
      <text x={228} y={230} textAnchor="middle" fill={C.nYellow} fontFamily={F.sans} fontWeight={900} fontSize={22} opacity={ramp(t, 40, 52)}>
        PANTUL 30% + SLOW
      </text>
    </svg>
  );
};

/** Radiant Armor: magic defense naik per stack. 40 dasar + 6 stack, tiap stack +6 (level rendah) sampai +20 (level tinggi). */
const Stairs: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const X0 = 64;
  const STEP = 56;
  const y = (v: number) => 208 - ((v - 30) / 140) * 150;
  const stair = (per: number) => {
    let d = `M ${X0} ${y(40)}`;
    for (let k = 1; k <= 6; k++) d += ` L ${X0 + k * STEP} ${y(40 + per * (k - 1))} L ${X0 + k * STEP} ${y(40 + per * k)}`;
    return d + ` L ${X0 + 6 * STEP + 24} ${y(40 + per * 6)}`;
  };
  const a = ramp(frame, start, start + 70, Easing.inOut(Easing.cubic));
  const b = ramp(frame, start + 8, start + 78, Easing.inOut(Easing.cubic));
  return (
    <svg width={448} height={250} style={{position: 'absolute', left: 0, top: 0}}>
      <SaberDefs />
      <text x={24} y={32} fill="rgba(255,255,255,0.55)" fontFamily={F.sans} fontWeight={800} fontSize={16} letterSpacing={3}>
        MAGIC DEFENSE
      </text>
      {[40, 76, 160].map((v) => (
        <g key={v}>
          <line x1={X0} x2={420} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.14)" strokeWidth={1.5} strokeDasharray="4 8" />
          <text x={X0 - 10} y={y(v) + 6} textAnchor="end" fill="rgba(255,255,255,0.5)" fontFamily={F.sans} fontWeight={700} fontSize={16}>
            {v}
          </text>
        </g>
      ))}
      <Saber d={stair(20)} progress={b} color={C.nViolet} width={5} />
      <Saber d={stair(6)} progress={a} color={C.nTeal} width={5} />
      <text x={X0 + 6 * STEP + 28} y={y(160) - 12} textAnchor="end" fill={C.nViolet} fontFamily={F.sans} fontWeight={900} fontSize={22} opacity={ramp(frame, start + 70, start + 80)}>
        +20 / stack
      </text>
      <text x={X0 + 6 * STEP + 28} y={y(76) - 12} textAnchor="end" fill={C.nTeal} fontFamily={F.sans} fontWeight={900} fontSize={22} opacity={ramp(frame, start + 66, start + 76)}>
        +6 / stack
      </text>
      <text x={228} y={238} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontFamily={F.sans} fontWeight={600} fontSize={15}>
        6 stack, 1 stack tiap 0,4 detik, tahan 5 detik
      </text>
    </svg>
  );
};

/** Anti-heal: shield dan HP regen musuh turun jadi 60%. */
const Lifebane: React.FC<{start: number}> = ({start}) => {
  const frame = useCurrentFrame();
  const drop = ramp(frame, start, start + 40, Easing.inOut(Easing.cubic));
  const pct = 100 - 40 * drop;
  const W = 400;
  return (
    <svg width={448} height={250} style={{position: 'absolute', left: 0, top: 0}}>
      <SaberDefs />
      <text x={24} y={32} fill="rgba(255,255,255,0.55)" fontFamily={F.sans} fontWeight={800} fontSize={16} letterSpacing={3}>
        SHIELD + HP REGEN MUSUH
      </text>
      <text x={24} y={128} fill={drop > 0.5 ? C.nCoral : '#fff'} fontFamily={F.sans} fontWeight={900} fontSize={96} letterSpacing={-4}>
        {Math.round(pct)}%
      </text>
      <rect x={24} y={156} width={W} height={26} rx={13} fill="rgba(255,255,255,0.1)" />
      <rect x={24} y={156} width={(W * pct) / 100} height={26} rx={13} fill={drop > 0.5 ? C.nCoral : C.nTeal} />
      <Saber d={`M ${24 + W * 0.6} 146 L ${24 + W * 0.6} 192`} progress={ramp(frame, start + 30, start + 44)} color={C.nYellow} width={4} head={false} />
      <text x={24} y={220} fill="rgba(255,255,255,0.55)" fontFamily={F.sans} fontWeight={600} fontSize={15}>
        Lifebane: anti-heal dari Sea Halberd dan Dominance Ice
      </text>
    </svg>
  );
};

/** Scene 7: item, build sesuai lawan. */
export const Items: React.FC<SceneProps> = ({vo, a, audio, dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cue = makeCue(vo, a, fps);
  const tHafal = cue('jangan build');
  const tSesuai = cue('Build sesuai lawan');
  const tFisik = cue('Banyak damage fisik');
  const tSihir = cue('Banyak damage sihir');
  const tHeal = cue('Musuh punya healing');
  const tSea = cue('Sea Halberd buat');
  const tDom = cue('Dominance Ice kalau');
  const tAudit = cue('Build asal-asalan');

  const intro = 1 - ramp(frame, tFisik - 8, tFisik + 10);
  const slash = ramp(frame, tSesuai - 6, tSesuai + 12, Easing.inOut(Easing.cubic));
  return (
    <Shell
      vo={vo}
      index={7}
      label="Item"
      audio={audio}
      dur={dur}
      cam={{
        keys: [focus(tFisik + 16, 380, 620, 1.12, 0.55), focus(tSihir + 16, 960, 620, 1.12, 0.55), focus(tHeal + 16, 1540, 620, 1.12, 0.55), unfocus(tAudit - 10)],
        hits: [{f: tSesuai, amp: 20, flash: true}, {f: tFisik, amp: 10}, {f: tSihir, amp: 10}, {f: tHeal, amp: 10}, {f: tAudit, amp: 14}],
      }}
    >
      <Title text="Item: sesuai lawan" />
      {intro > 0.01 ? (
        <div style={{position: 'absolute', left: 120, top: 360, opacity: intro, transform: `translateY(${(1 - intro) * -40}px)`}}>
          <Slash progress={slash}>
            <RiseText text="BUILD URUT HAFALAN" start={tHafal} size={118} color={C.muted} />
          </Slash>
          <div style={{marginTop: 70}}>
            <Marquee start={tSesuai + 14} color={C.accent}>
              <RiseText text="BUILD SESUAI LAWAN!" start={tSesuai} size={146} color={C.ink} fringe />
            </Marquee>
          </div>
        </div>
      ) : null}
      {intro > 0.01 ? <Cursor from={[1500, 380]} to={[1700, 728]} start={tSesuai + 6} /> : null}
      <Card
        x={120}
        start={tFisik}
        phase={0}
        head="DAMAGE FISIK BANYAK"
        color={C.coral}
        items={[{img: 'blade_armor', name: 'Blade Armor'}]}
        foot="1910 gold, +70 Physical Defense. Basic attack ke lo kena pantulan."
      >
        <Reflect start={tFisik + 20} />
      </Card>
      <Card
        x={700}
        start={tSihir}
        phase={1.3}
        head="DAMAGE SIHIR BANYAK"
        color={C.blue}
        items={[{img: 'radiant_armor', name: 'Radiant Armor'}]}
        foot="1880 gold, +40 Magic Defense. Makin sering kena sihir, makin tebal."
      >
        <Stairs start={tSihir + 20} />
      </Card>
      <Card
        x={1280}
        start={tHeal}
        phase={2.6}
        head="MUSUH HEAL ATAU SHIELD"
        color={C.teal}
        items={[
          {img: 'sea_halberd', name: 'Sea Halberd', tag: 'HERO FISIK', tagBg: C.coral, start: tSea},
          {img: 'dominance_ice', name: 'Dominance Ice', tag: 'TANK', tagBg: C.blue, start: tDom},
        ]}
        foot="Anti-heal itu wajib, bukan opsional."
      >
        <Lifebane start={tSea} />
      </Card>
      <Sticker text="ANGGARAN TANPA AUDIT" start={tAudit} bg={C.yellow} rotate={-3} size={40} style={{right: 130, top: 150}} />
    </Shell>
  );
};

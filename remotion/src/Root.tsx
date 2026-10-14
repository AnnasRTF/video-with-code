import {getAudioDurationInSeconds} from '@remotion/media-utils';
import React from 'react';
import {AbsoluteFill, Audio, Composition, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {estimateSeconds, sceneFrames, sceneVo} from './cue';
import {loadFonts} from './fonts';
import {Hero} from './scenes/Hero';
import {Freeze} from './scenes/Freeze';
import {Hook} from './scenes/Hook';
import {Items} from './scenes/Items';
import {Meta} from './scenes/Meta';
import {Counter, PickDuluan} from './scenes/Draft';
import {Outro} from './scenes/Outro';
import {Rotasi} from './scenes/Rotasi';
import {Tugas} from './scenes/Tugas';
import {C} from './theme';
import {GlobalOffset, Sfx} from './fx';
import {Asterisk, SaberDefs, SceneProps} from './ui';

loadFonts();

const FPS = 30;
/** Tumpang tindih antar scene = TAIL scene sebelumnya (0,7 detik). */
const OV = Math.round(0.7 * FPS);
/** Frame (dalam transisi) saat scene baru muncul di balik bentuk hitam. */
const SWITCH = 9;

const SCENES: {id: string; component: React.FC<SceneProps>}[] = [
  {id: 'Scene01', component: Hook},
  {id: 'Scene02', component: Tugas},
  {id: 'Scene03', component: Meta},
  {id: 'Scene04', component: Hero},
  {id: 'Scene05', component: PickDuluan},
  {id: 'Scene06', component: Counter},
  {id: 'Scene07', component: Items},
  {id: 'Scene08', component: Freeze},
  {id: 'Scene09', component: Rotasi},
  {id: 'Scene10', component: Outro},
];

type Entry = SceneProps & {frames: number};

/** Durasi scene mengikuti file suaranya (assets/voice/scene_XX.mp3). Tanpa file, dipakai perkiraan dari jumlah kata. */
const loadEntry = async (index: number): Promise<Entry> => {
  const audio = `voice/scene_${String(index + 1).padStart(2, '0')}.mp3`;
  let a = estimateSeconds(index);
  let found: string | undefined;
  try {
    a = await getAudioDurationInSeconds(staticFile(audio));
    found = audio;
  } catch {
    // file suara belum ada
  }
  return {vo: sceneVo(index), a, audio: found, frames: sceneFrames(index, FPS, a)};
};

const meta = (index: number) => async () => {
  const e = await loadEntry(index);
  return {durationInFrames: e.frames, props: {vo: e.vo, a: e.a, audio: e.audio} as SceneProps};
};

const starts = (entries: Entry[]) => {
  const out: number[] = [];
  entries.forEach((e, i) => out.push(i === 0 ? 0 : out[i - 1] + entries[i - 1].frames - OV));
  return out;
};

const total = (entries: Entry[]) => starts(entries)[entries.length - 1] + entries[entries.length - 1].frames;

type Kind = 'blob' | 'stripes' | 'zoom' | 'iris' | 'diag' | 'glitch';
/** Jenis transisi di tiap sambungan: dari scene 1 ke 2, 2 ke 3, dan seterusnya. */
const KINDS: Kind[] = ['blob', 'diag', 'stripes', 'zoom', 'glitch', 'iris', 'stripes', 'diag', 'blob'];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = Easing.inOut(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

/** Membungkus satu scene: gaya masuk dari transisi sebelumnya dan gaya keluar ke transisi berikutnya. */
const SceneFrame: React.FC<{inKind?: Kind; outKind?: Kind; frames: number; children: React.ReactNode}> = ({inKind, outKind, frames, children}) => {
  const f = useCurrentFrame();
  const p = clamp01(f / OV);
  const q = clamp01((f - (frames - OV)) / OV);
  const style: React.CSSProperties = {};
  let visible = true;
  const filters: string[] = [];
  const transforms: string[] = [];
  if (inKind && p < 1) {
    const e = easeOut(p);
    if (inKind === 'blob' || inKind === 'stripes') visible = f >= SWITCH;
    if (inKind === 'zoom') {
      transforms.push(`scale(${0.7 + 0.3 * e})`);
      filters.push(`blur(${(1 - e) * 16}px)`);
      style.opacity = clamp01(p * 2.2);
    }
    if (inKind === 'iris') style.clipPath = `circle(${easeInOut(p) * 1300}px at 50% 50%)`;
    if (inKind === 'diag') {
      const X = -260 + easeInOut(p) * (1920 + 520);
      style.clipPath = `polygon(0px 0px, ${X + 260}px 0px, ${X - 260}px 1080px, 0px 1080px)`;
    }
    if (inKind === 'glitch') {
      const g = 1 - e;
      transforms.push(`translateX(${g * 900}px) skewX(${-g * 14}deg)`);
      filters.push(`drop-shadow(${g * 18}px 0 0 rgba(255,40,90,0.7)) drop-shadow(${-g * 18}px 0 0 rgba(0,170,255,0.7))`);
    }
  }
  if (outKind && q > 0) {
    const e = easeInOut(q);
    if (outKind === 'zoom') {
      transforms.push(`scale(${1 + 0.45 * e})`);
      filters.push(`blur(${e * 18}px)`);
      style.opacity = 1 - clamp01(q * 1.3);
    }
    if (outKind === 'glitch') {
      transforms.push(`translateX(${-e * 420}px) skewX(${e * 8}deg)`);
      filters.push(`drop-shadow(${e * 14}px 0 0 rgba(255,40,90,0.7)) drop-shadow(${-e * 14}px 0 0 rgba(0,170,255,0.7))`);
      style.opacity = 1 - 0.6 * e;
    }
  }
  return (
    <AbsoluteFill style={{...style, visibility: visible ? 'visible' : 'hidden', transform: transforms.join(' ') || undefined, filter: filters.join(' ') || undefined}}>
      {children}
    </AbsoluteFill>
  );
};

const BAR_COLORS = [C.ink, C.accent, C.ink, '#F5A524', C.ink, '#00A98F'];

/** Overlay tiap jenis transisi. Berjalan sepanjang OV frame, dihitung dari awal tumpang tindih. */
const Overlay: React.FC<{kind: Kind}> = ({kind}) => {
  const f = useCurrentFrame();
  const p = clamp01(f / OV);
  if (kind === 'blob') {
    const grow = interpolate(f, [0, SWITCH], [0.15, 8.5], {extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
    const after = interpolate(f, [SWITCH, OV], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
    return (
      <AbsoluteFill style={{opacity: 1 - after}}>
        <Asterisk x={960} y={540} scale={grow + after * 4} rot={f * 5} />
      </AbsoluteFill>
    );
  }
  if (kind === 'stripes') {
    const N = 6;
    const H = 1080 / N;
    return (
      <AbsoluteFill>
        {BAR_COLORS.map((c, i) => {
          const inP = easeOut(clamp01((f - i * 1.2) / 8));
          const outP = easeInOut(clamp01((f - SWITCH - i * 1.2) / 9));
          const dir = i % 2 ? 1 : -1;
          const x = (-1920 * dir) * (1 - inP) + 1920 * dir * outP;
          return (
            <div key={i} style={{position: 'absolute', left: 0, top: i * H, width: 1920, height: H + 1, background: c, transform: `translateX(${x}px)`, boxShadow: `${dir * 14}px 0 0 rgba(255,106,30,0.35), ${-dir * 14}px 0 0 rgba(47,107,255,0.35)`}} />
          );
        })}
      </AbsoluteFill>
    );
  }
  if (kind === 'zoom') {
    const flash = Math.exp(-Math.pow((f - 9) / 3.2, 2));
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: Math.sin(Math.PI * p)}}>
          {Array.from({length: 36}, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const r0 = 260 + 700 * p;
            const r1 = r0 + 520;
            return <line key={i} x1={960 + Math.cos(a) * r0} y1={540 + Math.sin(a) * r0} x2={960 + Math.cos(a) * r1} y2={540 + Math.sin(a) * r1} stroke={i % 3 ? C.ink : C.accent} strokeWidth={4 + (i % 4) * 2} strokeLinecap="round" opacity={0.5} />;
          })}
        </svg>
        <AbsoluteFill style={{background: '#fff', opacity: flash * 0.95}} />
      </AbsoluteFill>
    );
  }
  if (kind === 'iris') {
    const r = easeInOut(p) * 1300;
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 1 - clamp01((p - 0.8) / 0.2)}}>
        <SaberDefs />
        <circle cx={960} cy={540} r={r} fill="none" stroke={C.accent} strokeWidth={34} opacity={0.5} filter="url(#saberGlowWide)" />
        <circle cx={960} cy={540} r={r} fill="none" stroke={C.accent} strokeWidth={14} />
        <circle cx={960} cy={540} r={r} fill="none" stroke="#fff" strokeWidth={5} />
        <circle cx={960} cy={540} r={r * 0.82} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="10 18" opacity={0.6} />
      </svg>
    );
  }
  if (kind === 'diag') {
    const X = -260 + easeInOut(p) * (1920 + 520);
    return (
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: 1 - clamp01((p - 0.88) / 0.12)}}>
        <SaberDefs />
        {[0, -46, -92].map((o, i) => (
          <g key={i} opacity={1 - i * 0.3}>
            <line x1={X + 260 + o} y1={0} x2={X - 260 + o} y2={1080} stroke={C.accent} strokeWidth={30 - i * 8} opacity={0.5} filter="url(#saberGlowWide)" />
            <line x1={X + 260 + o} y1={0} x2={X - 260 + o} y2={1080} stroke={C.accent} strokeWidth={12 - i * 3} />
            <line x1={X + 260 + o} y1={0} x2={X - 260 + o} y2={1080} stroke="#fff" strokeWidth={4} />
          </g>
        ))}
      </svg>
    );
  }
  // glitch: potongan warna acak dan garis pindai
  const seed = (n: number) => Math.abs(Math.sin(n * 91.7 + f * 13.3)) % 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: Math.sin(Math.PI * p)}}>
      {Array.from({length: 14}, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: seed(i) * 1400,
            top: seed(i + 20) * 1080,
            width: 200 + seed(i + 40) * 900,
            height: 6 + seed(i + 60) * 46,
            background: [C.accent, '#00AAFF', C.ink, '#FF2A5A'][i % 4],
            opacity: 0.55,
            mixBlendMode: i % 2 ? 'multiply' : 'normal',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const Full: React.FC<{entries: Entry[]}> = ({entries}) => {
  const t = starts(entries);
  const frames = total(entries);
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Audio src={staticFile('music/bed.wav')} loop volume={(f) => interpolate(f, [0, 45, frames - 90, frames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * 0.13} />
      {entries.map((e, i) => {
        const Scene = SCENES[i].component;
        return (
          <Sequence key={SCENES[i].id} from={t[i]} durationInFrames={e.frames}>
            <GlobalOffset.Provider value={t[i]}>
              <SceneFrame inKind={i ? KINDS[i - 1] : undefined} outKind={i < KINDS.length ? KINDS[i] : undefined} frames={e.frames}>
                <Scene vo={e.vo} a={e.a} audio={e.audio} dur={e.frames} />
              </SceneFrame>
            </GlobalOffset.Provider>
          </Sequence>
        );
      })}
      {entries.slice(1).map((_, i) => (
        <Sequence key={`t${i}`} from={t[i + 1]} durationInFrames={OV}>
          <Sfx name={KINDS[i] === 'glitch' ? 'zap' : 'whoosh'} at={0} volume={0.5} />
          {KINDS[i] === 'blob' || KINDS[i] === 'stripes' || KINDS[i] === 'zoom' ? <Sfx name="impact" at={SWITCH} volume={0.45} /> : null}
          <Overlay kind={KINDS[i]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const estimateEntries = (): Entry[] =>
  SCENES.map((_, i) => ({vo: sceneVo(i), a: estimateSeconds(i), frames: sceneFrames(i, FPS)}));

export const Root: React.FC = () => (
  <>
    <Composition
      id="Full"
      component={Full}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={total(estimateEntries())}
      defaultProps={{entries: estimateEntries()}}
      calculateMetadata={async () => {
        const entries = await Promise.all(SCENES.map((_, i) => loadEntry(i)));
        return {durationInFrames: total(entries), props: {entries}};
      }}
    />
    {SCENES.map((s, i) => (
      <Composition
        key={s.id}
        id={s.id}
        component={s.component}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={sceneFrames(i, FPS)}
        defaultProps={{vo: sceneVo(i), a: estimateSeconds(i)} as SceneProps}
        calculateMetadata={meta(i)}
      />
    ))}
  </>
);

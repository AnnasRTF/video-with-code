import {getAudioDurationInSeconds} from '@remotion/media-utils';
import React from 'react';
import {AbsoluteFill, Composition, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
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
import {Asterisk, SceneProps} from './ui';

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

/** Scene baru disembunyikan sampai bentuk hitam menutup layar. */
const Gate: React.FC<{from: number; children: React.ReactNode}> = ({from, children}) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{visibility: frame < from ? 'hidden' : 'visible'}}>{children}</AbsoluteFill>;
};

/** Transisi: bentuk hitam membesar sampai menutup layar, lalu memudar dan memperlihatkan scene berikutnya. */
const Blob: React.FC = () => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [0, SWITCH], [0.15, 8.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const after = interpolate(frame, [SWITCH, OV], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  return (
    <AbsoluteFill style={{opacity: 1 - after}}>
      <Asterisk x={960} y={540} scale={grow + after * 4} rot={frame * 5} />
    </AbsoluteFill>
  );
};

const Full: React.FC<{entries: Entry[]}> = ({entries}) => {
  const t = starts(entries);
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {entries.map((e, i) => {
        const Scene = SCENES[i].component;
        return (
          <Sequence key={SCENES[i].id} from={t[i]} durationInFrames={e.frames}>
            <Gate from={i === 0 ? 0 : SWITCH}>
              <Scene vo={e.vo} a={e.a} audio={e.audio} dur={e.frames} />
            </Gate>
          </Sequence>
        );
      })}
      {entries.slice(1).map((_, i) => (
        <Sequence key={`t${i}`} from={t[i + 1]} durationInFrames={OV}>
          <Blob />
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

import {getAudioDurationInSeconds} from '@remotion/media-utils';
import React from 'react';
import {Composition, staticFile} from 'remotion';
import {estimateSeconds, sceneFrames, sceneVo} from './cue';
import {loadFonts} from './fonts';
import {Hero, SceneProps} from './scenes/Hero';

loadFonts();

const FPS = 30;

/** Durasi scene mengikuti file suaranya (assets/voice/scene_XX.mp3). Tanpa file, dipakai perkiraan dari jumlah kata. */
const meta = (index: number) => async () => {
  const audio = `voice/scene_${String(index + 1).padStart(2, '0')}.mp3`;
  let a = estimateSeconds(index);
  let found: string | undefined;
  try {
    a = await getAudioDurationInSeconds(staticFile(audio));
    found = audio;
  } catch {
    // file suara belum ada
  }
  return {durationInFrames: sceneFrames(index, FPS, a), props: {vo: sceneVo(index), a, audio: found} as SceneProps};
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Scene04"
      component={Hero}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={sceneFrames(3, FPS)}
      defaultProps={{vo: sceneVo(3), a: estimateSeconds(3)} as SceneProps}
      calculateMetadata={meta(3)}
    />
  </>
);

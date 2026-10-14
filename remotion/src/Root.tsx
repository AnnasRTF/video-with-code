import React from 'react';
import {Composition} from 'remotion';
import {estimateSeconds, sceneFrames, sceneVo} from './cue';
import {loadFonts} from './fonts';
import {Hero, SceneProps} from './scenes/Hero';

loadFonts();

const FPS = 30;

const scene = (index: number) => ({
  durationInFrames: sceneFrames(index, FPS),
  defaultProps: {vo: sceneVo(index), a: estimateSeconds(index)} as SceneProps,
});

export const Root: React.FC = () => (
  <>
    <Composition id="Scene04" component={Hero} width={1920} height={1080} fps={FPS} {...scene(3)} />
  </>
);

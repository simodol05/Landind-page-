import { Composition } from 'remotion';
import { SLReel } from './SLReel';
import { FPS, TOTAL_SECONDS } from './timeline';

export const Root: React.FC = () => (
  <Composition
    id="SLReel"
    component={SLReel}
    durationInFrames={Math.round(TOTAL_SECONDS * FPS)}
    fps={FPS}
    width={1080}
    height={1920}
  />
);

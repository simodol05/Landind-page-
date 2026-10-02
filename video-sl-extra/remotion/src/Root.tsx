import { Composition } from 'remotion';
import { SLExtra } from './SLExtra';
import TL from './timeline.json';

export const Root: React.FC = () => (
  <Composition
    id="SLExtra"
    component={SLExtra}
    durationInFrames={Math.round(TL.total * TL.fps)}
    fps={TL.fps}
    width={1080}
    height={1350}
  />
);

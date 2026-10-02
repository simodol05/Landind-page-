import { Composition } from 'remotion';
import { SLAbyssa } from './SLAbyssa';
import TL from './timeline.json';

const frames = Math.round(TL.total * TL.fps);

export const Root: React.FC = () => (
  // feed Instagram / TikTok 4:5
  <Composition id="SLAbyssa" component={SLAbyssa} durationInFrames={frames} fps={TL.fps} width={1080} height={1350} />
);

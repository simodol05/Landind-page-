import { Composition } from 'remotion';
import { SLExtra } from './SLExtra';
import TL from './timeline.json';

const frames = Math.round(TL.total * TL.fps);

export const Root: React.FC = () => (
  <>
    {/* feed Instagram / LinkedIn */}
    <Composition id="SLExtra" component={SLExtra} defaultProps={{ format: '4x5' as const }}
      durationInFrames={frames} fps={TL.fps} width={1080} height={1350} />
    {/* TikTok / Reel Instagram */}
    <Composition id="SLExtra916" component={SLExtra} defaultProps={{ format: '9x16' as const }}
      durationInFrames={frames} fps={TL.fps} width={1080} height={1920} />
  </>
);

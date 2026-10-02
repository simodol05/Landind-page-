import { Composition } from 'remotion';
import { SLAbyssa } from './SLAbyssa';
import TL from './timeline.json';

const frames = Math.round(TL.total * TL.fps);

export const Root: React.FC = () => (
  <>
    {/* feed Instagram 4:5 */}
    <Composition id="SLAbyssa" component={SLAbyssa} defaultProps={{ format: '4x5' as const }}
      durationInFrames={frames} fps={TL.fps} width={1080} height={1350} />
    {/* TikTok / Reel Instagram 9:16 */}
    <Composition id="SLAbyssa916" component={SLAbyssa} defaultProps={{ format: '9x16' as const }}
      durationInFrames={frames} fps={TL.fps} width={1080} height={1920} />
  </>
);

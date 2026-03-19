import { Composition } from 'remotion';
import { FMCGPromo } from './FMCGPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FMCGPromo"
      component={FMCGPromo}
      durationInFrames={600}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

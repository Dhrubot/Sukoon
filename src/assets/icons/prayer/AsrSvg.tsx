import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Asr (Afternoon) — sun with long shadow indicator
const AsrSvg: React.FC<Props> = ({ size = 24, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="10"
      r="4"
      stroke={color}
      strokeWidth="1.8"
    />
    <Path
      d="M12 2v2M4.93 4.93l1.41 1.41M2 10h2M20 10h2M17.66 6.34l1.41-1.41"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <Path
      d="M8 22l4-8 4 8"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.5}
    />
  </Svg>
);

export default AsrSvg;

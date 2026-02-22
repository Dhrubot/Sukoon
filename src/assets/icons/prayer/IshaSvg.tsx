import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Isha (Night) — crescent moon with stars
const IshaSvg: React.FC<Props> = ({ size = 24, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="18" cy="5" r="0.8" fill={color} />
    <Circle cx="20" cy="9" r="0.6" fill={color} />
  </Svg>
);

export default IshaSvg;

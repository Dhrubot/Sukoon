import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Fajr (Dawn) — crescent moon with first light rays
const FajrSvg: React.FC<Props> = ({ size = 24, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 17h2M5.5 13l1.5 1M19 17h2"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

export default FajrSvg;

import React from 'react';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
  secondaryColor?: string;
}

const StillnessLeafSvg: React.FC<Props> = ({
  size = 84,
  color = '#4ade80',
  secondaryColor = '#dcfce7',
}) => (
  <Svg width={size} height={size} viewBox="0 0 84 84" fill="none">
    <Defs>
      <LinearGradient id="leafPrimary" x1="20" y1="14" x2="62" y2="62" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={secondaryColor} />
        <Stop offset="1" stopColor={color} />
      </LinearGradient>
      <LinearGradient id="leafSecondary" x1="44" y1="18" x2="66" y2="52" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={secondaryColor} />
        <Stop offset="1" stopColor={color} />
      </LinearGradient>
    </Defs>
    <Path
      d="M41 58C41.2 47.5 43.8 40.3 49.2 32.4C52.4 27.6 56.3 23.7 60.5 20.4"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
    />
    <Path
      d="M41.2 58.2C38.3 51.8 34.7 46.8 29.2 42.4C25.5 39.5 21.8 37.6 18.2 36.4"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      opacity="0.9"
    />
    <Ellipse
      cx="28.5"
      cy="32.5"
      rx="14"
      ry="9.5"
      transform="rotate(-32 28.5 32.5)"
      fill="url(#leafPrimary)"
      stroke={color}
      strokeWidth="1.5"
    />
    <Path
      d="M20.5 38.2C25 34.6 29.8 30.4 36.4 25.1"
      stroke={secondaryColor}
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.95"
    />
    <Ellipse
      cx="57"
      cy="27"
      rx="11.5"
      ry="8"
      transform="rotate(28 57 27)"
      fill="url(#leafSecondary)"
      stroke={color}
      strokeWidth="1.5"
    />
    <Path
      d="M50.4 21.7C53.4 23.8 57.5 26.7 62.6 31"
      stroke={secondaryColor}
      strokeWidth="1.8"
      strokeLinecap="round"
      opacity="0.95"
    />
  </Svg>
);

export default StillnessLeafSvg;

// src/components/garden/MiniTubaTree.tsx
//
// Phase 3: A simplified tree silhouette used in the GardenTeaser
// and any other compact contexts. Reads theme colors and prayer
// colors to render a tiny version of the Tuba Tree.

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { MINI_TREE } from '../../constants/tubaTree';

interface MiniTubaTreeProps {
  size?: number;
  /** Number of active branches to highlight (0–5) */
  activeBranches?: number;
}

/**
 * Compact tree icon that reflects the user's prayer activity.
 * `activeBranches` controls how many of the 5 branches are
 * rendered in the active color (rest are muted).
 */
const MiniTubaTree: React.FC<MiniTubaTreeProps> = ({
  size = 48,
  activeBranches = 5,
}) => {
  const { theme } = useTheme();
  const { viewBox, trunk, branches, roots } = MINI_TREE;

  const trunkColor = theme.colors.garden.trunk;
  const activeColor = theme.colors.interactive.active;
  const mutedColor = theme.colors.text.muted + '40';

  // Prayer colors in fard order for branch coloring
  const prayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  return (
    <Svg
      width={size}
      height={size * (viewBox.height / viewBox.width)}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
    >
      {/* Roots */}
      {roots.map((d, i) => (
        <Path
          key={`root-${i}`}
          d={d}
          stroke={trunkColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={0.4}
        />
      ))}

      {/* Trunk */}
      <Path
        d={trunk}
        stroke={trunkColor}
        strokeWidth={3.5}
        fill="none"
        strokeLinecap="round"
      />

      {/* Branches — colored by prayer or muted */}
      {branches.map((d, i) => {
        const isActive = i < activeBranches;
        const prayerKey = prayerKeys[i] as keyof typeof theme.colors.prayer;
        const color = isActive
          ? (theme.colors.prayer?.[prayerKey] || activeColor)
          : mutedColor;

        return (
          <Path
            key={`branch-${i}`}
            d={d}
            stroke={color}
            strokeWidth={isActive ? 2.5 : 1.5}
            fill="none"
            strokeLinecap="round"
            opacity={isActive ? 0.85 : 0.35}
          />
        );
      })}
    </Svg>
  );
};

export default React.memo(MiniTubaTree);
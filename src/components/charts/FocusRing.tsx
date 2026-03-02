// src/components/charts/FocusRing.tsx
//
// Replaces LineChart for focus trend.
// Shows a circular arc ring with the average focus score (0–100)
// and small dots around the ring for daily values.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface FocusRingProps {
  /** Array of daily focus scores (0–100) */
  data: number[];
  /** Average focus score to display in center */
  average: number;
}

const SIZE = 160;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const FocusRing: React.FC<FocusRingProps> = ({ data, average }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const normalizedAvg = Math.min(Math.max(average, 0), 100);
  const progress = normalizedAvg / 100;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Small dots for daily values around the outer edge
  const dotRadius = 3;
  const dotOrbitRadius = RADIUS + STROKE_WIDTH / 2 + 8;

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
        <Svg width={SIZE + 20} height={SIZE + 20} viewBox={`-10 -10 ${SIZE + 20} ${SIZE + 20}`}>
          {/* Background track */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="transparent"
            stroke={theme.colors.border.primary}
            strokeWidth={STROKE_WIDTH}
            opacity={0.3}
          />
          {/* Progress arc */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="transparent"
            stroke={theme.colors.interactive.active}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
          {/* Daily dots */}
          {data.map((score, i) => {
            const angle = ((i / Math.max(data.length - 1, 1)) * 270 - 135) * (Math.PI / 180);
            const cx = CENTER + dotOrbitRadius * Math.cos(angle);
            const cy = CENTER + dotOrbitRadius * Math.sin(angle);
            const dotOpacity = score > 0 ? 0.4 + (score / 100) * 0.6 : 0.15;

            return (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={dotRadius}
                fill={theme.colors.interactive.active}
                opacity={dotOpacity}
              />
            );
          })}
        </Svg>

        {/* Center label */}
        <View style={styles.centerLabel}>
          <Text style={[styles.scoreValue, { color: theme.colors.text.primary }]}>
            {normalizedAvg > 0 ? normalizedAvg.toFixed(0) : '—'}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.text.muted }]}>
            focus
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    ringWrapper: {
      width: SIZE + 20,
      height: SIZE + 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    scoreValue: {
      fontSize: 32,
      fontFamily: theme.typography.fontFamily.bodyBold,
    },
    scoreLabel: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: 2,
    },
  });

export default React.memo(FocusRing);

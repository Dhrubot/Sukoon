// src/components/charts/PrayerDotGrid.tsx
//
// Replaces BarChart for weekly prayer progress.
// Shows a 7-column dot grid where each column is a day (Sun–Sat)
// and dots represent the number of prayers completed (0–5).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface PrayerDotGridProps {
  /** Array of 7 numbers (Sun–Sat), each 0–5 representing prayers completed */
  data: number[];
  labels?: string[];
}

const DOT_RADIUS = 5;
const DOT_GAP = 14;
const MAX_ROWS = 5;
const COLS = 7;
const COL_WIDTH = 44;
const GRID_HEIGHT = MAX_ROWS * DOT_GAP + DOT_RADIUS * 2;
const GRID_WIDTH = COLS * COL_WIDTH;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PrayerDotGrid: React.FC<PrayerDotGridProps> = ({ data, labels = DAY_LABELS }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Svg width={GRID_WIDTH} height={GRID_HEIGHT} viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}>
        {Array.from({ length: COLS }).map((_, col) => {
          const completed = Math.min(data[col] || 0, MAX_ROWS);
          const cx = col * COL_WIDTH + COL_WIDTH / 2;

          return Array.from({ length: MAX_ROWS }).map((_, row) => {
            const cy = (MAX_ROWS - 1 - row) * DOT_GAP + DOT_RADIUS;
            const isFilled = row < completed;

            return (
              <Circle
                key={`${col}-${row}`}
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                fill={isFilled ? theme.colors.interactive.active : 'transparent'}
                stroke={isFilled ? theme.colors.interactive.active : theme.colors.border.primary}
                strokeWidth={1.5}
                opacity={isFilled ? 1 : 0.4}
              />
            );
          });
        })}
      </Svg>
      <View style={styles.labelRow}>
        {labels.map((label, i) => (
          <Text key={label} style={[styles.label, { color: theme.colors.text.muted, width: COL_WIDTH }]}>
            {label}
          </Text>
        ))}
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
    labelRow: {
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
    },
    label: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.body,
      textAlign: 'center',
    },
  });

export default React.memo(PrayerDotGrid);

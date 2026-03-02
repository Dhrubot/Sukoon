// src/components/charts/PrayerBreakdownBar.tsx
//
// Replaces PieChart for prayer breakdown.
// Shows a horizontal stacked bar with prayer-colored segments
// and a legend below.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// Uses View-based rendering for the stacked bar segments
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface BreakdownItem {
  name: string;
  count: number;
  color: string;
}

interface PrayerBreakdownBarProps {
  data: BreakdownItem[];
}

const BAR_HEIGHT = 28;
const BAR_RADIUS = 14;

const PrayerBreakdownBar: React.FC<PrayerBreakdownBarProps> = ({ data }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return null;

  // Calculate segment widths as percentages
  const segments = data.map((item) => ({
    ...item,
    pct: item.count / total,
  }));

  return (
    <View style={styles.container}>
      {/* Stacked bar */}
      <View style={styles.barWrapper}>
        <View style={styles.barRow}>
          {segments.map((seg, i) => (
            <View
              key={seg.name}
              style={[
                styles.segment,
                {
                  flex: seg.pct,
                  backgroundColor: seg.color,
                  borderTopLeftRadius: i === 0 ? BAR_RADIUS : 0,
                  borderBottomLeftRadius: i === 0 ? BAR_RADIUS : 0,
                  borderTopRightRadius: i === segments.length - 1 ? BAR_RADIUS : 0,
                  borderBottomRightRadius: i === segments.length - 1 ? BAR_RADIUS : 0,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg) => (
          <View key={seg.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={[styles.legendLabel, { color: theme.colors.text.secondary }]}>
              {seg.name}
            </Text>
            <Text style={[styles.legendCount, { color: theme.colors.text.muted }]}>
              {seg.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.md,
    },
    barWrapper: {
      marginBottom: theme.spacing.md,
    },
    barRow: {
      flexDirection: 'row',
      height: BAR_HEIGHT,
      borderRadius: BAR_RADIUS,
      overflow: 'hidden',
    },
    segment: {
      height: BAR_HEIGHT,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    legendCount: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.body,
    },
  });

export default React.memo(PrayerBreakdownBar);

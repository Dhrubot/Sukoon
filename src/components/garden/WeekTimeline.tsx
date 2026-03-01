// src/components/garden/WeekTimeline.tsx
//
// Week view showing prayer activity as colored dots instead of emoji.
// Each prayer maps to its theme color (theme.colors.prayer.*).
// Multi-prayer days show a 2×2 dot cluster.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { WeekDay } from '../../types/garden';

interface WeekTimelineProps {
  weekSummary: WeekDay[];
}

const WeekTimeline: React.FC<WeekTimelineProps> = ({ weekSummary }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  /**
   * Resolve prayer color from theme.colors.prayer.
   * Falls back to primary color if prayer key not found.
   */
  const getPrayerColor = (prayer: string): string => {
    const key = prayer.toLowerCase() as keyof typeof theme.colors.prayer;
    return theme.colors.prayer?.[key] || theme.colors.primary.DEFAULT;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        This Week
      </Text>
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.garden.cardBg,
            borderColor: theme.colors.garden.soilBorder,
          },
        ]}
      >
        {weekSummary.map((day) => (
          <View key={day.date} style={styles.dayColumn}>
            {/* Dot container — shows prayer dots or empty state */}
            <View
              style={[
                styles.dotContainer,
                day.isToday && {
                  borderColor: theme.colors.garden.todayRing,
                  borderWidth: 1.5,
                },
              ]}
            >
              {day.plants.length === 0 ? (
                // Empty day — single dim dot
                <View
                  style={[
                    styles.emptyDot,
                    { backgroundColor: theme.colors.garden.emptyDot },
                  ]}
                />
              ) : day.plants.length === 1 ? (
                // Single prayer — one centered dot
                <View
                  style={[
                    styles.prayerDot,
                    styles.prayerDotLarge,
                    { backgroundColor: getPrayerColor(day.plants[0].prayer) },
                  ]}
                />
              ) : (
                // Multiple prayers — 2×2 grid of colored dots
                <View style={styles.dotGrid}>
                  {day.plants.slice(0, 4).map((plant, i) => (
                    <View
                      key={`${day.date}-${plant.prayer}-${i}`}
                      style={[
                        styles.prayerDot,
                        { backgroundColor: getPrayerColor(plant.prayer) },
                      ]}
                    />
                  ))}
                  {/* Fill remaining grid slots with empty space */}
                  {day.plants.length < 4 &&
                    Array.from({ length: 4 - Math.min(day.plants.length, 4) }).map(
                      (_, i) => (
                        <View key={`empty-${i}`} style={styles.prayerDotEmpty} />
                      ),
                    )}
                </View>
              )}
            </View>

            {/* Day label */}
            <Text
              style={[
                styles.dayLabel,
                {
                  color: day.isToday
                    ? theme.colors.interactive.active
                    : theme.colors.text.muted,
                },
                day.isToday && styles.dayLabelToday,
              ]}
            >
              {day.dayLabel}
            </Text>

            {/* Prayer count indicator */}
            {day.plants.length > 0 && (
              <Text
                style={[
                  styles.dayCount,
                  { color: theme.colors.interactive.active },
                ]}
              >
                +{day.plants.length}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      marginBottom: theme.spacing.md - 2,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
    },
    dayColumn: {
      alignItems: 'center',
      flex: 1,
    },

    // Dot container — houses the prayer dots or empty dot
    dotContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0,
      borderColor: 'transparent',
    },

    // Empty day indicator
    emptyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    // Individual prayer dot
    prayerDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    prayerDotLarge: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    prayerDotEmpty: {
      width: 7,
      height: 7,
      // Invisible spacer for grid alignment
    },

    // 2×2 grid for multi-prayer days
    dotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 20,
      gap: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Day labels
    dayLabel: {
      fontSize: theme.typography.fontSize.xs,
      marginTop: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.body,
    },
    dayLabelToday: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    dayCount: {
      fontSize: 9,
      marginTop: 1,
      fontFamily: theme.typography.fontFamily.body,
      opacity: 0.7,
    },
  });

export default React.memo(WeekTimeline);
// src/components/garden/WeekTimeline.tsx
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

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>This Week</Text>
      <View style={[styles.row, { backgroundColor: theme.colors.garden.cardBg, borderColor: theme.colors.garden.soilBorder }]}>
        {weekSummary.map((day) => (
          <View key={day.date} style={styles.dayColumn}>
            <View
              style={[
                styles.dotContainer,
                day.isToday && { borderColor: theme.colors.garden.todayRing, borderWidth: 2 },
              ]}
            >
              {day.plants.length > 0 ? (
                <Text style={styles.plantEmoji}>
                  {day.plants[0].emoji}
                </Text>
              ) : (
                <View style={[styles.emptyDot, { backgroundColor: theme.colors.garden.emptyDot }]} />
              )}
            </View>
            <Text
              style={[
                styles.dayLabel,
                { color: day.isToday ? theme.colors.primary.DEFAULT : theme.colors.text.muted },
                day.isToday && styles.dayLabelToday,
              ]}
            >
              {day.dayLabel}
            </Text>
            {day.plants.length > 1 && (
              <Text style={[styles.extraCount, { color: theme.colors.text.muted }]}>
                +{day.plants.length - 1}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
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
  dotContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  plantEmoji: {
    fontSize: theme.typography.fontSize['2xl'],
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.regular,
  },
  dayLabelToday: {
    fontWeight: theme.typography.fontWeight.semibold,
  },
  extraCount: {
    fontSize: 9,
    marginTop: 1,
  },
});

export default React.memo(WeekTimeline);

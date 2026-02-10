// src/components/garden/WeekTimeline.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { WeekDay } from '../../types/garden';

interface WeekTimelineProps {
  weekSummary: WeekDay[];
}

const WeekTimeline: React.FC<WeekTimelineProps> = ({ weekSummary }) => {
  const { theme } = useTheme();

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

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    fontSize: 20,
  },
  emptyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '400',
  },
  dayLabelToday: {
    fontWeight: '600',
  },
  extraCount: {
    fontSize: 9,
    marginTop: 1,
  },
});

export default React.memo(WeekTimeline);

// src/components/garden/ReflectionJournal.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { ReflectionEntry } from '../../types/garden';

interface ReflectionJournalProps {
  reflections: ReflectionEntry[];
}

const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ reflections }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (reflections.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        Recent Reflections
      </Text>

      {reflections.map((entry, index) => {
        const prayerColorKey = entry.prayer.toLowerCase() as keyof typeof theme.colors.prayer;
        const accentColor = theme.colors.prayer?.[prayerColorKey] || theme.colors.primary.DEFAULT;

        return (
          <View
            key={`${entry.date}-${entry.prayer}-${index}`}
            style={[
              styles.entry,
              {
                backgroundColor: theme.colors.garden.cardBg,
                borderLeftColor: accentColor,
                borderColor: theme.colors.garden.journalBorder,
              },
            ]}
          >
            <View style={styles.entryHeader}>
              <Text style={styles.entryEmoji}>{entry.emoji}</Text>
              <Text style={[styles.entryPrayer, { color: theme.colors.text.primary }]}>
                {entry.prayer}
              </Text>
              <Text style={[styles.entryDate, { color: theme.colors.text.muted }]}>
                · {entry.relativeDate}
              </Text>
            </View>

            {entry.text ? (
              <Text
                style={[styles.entryText, { color: theme.colors.text.secondary }]}
                numberOfLines={3}
              >
                "{entry.text}"
              </Text>
            ) : (
              <Text style={[styles.entryFallback, { color: theme.colors.text.muted }]}>
                Reflected ✓
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: theme.spacing.md,
  },
  entry: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.md - 2,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  entryEmoji: {
    fontSize: theme.typography.fontSize.xl,
    marginRight: theme.spacing.sm,
  },
  entryPrayer: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  entryDate: {
    fontSize: theme.typography.fontSize.xs,
    marginLeft: theme.spacing.xs + 2,
  },
  entryText: {
    fontSize: theme.typography.fontSize.md,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  entryFallback: {
    fontSize: theme.typography.fontSize.sm,
  },
});

export default React.memo(ReflectionJournal);

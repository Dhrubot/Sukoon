// src/components/garden/ReflectionJournal.tsx
//
// Updated: Replaced emoji with prayer-colored dot + growth stage indicator.
// Each entry now shows:
//   [colored dot] Prayer Name · relative date
//   Mood chip (seed/sprout/bloom with color)
//   Reflection text or "Reflected ✓"

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { ReflectionEntry } from '../../types/garden';

interface ReflectionJournalProps {
  reflections: ReflectionEntry[];
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Distracted',
  2: 'Rushed',
  3: 'Present',
  4: 'Focused',
  5: 'Deep khushoo',
};

const GROWTH_LABELS: Record<string, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  bloom: 'Bloom',
};

/** Derive growth stage from mood (same logic as service) */
const moodToStage = (mood: number): string => {
  if (mood <= 2) return 'seed';
  if (mood === 3) return 'sprout';
  return 'bloom';
};

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
        const stage = moodToStage(entry.mood);
        const isBloom = stage === 'bloom';

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
            {/* Header: colored dot + prayer name + date */}
            <View style={styles.entryHeader}>
              <View style={[styles.prayerDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.entryPrayer, { color: theme.colors.text.primary }]}>
                {entry.prayer}
              </Text>
              <Text style={[styles.entryDate, { color: theme.colors.text.muted }]}>
                · {entry.relativeDate}
              </Text>
            </View>

            {/* Mood + growth stage chips */}
            <View style={styles.chipRow}>
              {/* Mood chip */}
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: isBloom
                      ? theme.colors.garden.bloomGlow + '18'
                      : theme.colors.card.hover || accentColor + '12',
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipDot,
                    {
                      backgroundColor: isBloom
                        ? theme.colors.garden.bloomGlow
                        : accentColor,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isBloom
                        ? theme.colors.garden.bloomGlow
                        : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {MOOD_LABELS[entry.mood] || 'Reflected'}
                </Text>
              </View>

              {/* Growth stage chip */}
              <View
                style={[
                  styles.chip,
                  { backgroundColor: theme.colors.card.hover || accentColor + '08' },
                ]}
              >
                <Text style={[styles.chipText, { color: theme.colors.text.muted }]}>
                  {isBloom ? '✦ ' : ''}{GROWTH_LABELS[stage] || 'Seed'}
                </Text>
              </View>

              {/* Text indicator */}
              {entry.text && (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: theme.colors.card.hover || accentColor + '08' },
                  ]}
                >
                  <Text style={[styles.chipText, { color: theme.colors.text.muted }]}>
                    📝
                  </Text>
                </View>
              )}
            </View>

            {/* Reflection text */}
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

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.xl,
      marginTop: theme.spacing['2xl'],
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
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
      marginBottom: theme.spacing.xs,
    },
    prayerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: theme.spacing.sm,
    },
    entryPrayer: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    entryDate: {
      fontSize: theme.typography.fontSize.xs,
      marginLeft: theme.spacing.xs + 2,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: theme.spacing.xs + 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      gap: 4,
    },
    chipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    chipText: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.body,
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
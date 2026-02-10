// src/components/garden/ReflectionJournal.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { ReflectionEntry } from '../../types/garden';

interface ReflectionJournalProps {
  reflections: ReflectionEntry[];
}

const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ reflections }) => {
  const { theme } = useTheme();

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

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  entry: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  entryPrayer: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryDate: {
    fontSize: 12,
    marginLeft: 6,
  },
  entryText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  entryFallback: {
    fontSize: 13,
  },
});

export default React.memo(ReflectionJournal);

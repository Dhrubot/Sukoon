// src/components/prayer/OptionalPrayerCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { OptionalPrayerTime } from '../../types';

interface OptionalPrayerCardProps {
  prayer: OptionalPrayerTime;
  onPrepare: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  sunnah: 'Sunnah',
  seasonal: 'Ramadan',
  weekly: 'Weekly',
};

const OptionalPrayerCard: React.FC<OptionalPrayerCardProps> = ({ prayer, onPrepare }) => {
  const { theme } = useTheme();

  const categoryLabel = CATEGORY_LABELS[prayer.category] || prayer.category;
  const prayerColorKey = prayer.name.toLowerCase() as keyof typeof theme.colors.prayer;
  const accentColor = theme.colors.prayer?.[prayerColorKey] || theme.colors.text.secondary;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card.background,
          borderColor: theme.colors.border.secondary,
        },
      ]}
      onPress={onPrepare}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <Text style={styles.icon}>{prayer.icon}</Text>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.colors.text.primary }]}>
              {prayer.displayName}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.arabic, { color: theme.colors.text.muted }]}>
            {prayer.arabic}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.time, { color: theme.colors.text.secondary }]}>
          {format(prayer.time, 'h:mm a')}
        </Text>
        <Text style={[styles.cta, { color: accentColor }]}>
          Prepare
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arabic: {
    fontSize: 12,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
  },
  cta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default React.memo(OptionalPrayerCard, (prev, next) => {
  return (
    prev.prayer.name === next.prayer.name &&
    prev.prayer.time.getTime() === next.prayer.time.getTime()
  );
});

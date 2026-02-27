// src/components/prayer/OptionalPrayerCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OptionalPrayerTime } from '../../types';

interface OptionalPrayerCardProps {
  prayer: OptionalPrayerTime;
  onPrepare: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  sunnah: 'Sunnah',
  seasonal: 'Seasonal',
  weekly: 'Weekly',
};

const OptionalPrayerCard: React.FC<OptionalPrayerCardProps> = ({ prayer, onPrepare }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const categoryLabel = CATEGORY_LABELS[prayer.category] || prayer.category;
  const isTaraweeh = prayer.name === 'Taraweeh';
  const prayerColorKey = prayer.name.toLowerCase() as keyof typeof theme.colors.prayer;
  const purpleAccent = theme.colors.prayer?.taraweeh || '#8b5cf6';
  const accentColor = isTaraweeh ? purpleAccent : (theme.colors.prayer?.[prayerColorKey] || theme.colors.text.secondary);

  const cardContent = (
    <View style={styles.innerContent}>
      <View style={styles.leftSection}>
        <Text style={styles.icon}>{prayer.icon}</Text>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: isTaraweeh ? purpleAccent : theme.colors.text.primary }]}>
              {prayer.displayName}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.badgeText, { color: accentColor }]}>
                {isTaraweeh ? '☪ Seasonal' : categoryLabel}
              </Text>
            </View>
          </View>
          <Text style={[styles.arabic, { color: isTaraweeh ? `${purpleAccent}99` : theme.colors.text.muted }]}>
            {prayer.arabic}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.time, { color: isTaraweeh ? `${purpleAccent}B3` : theme.colors.text.secondary }]}>
          {prayer.name === 'Taraweeh' ? 'After Isha' : prayer.name === 'Eid' ? 'After Sunrise' : format(prayer.time, 'h:mm a')}
        </Text>
        <Text style={[styles.cta, { color: accentColor }]}>
          Prepare
        </Text>
      </View>
    </View>
  );

  if (isTaraweeh) {
    return (
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.card.background,
            borderColor: `${purpleAccent}33`,
          },
        ]}
        onPress={onPrepare}
        activeOpacity={0.7}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

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
      {cardContent}
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md + 2,
    marginBottom: theme.spacing.md - 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  innerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: theme.typography.fontSize['3xl'],
    marginRight: theme.spacing.md,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.borderRadius.sm + 2,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs - 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  arabic: {
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.xxs,
    fontFamily: theme.typography.fontFamily.arabic,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  cta: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginTop: theme.spacing.xxs,
  },
});

export default React.memo(OptionalPrayerCard, (prev, next) => {
  return (
    prev.prayer.name === next.prayer.name &&
    prev.prayer.time.getTime() === next.prayer.time.getTime()
  );
});

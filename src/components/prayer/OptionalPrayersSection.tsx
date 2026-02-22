// src/components/prayer/OptionalPrayersSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useOptionalPrayers } from '../../hooks/useOptionalPrayers';
import { isRamadan, isEidDay } from '../../utils/ramadan';
import OptionalPrayerCard from './OptionalPrayerCard';
import { OptionalPrayerTime } from '../../types';

interface OptionalPrayersSectionProps {
  onPrepare: (prayer: OptionalPrayerTime) => void;
}

const OptionalPrayersSection: React.FC<OptionalPrayersSectionProps> = ({ onPrepare }) => {
  const styles = useThemedStyles(createStyles);
  const optionalPrayers = useOptionalPrayers();

  if (optionalPrayers.length === 0) return null;

  const sectionTitle = isEidDay() ? 'Eid Prayers' : isRamadan() ? 'Ramadan Prayers' : 'Optional Prayers';
  const sectionSubtitle = isEidDay()
    ? 'Eid Mubarak — may Allah accept your worship'
    : isRamadan()
      ? 'Blessed nights of Ramadan'
      : 'Earn extra reward with voluntary prayers';

  return (
    <View style={styles.section}>
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <Text style={styles.sectionSubtitle}>
        {sectionSubtitle}
      </Text>
      <View style={styles.cardList}>
        {optionalPrayers.map((prayer) => (
          <OptionalPrayerCard
            key={prayer.name}
            prayer={prayer}
            onPrepare={() => onPrepare(prayer)}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border.secondary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.lg,
    fontStyle: 'italic',
  },
  cardList: {
    gap: 2,
  },
});

export default React.memo(OptionalPrayersSection);

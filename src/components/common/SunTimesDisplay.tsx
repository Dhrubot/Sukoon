// src/components/common/SunTimesDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { Icon } from './Icon';
import { SunriseIcon, SunsetIcon } from '../../assets/icons';

interface SunTimesDisplayProps {
  sunrise: Date | null;
  sunset: Date | null;
}

export const SunTimesDisplay: React.FC<SunTimesDisplayProps> = ({ 
  sunrise, 
  sunset 
}) => {
  const styles = useThemedStyles(createStyles);

  if (!sunrise || !sunset) return null;

  return (
    <View style={styles.container}>
      {/* Sunrise */}
      <View style={styles.timeBox}>
        <Icon source={SunriseIcon} size={28} />
        <Text style={styles.label}>Sunrise</Text>
        <Text style={styles.time}>{format(sunrise, 'h:mm a')}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Sunset */}
      <View style={styles.timeBox}>
        <Icon source={SunsetIcon} size={28} />
        <Text style={styles.label}>Sunset</Text>
        <Text style={styles.time}>{format(sunset, 'h:mm a')}</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    backgroundColor: theme.colors.card.hover,
    borderColor: theme.colors.border.primary,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
  },
  divider: {
    width: 1,
    height: 60,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.border.primary,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  time: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});

export default React.memo(SunTimesDisplay);

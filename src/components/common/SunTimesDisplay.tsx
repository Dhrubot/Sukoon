// src/components/common/SunTimesDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
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
  const { theme } = useTheme();

  if (!sunrise || !sunset) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card.hover, borderColor: theme.colors.border.primary }]}>
      {/* Sunrise */}
      <View style={styles.timeBox}>
        <Icon source={SunriseIcon} size={28} />
        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Sunrise</Text>
        <Text style={[styles.time, { color: theme.colors.text.primary }]}>{format(sunrise, 'h:mm a')}</Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.colors.border.primary }]} />

      {/* Sunset */}
      <View style={styles.timeBox}>
        <Icon source={SunsetIcon} size={28} />
        <Text style={[styles.label, { color: theme.colors.text.secondary }]}>Sunset</Text>
        <Text style={[styles.time, { color: theme.colors.text.primary }]}>{format(sunset, 'h:mm a')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    width: 1,
    height: 60,
    marginHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SunTimesDisplay;

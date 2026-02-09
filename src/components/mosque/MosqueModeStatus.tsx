// src/components/mosque/MosqueModeStatus.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { PrayerTime } from '../../types';

/**
 * Shows a banner when mosque mode is currently active
 * Displays countdown and allows manual restore
 */
export const MosqueModeStatus: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isActive, activeState, manuallyRestoreRinger, isEnabled, settings, getIqamahTime } = useMosqueMode();
  const { todayPrayerTimes } = usePrayerTimes();

  const nextScheduled = useMemo(() => {
    if (!isEnabled || !settings) return null;
    const now = new Date();

    const candidates: Array<{ prayer: PrayerTime; iqamahTime: Date }> = [];
    for (const p of todayPrayerTimes) {
      const iqamah = getIqamahTime(p);
      if (!iqamah) continue;
      if (iqamah.getTime() <= now.getTime()) continue;
      candidates.push({ prayer: p, iqamahTime: iqamah });
    }

    candidates.sort((a, b) => a.iqamahTime.getTime() - b.iqamahTime.getTime());
    return candidates[0] || null;
  }, [isEnabled, settings, todayPrayerTimes, getIqamahTime]);

  if (!isActive && !nextScheduled) return null;

  const handleManualRestore = () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        '📱 iOS Note',
        'You can manually disable Do Not Disturb by swiping down from the top-right corner.',
        [{ text: 'Got it' }]
      );
      return;
    }

    Alert.alert(
      '🔊 Restore Ringer?',
      'This will end mosque mode early and restore your ringer to normal.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restore Now',
          onPress: async () => {
            const success = await manuallyRestoreRinger();
            if (success) {
              Alert.alert(
                'Ringer Restored',
                'Your ringer has been restored to normal mode.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert(
                'Failed',
                'Could not restore ringer. Please check manually.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const title = isActive ? 'Mosque Mode Active' : 'Mosque Mode Scheduled';
  const description = isActive
    ? `${activeState!.prayer} • Silent until ${format(activeState!.restoreTime, 'h:mm a')}`
    : `${nextScheduled!.prayer.name} • Iqamah at ${format(nextScheduled!.iqamahTime, 'h:mm a')}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary.light }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>🔇</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: theme.colors.text.primary }]}>
            {description}
          </Text>
        </View>

        {Platform.OS === 'android' && isActive && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.card.background }]}
            onPress={handleManualRestore}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary.DEFAULT }]}
            >
              Restore
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

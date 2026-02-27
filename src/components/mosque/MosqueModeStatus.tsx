// src/components/mosque/MosqueModeStatus.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Animated,
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive, pulseAnim]);
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
        'iOS Note',
        'You can manually disable Do Not Disturb by swiping down from the top-right corner.',
        [{ text: 'Got it' }]
      );
      return;
    }

    Alert.alert(
      'Restore Ringer?',
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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.dotRow}>
          {isActive && (
            <Animated.View
              style={[
                styles.liveDot,
                { backgroundColor: theme.colors.mosqueMode.banner.dot, opacity: pulseAnim },
              ]}
            />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>

        {Platform.OS === 'android' && isActive && (
          <TouchableOpacity
            style={styles.button}
            onPress={handleManualRestore}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>Restore</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.mosqueMode.banner.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.banner.dot,
  },
  content: {
    gap: theme.spacing.xs,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.mosqueMode.banner.text,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.banner.textMuted,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.banner.button,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.banner.button,
  },
});

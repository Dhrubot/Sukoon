/* eslint-disable react-native/no-unused-styles */
// src/screens/Settings/components/NotificationSection.tsx
import React, { useEffect, useState } from 'react';
import { Switch, View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { UserSettings } from '../../../types';
import { useStore } from '../../../store/useStore';
import NotificationService from '../../../services/NotificationService';
import type { NotificationBlockedReason } from '../../../services/NotificationService';
import type { ExactAlarmStatus } from '../../../services/notifications/FullAdhanScheduler';
import LiveActivityService from '../../../services/LiveActivityService';
import {
  mergeNotificationSettings,
  normalizeNotificationSettings,
} from '../../../services/notifications/notificationSettingsState';
import { useTheme } from '../../../providers/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

interface NotificationSectionProps {
  userSettings: UserSettings;
  onNotificationPress: () => void;
  onToggleTahajjud?: () => void;
  onToggleJummah?: () => void;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  userSettings,
  onNotificationPress,
  onToggleTahajjud,
  onToggleJummah,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { updateUserSettings } = useStore();
  const notifications = normalizeNotificationSettings(userSettings.notifications);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [exactAlarmStatus, setExactAlarmStatus] = useState<ExactAlarmStatus | 'not_applicable'>('not_applicable');
  const [blockedReason, setBlockedReason] = useState<NotificationBlockedReason>(null);

  const refreshReadiness = async () => {
    const readiness = await NotificationService.getNotificationReadiness();
    setPermissionStatus(readiness.permissionStatus);
    setExactAlarmStatus(readiness.exactAlarmStatus);
    setBlockedReason(readiness.blockedReason);
    return readiness;
  };

  useEffect(() => {
    let mounted = true;
    refreshReadiness().then((readiness) => {
      if (!mounted) return;
      setPermissionStatus(readiness.permissionStatus);
      setExactAlarmStatus(readiness.exactAlarmStatus);
      setBlockedReason(readiness.blockedReason);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
      return;
    }
    Linking.openSettings();
  };

  const openExactAlarmSettings = async () => {
    const opened = await NotificationService.openAndroidExactAlarmSettings();
    if (!opened) {
      openAppSettings();
    }
  };

  const getNotificationSubtitle = () => {
    if (blockedReason === 'permission_blocked') return 'Blocked in system settings';
    if (blockedReason === 'permission_denied' || permissionStatus !== 'granted') return 'Permission required';
    if (Platform.OS === 'android' && exactAlarmStatus === 'fallback' && notifications.fullAdhanEnabled) {
      return 'Enabled • full Adhan may be delayed';
    }
    if (blockedReason === 'no_valid_location') return 'Location required';
    if (!notifications.enabled) return 'Disabled';
    
    let subtitle = 'Enabled';
    if (notifications.beforePrayer > 0) {
      subtitle += ` • ${notifications.beforePrayer} min before`;
    }
    return subtitle;
  };

  const adhanSubtitle =
    Platform.OS === 'android'
      ? 'Short call to prayer at prayer time. Enable full playback below for locked-screen adhan.'
      : 'Short call to prayer on the lock screen. Full adhan continues after you open the app.';
  const liveActivityLabel =
    Platform.OS === 'android' ? 'Persistent Prayer Countdown' : 'Live Activity';
  const liveActivitySubtitle =
    Platform.OS === 'android'
      ? 'Keep a prayer-aware countdown in your notifications and on the lock screen.'
      : 'Show a prayer-aware countdown on your lock screen and Dynamic Island.';

  const handlePressRow = () => {
    if (permissionStatus === 'granted') {
      onNotificationPress();
      return;
    }

    if (permissionStatus === 'undetermined') {
      void (async () => {
        const readiness = await NotificationService.requestNotificationAccessFromUser();
        setPermissionStatus(readiness.permissionStatus);
        setExactAlarmStatus(readiness.exactAlarmStatus);
        setBlockedReason(readiness.blockedReason);
        const granted = readiness.permissionStatus === 'granted';

        if (granted) {
          onNotificationPress();
          return;
        }

        Alert.alert(
          'Notifications Off',
          'Sukoon needs notification access to send prayer reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openAppSettings },
          ]
        );
      })();
      return;
    }

    Alert.alert(
      blockedReason === 'exact_alarm_blocked' ? 'Alarms & Reminders Blocked' : 'Notifications Blocked',
      blockedReason === 'exact_alarm_blocked'
        ? 'Enable Alarms & reminders in your device settings to improve prayer-time delivery.'
        : 'Enable notifications in your device settings to receive prayer reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: blockedReason === 'exact_alarm_blocked'
            ? () => { void openExactAlarmSettings(); }
            : openAppSettings,
        },
      ]
    );
  };

  // Logic for the Adhan toggle
  const toggleAdhan = async (value: boolean) => {
    const nextNotifications = mergeNotificationSettings(notifications, {
      adhanEnabled: value,
    });

    // Optimistic UI update via Store
    updateUserSettings({
      notifications: nextNotifications,
    });

    // Update the native notification service
    // This forces a reschedule so the next notification uses the correct sound
    await NotificationService.updateNotificationSettings(nextNotifications);
  };

  // Logic for the Full Adhan toggle (Android only)
  const toggleFullAdhan = async (value: boolean) => {
    const nextNotifications = mergeNotificationSettings(notifications, {
      fullAdhanEnabled: value,
    });

    updateUserSettings({
      notifications: nextNotifications,
    });

    await NotificationService.updateNotificationSettings(nextNotifications);
  };

  return (
    <SettingSection title="Notifications">
      <SettingRow
        label="Prayer Reminders"
        subtitle={getNotificationSubtitle()}
        onPress={handlePressRow}
      />
      {Platform.OS === 'android' && permissionStatus === 'granted' && exactAlarmStatus === 'fallback' && notifications.fullAdhanEnabled && (
        <SettingRow
          label="Full Adhan exact timing"
          subtitle="Prayer reminders still work; enable this for precise full-Adhan playback"
          value="Needs settings"
          onPress={() => { void openExactAlarmSettings(); }}
        />
      )}
      {/* The Adhan Switch Row */}
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Adhan Sound</Text>
          <Text style={styles.subtitle}>{adhanSubtitle}</Text>
        </View>
        <Switch
          value={notifications.adhanEnabled}
          onValueChange={toggleAdhan}
          disabled={!notifications.enabled || permissionStatus !== 'granted'}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>
      {/* Full Adhan — Android only, visible when adhan is enabled */}
      {Platform.OS === 'android' && notifications.adhanEnabled && (
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Full Adhan (Locked Screen)</Text>
            <Text style={styles.subtitle}>Schedules the complete call to prayer when your phone is locked or the app is closed</Text>
          </View>
          <Switch
            value={!!notifications.fullAdhanEnabled}
            onValueChange={toggleFullAdhan}
            disabled={!notifications.enabled || permissionStatus !== 'granted'}
            trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
            thumbColor={theme.colors.switch.thumb}
          />
        </View>
      )}
      {/* Live Activity / persistent countdown */}
      {Platform.OS !== 'web' && (
        <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>{liveActivityLabel}</Text>
          <Text style={styles.subtitle}>{liveActivitySubtitle}</Text>
        </View>
        <Switch
          value={!!notifications.liveActivityEnabled}
          onValueChange={async (value) => {
            const nextNotifications = {
              ...notifications,
              liveActivityEnabled: value,
            };
            updateUserSettings({
              notifications: nextNotifications,
            });
            if (value) {
              await LiveActivityService.startWithCurrentData();
            } else {
              await LiveActivityService.end();
            }
          }}
          disabled={!notifications.enabled || permissionStatus !== 'granted'}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
        </View>
      )}
      {/* Tahajjud Reminders */}
      {onToggleTahajjud && (
        <SettingRow
          label="Tahajjud Reminders"
          subtitle="Night prayer encouragement"
          value={userSettings.tahajjudReminders?.enabled ? 'On' : 'Off'}
          onPress={onToggleTahajjud}
        />
      )}
      {/* Jumu'ah Reminders */}
      {onToggleJummah && (
        <SettingRow
          label="Jumu'ah Reminders"
          subtitle="Friday sunnah · Al-Kahf, ghusl"
          value={userSettings.jummahReminders?.enabled !== false ? 'On' : 'Off'}
          onPress={onToggleJummah}
        />
      )}
    </SettingSection>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  label: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  row: {
    alignItems: 'center',
    backgroundColor: theme.colors.settings.sectionBg,
    borderBottomColor: theme.colors.border.primary,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    lineHeight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
});

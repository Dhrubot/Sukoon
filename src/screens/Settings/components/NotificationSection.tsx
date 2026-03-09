// src/screens/Settings/components/NotificationSection.tsx
import React, { useEffect, useState } from 'react';
import { Switch, View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { UserSettings } from '../../../types';
import { useStore } from '../../../store/useStore';
import NotificationService from '../../../services/NotificationService';
import LiveActivityService from '../../../services/LiveActivityService';
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
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  useEffect(() => {
    let mounted = true;
    NotificationService.getPermissionStatus().then((status) => {
      if (mounted) setPermissionStatus(status);
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

  const getNotificationSubtitle = () => {
    if (permissionStatus !== 'granted') return 'Blocked in system settings';
    if (!userSettings.notifications.enabled) return 'Disabled';
    
    let subtitle = 'Enabled';
    if (userSettings.notifications.beforePrayer > 0) {
      subtitle += ` • ${userSettings.notifications.beforePrayer} min before`;
    }
    return subtitle;
  };

  const handlePressRow = () => {
    if (permissionStatus === 'granted') {
      onNotificationPress();
      return;
    }

    Alert.alert(
      'Notifications Blocked',
      'Enable notifications in your device settings to receive prayer reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openAppSettings },
      ]
    );
  };

  // Logic for the Adhan toggle
  const toggleAdhan = async (value: boolean) => {
    // Optimistic UI update via Store
    updateUserSettings({
      notifications: {
        ...userSettings.notifications,
        adhanEnabled: value,
        // Disable full adhan if adhan is turned off
        ...(value === false && { fullAdhanEnabled: false }),
      }
    });

    // Update the native notification service
    // This forces a reschedule so the next notification uses the correct sound
    await NotificationService.updateNotificationSettings({
      adhanEnabled: value,
      ...(value === false && { fullAdhanEnabled: false }),
    });
  };

  // Logic for the Full Adhan toggle (Android only)
  const toggleFullAdhan = async (value: boolean) => {
    updateUserSettings({
      notifications: {
        ...userSettings.notifications,
        fullAdhanEnabled: value,
      }
    });

    await NotificationService.updateNotificationSettings({
      fullAdhanEnabled: value,
    });
  };

  return (
    <SettingSection title="Notifications">
      <SettingRow
        label="Prayer Reminders"
        subtitle={getNotificationSubtitle()}
        onPress={handlePressRow}
      />
      {/* The Adhan Switch Row */}
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Adhan Sound</Text>
          <Text style={styles.subtitle}>Call to prayer at prayer time</Text>
        </View>
        <Switch
          value={userSettings.notifications.adhanEnabled}
          onValueChange={toggleAdhan}
          disabled={!userSettings.notifications.enabled || permissionStatus !== 'granted'}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>
      {/* Full Adhan — Android only, visible when adhan is enabled */}
      {Platform.OS === 'android' && userSettings.notifications.adhanEnabled && (
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text style={styles.label}>Full Adhan (Locked Screen)</Text>
            <Text style={styles.subtitle}>Plays the complete call to prayer even when your phone is locked</Text>
          </View>
          <Switch
            value={!!userSettings.notifications.fullAdhanEnabled}
            onValueChange={toggleFullAdhan}
            disabled={!userSettings.notifications.enabled || permissionStatus !== 'granted'}
            trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
            thumbColor={theme.colors.switch.thumb}
          />
        </View>
      )}
      {/* Live Activity — lock screen prayer countdown */}
       { __DEV__ && (<View style={styles.row}>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Live Activity</Text>
          <Text style={styles.subtitle}>Show prayer countdown on your lock screen</Text>
        </View>
        <Switch
          value={!!userSettings.notifications.liveActivityEnabled}
          onValueChange={async (value) => {
            updateUserSettings({
              notifications: {
                ...userSettings.notifications,
                liveActivityEnabled: value,
              }
            });
            if (value) {
              await LiveActivityService.startWithCurrentData();
            } else {
              await LiveActivityService.end();
            }
          }}
          disabled={!userSettings.notifications.enabled || permissionStatus !== 'granted'}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>)}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.settings.sectionBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
});


// src/screens/Settings/components/NotificationSection.tsx
import React, { useEffect, useState } from 'react';
import { Switch, View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { UserSettings } from '../../../types';
import { useStore } from '../../../store/useStore';
import NotificationService from '../../../services/NotificationService';

interface NotificationSectionProps {
  userSettings: UserSettings;
  onNotificationPress: () => void;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  userSettings,
  onNotificationPress,
}) => {
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
        adhanEnabled: value
      }
    });

    // Update the native notification service
    // This forces a reschedule so the next notification uses the correct sound
    await NotificationService.updateNotificationSettings({
      adhanEnabled: value
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
          <Text style={styles.subtitle}>Play call to prayer at prayer time</Text>
        </View>
        <Switch
          value={userSettings.notifications.adhanEnabled}
          onValueChange={toggleAdhan}
          // Only allow toggling if master notifications are enabled
          disabled={!userSettings.notifications.enabled || permissionStatus !== 'granted'}
          trackColor={{ false: '#E0E0E0', true: '#1B5E3F' }}
        />
      </View>
    </SettingSection>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF', // Use 'rgba(255,255,255,0.1)' if you are in dark mode/transparent theme
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0', // Adjust for dark mode if needed
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,  // lg
    color: '#000000', // Adjust for dark mode (e.g., #FFFFFF)
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,  // sm (adjusted up)
    color: '#666666', // Adjust for dark mode (e.g., #AAAAAA)
  },
});


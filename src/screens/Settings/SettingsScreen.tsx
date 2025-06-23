import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';

const SettingsScreen: React.FC = () => {
  const { userSettings, updateUserSettings } = useStore();

  const toggleNotifications = async (value: boolean) => {
    updateUserSettings({
      notifications: {
        ...userSettings!.notifications,
        enabled: value,
      },
    });
    
    StorageService.updateUserSettings({
      notifications: {
        ...userSettings!.notifications,
        enabled: value,
      },
    });
    
    await NotificationService.updateNotificationSettings(value);
  };

  const testNotification = async () => {
    await NotificationService.sendTestNotification();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Prayer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Times</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Calculation Method</Text>
            <Text style={styles.settingValue}>
              {userSettings?.calculationMethod || 'MWL'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Asr Calculation</Text>
            <Text style={styles.settingValue}>
              {userSettings?.asrJuristic || 'Standard'}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Prayer Reminders</Text>
            <Switch
              value={userSettings?.notifications.enabled || false}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#767577', true: '#1B5E3F' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Reminder Time</Text>
            <Text style={styles.settingValue}>
              {userSettings?.notifications.beforePrayer || 10} min before
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={testNotification}
          >
            <Text style={styles.buttonText}>Test Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Current Location</Text>
            <Text style={styles.settingValue}>
              {userSettings?.location.city}, {userSettings?.location.country}
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>

          <Text style={styles.aboutText}>
            PrayerBuddy is a free app built with ❤️ for the Muslim community
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212121',
  },
  settingValue: {
    fontSize: 16,
    color: '#757575',
  },
  button: {
    backgroundColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aboutText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

export default SettingsScreen;
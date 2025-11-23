// src/screens/Debug/NotificationDebugScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import NotificationService from '../../services/NotificationService';
import { useStore } from '../../store/useStore';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';

export const NotificationDebugScreen = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [scheduledCount, setScheduledCount] = useState(0);
  const { userSettings } = useStore();
  const { todayPrayerTimes, nextPrayer } = usePrayerTimes();

  useEffect(() => {
    checkPermissions();
    loadDebugInfo();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const loadDebugInfo = async () => {
    const info = await NotificationService.getDebugInfo();
    setDebugInfo(info);
    setScheduledCount(info.scheduledCount);
  };

  // 🧪 Test 1: Immediate Test Notification
  const testImmediateNotification = async () => {
    try {
      await NotificationService.sendTestNotification();
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 2: Schedule notification 10 seconds from now
  const test10SecondNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ 10-Second Test',
          body: 'This notification was scheduled 10 seconds ago',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          repeats: false,
        },
      });
      Alert.alert('Scheduled', 'Notification will appear in 10 seconds');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 3: Test with Adhan sound (30 seconds)
  const testAdhanNotification = async () => {
    // try {
    //   const soundAsset = Platform.OS === 'ios' ? 'adhan_short.wav' : 'adhan_full';
    //   const channelId = Platform.OS === 'android' ? 'prayer-times-adhan' : undefined;

    //   await Notifications.scheduleNotificationAsync({
    //     content: {
    //       title: '🕌 Adhan Test',
    //       body: 'Testing Adhan sound',
    //       sound: Platform.OS === 'ios' ? soundAsset : undefined,
    //       ...(Platform.OS === 'android' && {
    //         channelId: channelId,
    //       }),
    //     },
    //     trigger: {
    //       type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    //       seconds: 30,
    //       repeats: false,
    //     },
    //   });
    //   Alert.alert('Scheduled', 'Adhan notification will sound in 30 seconds');
    // } catch (error) {
    //   Alert.alert('Error', `Failed: ${error}`);
    // }
    NotificationService.sendTestAdhanNotification()
  };

  // 🧪 Test 4: Request permissions
  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      setPermissionStatus(status);
      Alert.alert('Permission Status', `Status: ${status}`);
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 5: Force reschedule all prayer notifications
  const forceReschedule = async () => {
    try {
      await NotificationService.forceReschedule();
      await loadDebugInfo();
      Alert.alert('Success', 'Notifications rescheduled!');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 6: Cancel all notifications
  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await loadDebugInfo();
      Alert.alert('Success', 'All notifications cancelled');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 7: View all scheduled notifications
  const viewScheduledNotifications = async () => {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      const info = notifications.map(n => ({
        id: n.identifier,
        title: n.content.title,
        prayer: n.content.data?.prayer,
        trigger: n.trigger && 'date' in n.trigger 
          ? new Date(n.trigger.date).toLocaleString() 
          : 'Unknown',
      }));
      
      Alert.alert(
        `Scheduled (${notifications.length})`,
        JSON.stringify(info, null, 2),
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  // 🧪 Test 8: Check Android notification channels
  const checkAndroidChannels = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('iOS', 'Channels are Android-only');
      return;
    }

    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      const channelInfo = channels.map(c => `${c.name} (${c.id})`).join('\n');
      Alert.alert('Android Channels', channelInfo || 'No channels found');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Notification Debugger</Text>
        <Text style={styles.subtitle}>
          Test notification system on {Platform.OS === 'ios' ? 'iOS' : 'Android'}
        </Text>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Device Info</Text>
        <InfoRow label="Is Physical Device" value={Device.isDevice ? 'Yes' : 'No (Emulator)'} />
        <InfoRow label="Platform" value={Platform.OS} />
        <InfoRow label="Permission Status" value={permissionStatus} />
        <InfoRow label="Scheduled Count" value={scheduledCount.toString()} />
      </View>

      {/* Prayer Times Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕌 Prayer Times</Text>
        <InfoRow label="Today's Prayers" value={todayPrayerTimes.length.toString()} />
        <InfoRow label="Next Prayer" value={nextPrayer?.name || 'None'} />
        <InfoRow label="Notifications Enabled" value={userSettings?.notifications?.enabled ? 'Yes' : 'No'} />
        <InfoRow label="Adhan Enabled" value={userSettings?.notifications?.adhanEnabled ? 'Yes' : 'No'} />
      </View>

      {/* Debug Info */}
      {debugInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Debug Info</Text>
          <InfoRow label="Has Prayer Source" value={debugInfo.hasSource ? 'Yes' : 'No'} />
          <InfoRow label="Has Location" value={debugInfo.sourceHasLocation ? 'Yes' : 'No'} />
          <InfoRow label="Loading" value={debugInfo.sourceLoading ? 'Yes' : 'No'} />
          
          {debugInfo.upcomingNotifications && debugInfo.upcomingNotifications.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Next 3 Notifications:</Text>
              {debugInfo.upcomingNotifications.slice(0, 3).map((notif: any, idx: number) => (
                <View key={idx} style={styles.notificationCard}>
                  <Text style={styles.notifText}>Prayer: {notif.prayer || 'N/A'}</Text>
                  <Text style={styles.notifText}>Type: {notif.type}</Text>
                  <Text style={styles.notifText}>Time: {notif.trigger}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Test Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Quick Tests</Text>
        
        <TestButton
          title="1. Test Immediate Notification"
          onPress={testImmediateNotification}
          description="Sends notification right now"
        />
        
        <TestButton
          title="2. Test 10-Second Delay"
          onPress={test10SecondNotification}
          description="Notification in 10 seconds"
        />
        
        <TestButton
          title="3. Test Adhan Sound (30s)"
          onPress={testAdhanNotification}
          description="Test adhan audio in 30 seconds"
        />
        
        <TestButton
          title="4. Request Permissions"
          onPress={requestPermissions}
          description="Re-request notification permissions"
        />
        
        <TestButton
          title="5. Force Reschedule All"
          onPress={forceReschedule}
          description="Reschedule all prayer notifications"
        />
        
        <TestButton
          title="6. Cancel All Notifications"
          onPress={cancelAllNotifications}
          description="Clear all scheduled notifications"
          danger
        />
        
        <TestButton
          title="7. View All Scheduled"
          onPress={viewScheduledNotifications}
          description="See list of scheduled notifications"
        />
        
        {Platform.OS === 'android' && (
          <TestButton
            title="8. Check Android Channels"
            onPress={checkAndroidChannels}
            description="View notification channels"
          />
        )}
        
        <TestButton
          title="🔄 Refresh Debug Info"
          onPress={loadDebugInfo}
          description="Reload debug information"
        />
      </View>

      {/* Important Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            • On emulator: Notifications may not work perfectly{'\n'}
            • On real device: Make sure notifications are allowed in system settings{'\n'}
            • After testing, check your device notification tray{'\n'}
            • Sounds require proper audio files in assets/sounds/{'\n'}
            • Android needs notification channels configured{'\n'}
            • iOS has 30-second sound limit
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const TestButton = ({ 
  title, 
  onPress, 
  description,
  danger = false 
}: { 
  title: string; 
  onPress: () => void; 
  description: string;
  danger?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.testButton, danger && styles.dangerButton]}
    onPress={onPress}
  >
    <Text style={[styles.buttonTitle, danger && styles.dangerText]}>{title}</Text>
    <Text style={styles.buttonDescription}>{description}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1B5E3F',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 12,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1B5E3F',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  notificationCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  notifText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: '#1B5E3F',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#D32F2F',
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  dangerText: {
    color: 'white',
  },
  buttonDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  noteBox: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});
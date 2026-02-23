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
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

export const NotificationDebugScreen = () => {
  const styles = useThemedStyles(createStyles);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const { userSettings } = useStore();
  const { todayPrayerTimes, nextPrayer } = usePrayerTimes();

  useEffect(() => {
    checkPermissions();
    loadDebugInfo();
  }, []);

  // Stop adhan when leaving the screen
  useEffect(() => {
    return () => {
      NotificationService.stopAdhan();
    };
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

  // 🧪 Test 3: Play/Stop full Adhan in-app
  const toggleAdhanPlayback = () => {
    if (isAdhanPlaying) {
      NotificationService.stopAdhan();
      setIsAdhanPlaying(false);
    } else {
      setIsAdhanPlaying(true);
      NotificationService.playFullAdhan(() => setIsAdhanPlaying(false));
    }
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
        <Text style={styles.title}>Notification Debugger</Text>
        <Text style={styles.subtitle}>
          Test notification system on {Platform.OS === 'ios' ? 'iOS' : 'Android'}
        </Text>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Info</Text>
        <InfoRow label="Is Physical Device" value={Device.isDevice ? 'Yes' : 'No (Emulator)'} />
        <InfoRow label="Platform" value={Platform.OS} />
        <InfoRow label="Permission Status" value={permissionStatus} />
        <InfoRow label="Scheduled Count" value={scheduledCount.toString()} />
      </View>

      {/* Prayer Times Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prayer Times</Text>
        <InfoRow label="Today's Prayers" value={todayPrayerTimes.length.toString()} />
        <InfoRow label="Next Prayer" value={nextPrayer?.name || 'None'} />
        <InfoRow label="Notifications Enabled" value={userSettings?.notifications?.enabled ? 'Yes' : 'No'} />
        <InfoRow label="Adhan Enabled" value={userSettings?.notifications?.adhanEnabled ? 'Yes' : 'No'} />
      </View>

      {/* Debug Info */}
      {debugInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
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
          title={isAdhanPlaying ? '3. ⏹ Stop Adhan' : '3. Test Adhan Sound'}
          onPress={toggleAdhanPlayback}
          description={isAdhanPlaying ? 'Tap to stop playback' : 'Play full adhan in-app'}
          danger={isAdhanPlaying}
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
          title="Refresh Debug Info"
          onPress={loadDebugInfo}
          description="Reload debug information"
        />
      </View>

      {/* Important Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Notes</Text>
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

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

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
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.testButton, danger && styles.dangerButton]}
      onPress={onPress}
    >
      <Text style={[styles.buttonTitle, danger && styles.dangerText]}>{title}</Text>
      <Text style={styles.buttonDescription}>{description}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.settings.containerBg,
  },
  header: {
    backgroundColor: theme.colors.primary.DEFAULT,
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.primary.contrast,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.achievement.textSecondary,
  },
  section: {
    backgroundColor: theme.colors.settings.sectionBg,
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginBottom: theme.spacing.md,
    color: theme.colors.primary.DEFAULT,
  },
  subsectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  notificationCard: {
    backgroundColor: theme.colors.settings.optionBg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  notifText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  testButton: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  dangerButton: {
    backgroundColor: theme.colors.status.error,
  },
  buttonTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.buttonPrimaryText,
    marginBottom: theme.spacing.xs,
  },
  dangerText: {
    color: theme.colors.settings.buttonPrimaryText,
  },
  buttonDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.achievement.textSecondary,
  },
  noteBox: {
    backgroundColor: theme.colors.settings.warningBg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.status.warning,
  },
  noteText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});
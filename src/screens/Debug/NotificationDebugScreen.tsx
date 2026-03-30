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
import NotificationTraceService from '../../services/NotificationTraceService';
import { useStore } from '../../store/useStore';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { CHANNELS, SOUNDS } from '../../constants/NotificationConstants';
import { scheduleFullAdhan } from '../../services/notifications/FullAdhanScheduler';
import NotificationLedger, { LedgerHealth } from '../../services/NotificationLedger';
import { scheduleLocalNotificationAsync } from '../../services/notifications/scheduleLocalNotification';

type NotificationDebugInfo = Awaited<ReturnType<typeof NotificationService.getDebugInfo>>;
type UpcomingNotification = NotificationDebugInfo['upcomingNotifications'][number];

export const NotificationDebugScreen = () => {
  const styles = useThemedStyles(createStyles);
  const [debugInfo, setDebugInfo] = useState<NotificationDebugInfo | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [ledgerHealth, setLedgerHealth] = useState<LedgerHealth | null>(null);
  const [traceEvents, setTraceEvents] = useState(() => NotificationTraceService.getRecentEvents());
  const { userSettings } = useStore();
  const { todayPrayerTimes, nextPrayer } = usePrayerTimes();

  useEffect(() => {
    checkPermissions();
    loadDebugInfo();
    loadLedgerHealth();
    loadTraceEvents();
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
    setScheduledCount(info.totalScheduledCount);
  };

  const loadLedgerHealth = () => {
    setLedgerHealth(NotificationLedger.getHealth());
  };

  const loadTraceEvents = () => {
    setTraceEvents(NotificationTraceService.getRecentEvents());
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
      await scheduleLocalNotificationAsync({
        content: {
          title: '⏰ 10-Second Test',
          body: 'This notification was scheduled 10 seconds ago',
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

  // Test 2.5 Test Dhan notification

  const test10SecondAdhanNotification = async () => {
    try {
      await scheduleLocalNotificationAsync({
        content: {
          title: '⏰ Adhan Test',
          body: 'This should play the adhan sound',
          sound: SOUNDS.ANDROID_SHORT,        // ← 'adhan_short'

        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 10,
          repeats: false,
          ...(Platform.OS === 'android' && {
            channelId: CHANNELS.ADHAN,         // ← 'prayer-times-adhan-v6'
          }),
        },
      });
      Alert.alert('Scheduled', 'Notification in 10 seconds — LOCK YOUR PHONE NOW');
    } catch (error) {
      Alert.alert('Error', `Failed: ${error}`);
    }
  }

  // 🧪 Test 2.75: Full Adhan Foreground Service (10-second lock screen test)
  const test10SecondFullAdhan = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android Only', 'Full Adhan foreground service is Android-only');
      return;
    }
    try {
      const triggerTime = new Date(Date.now() + 10_000); // 10 seconds from now
      await scheduleFullAdhan(triggerTime, 'Fajr', 'Test Adhan');
      Alert.alert(
        'Full Adhan Scheduled',
        'Foreground service will play in 10 seconds — LOCK YOUR PHONE NOW to test lock-screen playback'
      );
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
      loadTraceEvents();
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
      loadTraceEvents();
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
      const adhanChannel = channels.find(c => c.id.includes('adhan'));
      if (adhanChannel) {
        console.log('🔊 Adhan channel sound:', adhanChannel.sound);
        console.log('🔊 Adhan channel full:', JSON.stringify(adhanChannel, null, 2));
        Alert.alert('Adhan Channel', `Sound: ${adhanChannel.sound}\nID: ${adhanChannel.id}`);
      }
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
        <InfoRow label="Trace Enabled" value={NotificationTraceService.isEnabled() ? 'Yes' : 'No'} />
      </View>

      {/* Prayer Times Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prayer Times</Text>
        <InfoRow label="Today's Prayers" value={todayPrayerTimes.length.toString()} />
        <InfoRow label="Next Prayer" value={nextPrayer?.name || 'None'} />
        <InfoRow label="Notifications Enabled" value={userSettings?.notifications?.enabled ? 'Yes' : 'No'} />
        <InfoRow label="Adhan Enabled" value={userSettings?.notifications?.adhanEnabled ? 'Yes' : 'No'} />
        <InfoRow label="Full Adhan (Service)" value={userSettings?.notifications?.fullAdhanEnabled ? 'Yes' : 'No'} />
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
              {debugInfo.upcomingNotifications.slice(0, 3).map((notif: UpcomingNotification, idx: number) => (
                <View key={idx} style={styles.notificationCard}>
                  <Text style={styles.notifText}>Prayer: {String(notif.prayer ?? 'N/A')}</Text>
                  <Text style={styles.notifText}>Type: {String(notif.type ?? 'Unknown')}</Text>
                  <Text style={styles.notifText}>Time: {String(notif.trigger)}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Notification Trace */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Trace</Text>
        <InfoRow label="Stored Events" value={traceEvents.length.toString()} />

        {traceEvents.length > 0 ? (
          <>
            <Text style={styles.subsectionTitle}>Recent Events:</Text>
            {traceEvents.slice(0, 12).map((entry, idx) => (
              <View key={`${entry.at}-${entry.event}-${idx}`} style={styles.notificationCard}>
                <Text style={styles.notifText}>
                  {new Date(entry.at).toLocaleTimeString()} · {entry.event}
                </Text>
                {entry.fields ? (
                  <Text style={styles.notifText}>
                    {Object.entries(entry.fields)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => `${key}=${String(value)}`)
                      .join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.noteText}>No trace events recorded yet.</Text>
        )}

        <TestButton
          title="Refresh Notification Trace"
          onPress={loadTraceEvents}
          description="Reload recent trace events"
        />
        <TestButton
          title="Clear Notification Trace"
          onPress={() => {
            NotificationTraceService.clear();
            loadTraceEvents();
            Alert.alert('Cleared', 'Notification trace has been cleared');
          }}
          description="Remove stored QA trace events"
          danger
        />
      </View>

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
          title="2.5 Test 10-Second Adhan"
          onPress={test10SecondAdhanNotification}
          description="Short adhan via notification channel"
        />

        {Platform.OS === 'android' && (
          <TestButton
            title="2.75 Test Full Adhan (Lock Screen)"
            onPress={test10SecondFullAdhan}
            description="Foreground service plays full adhan in 10s — lock your phone!"
          />
        )}

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
          onPress={() => {
            loadDebugInfo();
            loadTraceEvents();
          }}
          description="Reload debug information"
        />
      </View>

      {/* Notification Health (Ledger) */}
      {ledgerHealth && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Notification Health</Text>
          <InfoRow label="Tracked Scheduled" value={ledgerHealth.totalScheduled.toString()} />
          <InfoRow label="Delivered" value={ledgerHealth.totalDelivered.toString()} />
          <InfoRow label="Tapped" value={ledgerHealth.totalTapped.toString()} />
          <InfoRow
            label="Delivery Rate"
            value={ledgerHealth.totalScheduled > 0 ? `${(ledgerHealth.deliveryRate * 100).toFixed(1)}%` : 'N/A'}
          />
          <InfoRow
            label="Tap Rate"
            value={ledgerHealth.totalDelivered > 0 ? `${(ledgerHealth.tapRate * 100).toFixed(1)}%` : 'N/A'}
          />
          <InfoRow label="Avg Drift" value={`${ledgerHealth.avgDriftSeconds}s`} />
          <InfoRow label="Max Drift" value={`${ledgerHealth.maxDriftSeconds}s`} />
          <InfoRow label="Missed (>5min)" value={ledgerHealth.missedNotifications.length.toString()} />

          {ledgerHealth.missedNotifications.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Missed Notifications:</Text>
              {ledgerHealth.missedNotifications.map((entry, idx) => (
                <View key={idx} style={styles.notificationCard}>
                  <Text style={styles.notifText}>{entry.label}</Text>
                  <Text style={styles.notifText}>Scheduled for: {new Date(entry.scheduledFor).toLocaleString()}</Text>
                </View>
              ))}
            </>
          )}

          {ledgerHealth.recentEntries.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Recent Entries (newest first):</Text>
              {ledgerHealth.recentEntries.slice(0, 8).map((entry, idx) => (
                <View key={idx} style={styles.notificationCard}>
                  <Text style={styles.notifText}>{entry.label}</Text>
                  <Text style={styles.notifText}>
                    S: {new Date(entry.scheduledFor).toLocaleTimeString()}
                    {entry.deliveredAt ? ` → D: ${new Date(entry.deliveredAt).toLocaleTimeString()}` : ' → ❌ Not delivered'}
                    {entry.tappedAt ? ' → ✅ Tapped' : ''}
                    {entry.driftSeconds !== null ? ` (${entry.driftSeconds}s drift)` : ''}
                  </Text>
                </View>
              ))}
            </>
          )}

          <TestButton
            title="Clear Notification Ledger"
            onPress={() => {
              NotificationLedger.clear();
              loadLedgerHealth();
              Alert.alert('Cleared', 'Notification ledger has been cleared');
            }}
            description="Reset all tracked notification data"
            danger
          />
          <TestButton
            title="Refresh Health Data"
            onPress={loadLedgerHealth}
            description="Reload notification health metrics"
          />
        </View>
      )}

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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';
import LocationService from '../../services/LocationService';
import RingerControlService from '../../services/RingerControlService';
import MosqueModeService from '../../services/MosqueModeService';

type SetupHealthScreenProps = {
  onDone?: () => void;
  navigation?: any;
};

const SetupHealthScreen: React.FC<SetupHealthScreenProps> = ({ onDone, navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { userSettings } = useStore();
  const { todayPrayerTimes, nextPrayer, hasValidLocation, isLoading, refreshPrayerTimes } = usePrayerTimes();

  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationStatus, setLocationStatus] = useState<{ hasPermission: boolean; servicesEnabled: boolean } | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [lastReschedule, setLastReschedule] = useState<string | null>(null);
  const [canModifyDnd, setCanModifyDnd] = useState<boolean | null>(null);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);

  const calculationMethodLabel = useMemo(() => userSettings?.calculationMethod || 'Unknown', [userSettings?.calculationMethod]);

  const openAppSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    const perm = await Notifications.getPermissionsAsync();
    setNotifPermission(perm.status);

    const loc = await LocationService.getLocationAccuracy();
    setLocationStatus(loc);

    const debug = await NotificationService.getDebugInfo();
    setScheduledCount(debug.totalScheduledCount);

    setLastReschedule(StorageService.getValue('last_batch_schedule_date'));

    if (Platform.OS === 'android') {
      const can = await RingerControlService.canModify();
      setCanModifyDnd(can);
    } else {
      setCanModifyDnd(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stop adhan when leaving the screen
  useEffect(() => {
    return () => {
      NotificationService.stopAdhan();
    };
  }, []);

  // Re-check statuses when app returns to foreground (e.g. after granting DND access)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  const handleBackOrDone = () => {
    NotificationService.stopAdhan();
    setIsAdhanPlaying(false);
    if (onDone) {
      onDone();
      return;
    }
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const toggleAdhanPlayback = () => {
    if (isAdhanPlaying) {
      NotificationService.stopAdhan();
      setIsAdhanPlaying(false);
    } else {
      setIsAdhanPlaying(true);
      NotificationService.playFullAdhan(() => setIsAdhanPlaying(false));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {/* <Text style={[styles.title, { color: theme.colors.text.primary }]}>Setup & Health</Text> */}
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>Verify everything is working</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Prayer Times</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>
            Location: {hasValidLocation ? '✅ Set' : '❌ Missing'}
          </Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Method: {calculationMethodLabel}</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Loaded: {isLoading ? '⏳ Loading…' : `${todayPrayerTimes.length} prayers`}</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Next: {nextPrayer?.name || 'None'}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary.DEFAULT }]}
            onPress={async () => {
              await refreshPrayerTimes();
              await refresh();
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary.contrast }]}>Refresh Prayer Times</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Notifications</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Permission: {notifPermission === 'granted' ? '✅ Granted' : '❌ Blocked'}</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Scheduled: {scheduledCount}</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Last reschedule: {lastReschedule ? new Date(lastReschedule).toLocaleString() : 'Never'}</Text>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
              onPress={openAppSettings}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Open App Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
              onPress={async () => {
                await NotificationService.sendTestNotification();
                await refresh();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Send Test</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.buttonSecondary, isAdhanPlaying && { borderColor: theme.colors.status?.error || '#FF6B6B', backgroundColor: (theme.colors.status?.error || '#FF6B6B') + '15' }, { borderColor: theme.colors.border.primary }]}
              onPress={toggleAdhanPlayback}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonSecondaryText, { color: isAdhanPlaying ? (theme.colors.status?.error || '#FF6B6B') : theme.colors.text.primary }]}>{isAdhanPlaying ? '⏹ Stop Adhan' : 'Test Adhan'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
              onPress={async () => {
                await NotificationService.forceReschedule();
                await refresh();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Location</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Permission: {locationStatus?.hasPermission ? '✅ Granted' : '❌ Blocked'}</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Services: {locationStatus?.servicesEnabled ? '✅ Enabled' : '❌ Disabled'}</Text>

          <TouchableOpacity
            style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
            onPress={openAppSettings}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Open App Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>Mosque Mode</Text>
          <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>Enabled: {userSettings?.mosqueMode?.enabled ? '✅ On' : '❌ Off'}</Text>
          {Platform.OS === 'android' && (
            <Text style={[styles.rowText, { color: theme.colors.text.secondary }]}>DND access: {canModifyDnd === null ? '⏳ Checking…' : canModifyDnd ? '✅ Granted' : '❌ Not granted'}</Text>
          )}

          {Platform.OS === 'android' && (
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
                onPress={async () => {
                  await RingerControlService.openNotificationPolicyAccessSettings();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Grant DND Access</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: theme.colors.border.primary }]}
                onPress={async () => {
                  await MosqueModeService.scheduleTestMosqueMode();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonSecondaryText, { color: theme.colors.text.primary }]}>Test Mosque Mode</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.doneButton, { borderColor: theme.colors.border.primary }]}
          onPress={handleBackOrDone}
          activeOpacity={0.8}
        >
          <Text style={[styles.doneButtonText, { color: theme.colors.text.primary }]}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: theme.spacing.xs + 2,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
  },
  card: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md + 2,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyBold,
    marginBottom: theme.spacing.md - 2,
  },
  rowText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    marginBottom: theme.spacing.xs + 2,
  },
  button: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md - 2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md - 2,
    marginTop: theme.spacing.md - 2,
  },
  buttonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md - 2,
    paddingVertical: theme.spacing.md - 2,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  doneButton: {
    marginTop: theme.spacing.xl - 2,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 2,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyBold,
  },
});

export default SetupHealthScreen;

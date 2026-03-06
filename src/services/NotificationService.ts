// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';
import ReminderStateService from './ReminderStateService';
import { format } from 'date-fns';
import { CHANNELS, SOUNDS, NOTIFICATION_CHANNEL_VERSION, NOTIFICATION_SCHEDULING_DAYS, NOTIFICATION_LOWER_TIER_DAYS, NOTIFICATION_MAX_FUTURE_DAYS, IOS_NOTIFICATION_CAP } from '../constants/NotificationConstants';
import MosqueModeService from './MosqueModeService';
import { NOTIFICATION_CATEGORIES, initializeChannelsAndCategories } from './notifications/NotificationChannels';
import AdhanPlayer from './notifications/AdhanPlayer';
import { scheduleFullAdhan, cancelAllFullAdhans, stopFullAdhan } from './notifications/FullAdhanScheduler';
import { scheduleTier2PersistentReminders, scheduleTier3GracePeriodWarning } from './notifications/HabitBuilderNotifications';
import { isValidCoordinates } from '../utils/locationValidation';
import logger from '../utils/logger';
import AnalyticsService from './AnalyticsService';

// NOTIFICATION_CATEGORIES now imported from ./notifications/NotificationChannels

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isTest = data?.type === 'test';
    const isAdhan = data?.type === 'prayer-time' || isTest;

    // On Android foreground, suppress channel sound for adhan notifications
    // ONLY when adhan is actually enabled (AdhanPlayer handles playback).
    // If adhan is off, let the notification play its own channel sound normally.
    const currentSettings = StorageService.getUserSettings();
    const adhanEnabled = currentSettings?.notifications?.enabled && currentSettings?.notifications?.adhanEnabled;
    const suppressSound = Platform.OS === 'android' && isAdhan && !!adhanEnabled;

    return {
      shouldShowAlert: !isTest || Platform.OS === 'ios',
      shouldPlaySound: !suppressSound,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

interface NotificationContent {
  title: string;
  body: string;
  subtitle?: string;
}

// Lightweight interface for prayer times
interface PrayerTimesSource {
  getTodayPrayerTimes: () => PrayerTime[];
  getNextPrayer: () => PrayerTime | null;
  isLoading: () => boolean;
  hasValidLocation: () => boolean;
}

type PrayerTimesFetcher = (params: {
  location: UserSettings['location'];
  date: Date;
  calculationMethod: UserSettings['calculationMethod'];
  adjustments?: UserSettings['adjustments'];
  asrJuristic?: UserSettings['asrJuristic'];
}) => Promise<{ prayerTimes: PrayerTime[]; sunrise: Date; sunset: Date }>;

class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private notificationCache = new Map<string, string>();
  private navigationHandler: ((prayer: PrayerName, action: string) => void) | null = null;

  private acquireSchedulingLock(): boolean {
    const lockTime = StorageService.getValue('notification_scheduling_lock');
    if (lockTime) {
      const elapsed = Date.now() - parseInt(lockTime, 10);
      if (elapsed < 120_000) return false; // Lock held < 2 min → scheduling in progress
      // Lock is stale (>2 min) → previous run crashed, steal it
    }
    StorageService.setValue('notification_scheduling_lock', Date.now().toString());
    return true;
  }

  private releaseSchedulingLock(): void {
    StorageService.deleteValue('notification_scheduling_lock');
  }

  private prayerTimesSource: PrayerTimesSource | null = null;
  private prayerTimesFetcher: PrayerTimesFetcher | null = null;

  private getScheduleFingerprint(settings: UserSettings): string {
    const roundCoord = (n: number) => Math.round(n * 10000) / 10000;
    return JSON.stringify({
      location: settings.location
        ? {
          latitude: roundCoord(settings.location.latitude),
          longitude: roundCoord(settings.location.longitude),
        }
        : null,
      calculationMethod: settings.calculationMethod,
      adjustments: settings.adjustments || null,
      asrJuristic: settings.asrJuristic || null,
      notifications: settings.notifications,
      prayerNotifications: settings.prayerNotifications || null,
      habitBuilder: settings.habitBuilder || null,
      fullAdhanEnabled: settings.notifications.fullAdhanEnabled || false,
      schedulingDays: NOTIFICATION_SCHEDULING_DAYS,
      lowerTierDays: NOTIFICATION_LOWER_TIER_DAYS,
      channelVersion: NOTIFICATION_CHANNEL_VERSION,
    });
  }

  private isPrayerNotificationType(type: unknown): boolean {
    if (typeof type !== 'string') return false;
    return (
      type === 'pre-prayer' ||
      type === 'prayer-time' ||
      type === 'post-prayer-check' ||
      type === 'mindfulness-reminder' ||
      type === 'snoozed' ||
      type === 'tier2-reminder' ||
      type === 'tier3-warning'
    );
  }

  private getTriggerDate(trigger: unknown): Date | null {
    const t = trigger as unknown as { date?: unknown; value?: unknown } | null;
    const raw = t?.date ?? t?.value;
    if (!raw) return null;
    const d = new Date(raw as string | number | Date);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  private async cleanupPastPrayerNotifications(
    cutoff: Date,
    cachedScheduled?: Notifications.NotificationRequest[]
  ): Promise<number> {
    const scheduled = cachedScheduled || await Notifications.getAllScheduledNotificationsAsync();
    const toCancel: string[] = [];

    for (const notif of scheduled) {
      const data = (notif.content?.data || {}) as Record<string, unknown>;
      if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) continue;
      if (!this.isPrayerNotificationType(data?.type)) continue;

      const triggerDate = this.getTriggerDate(notif.trigger);
      if (!triggerDate) continue;
      if (triggerDate.getTime() < cutoff.getTime()) {
        toCancel.push(notif.identifier);
      }
    }

    if (toCancel.length > 0) {
      await Promise.all(toCancel.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    }

    return toCancel.length;
  }

  async maybeRescheduleExtendedNotifications(hoursThreshold: number = 12): Promise<boolean> {
    try {
      const lastRunStr = StorageService.getValue('last_batch_schedule_date');
      const lastRun = lastRunStr ? new Date(lastRunStr) : new Date(0);
      const now = new Date();
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastRun > hoursThreshold) {
        await this.scheduleExtendedNotifications();
        StorageService.setValue('last_batch_schedule_date', now.toISOString());
        return true;
      }

      return false;
    } catch (error) {
      logger.error('❌ Reschedule failed:', error);
      return false;
    }
  }

  // Set the prayer times source
  setPrayerTimesSource(source: PrayerTimesSource) {
    this.prayerTimesSource = source;
    logger.log('✅ Prayer times source connected to NotificationService');
  }

  setPrayerTimesFetcher(fetcher: PrayerTimesFetcher) {
    this.prayerTimesFetcher = fetcher;
    logger.log('✅ Prayer times fetcher connected to NotificationService');
  }

  // Register a handler function that will be called when navigation is needed
  registerNavigationHandler(handler: (prayer: PrayerName, action: string) => void) {
    this.navigationHandler = handler;
    logger.log('✅ Navigation handler registered');
  }

  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.log('📵 Notification permissions not granted');
        return false;
      }

      // Set up Audio Mode
      await AdhanPlayer.configureAudioMode();

      // Set up notification channels (Android) and categories (iOS)
      await initializeChannelsAndCategories();

      // Clean up old reminder states (Prayer Habit Builder)
      ReminderStateService.cleanupOldStates();

      // Set up listeners
      this.setupListeners();

      logger.log('✅ NotificationService initialized');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      logger.log('📱 Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch {
      return 'undetermined' as Notifications.PermissionStatus;
    }
  }

  // Channel setup delegated to notifications/NotificationChannels.ts


  // Category setup delegated to notifications/NotificationChannels.ts

  private setupListeners() {
    // Handle notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      logger.log('🔔 Notification received:', notification.request.content.title);

      // Auto-play adhan for test notifications when app is in foreground
      // This is necessary because Android doesn't play channel-specific sounds in foreground
      const data = notification.request.content.data;
      if ((data?.type === 'test' || data?.type === 'prayer-time') && Platform.OS === 'android') {
        const currentSettings = StorageService.getUserSettings();
        const adhanOn = currentSettings?.notifications?.enabled && currentSettings?.notifications?.adhanEnabled;
        if (!adhanOn) {
          logger.log('🔇 Adhan disabled in settings — skipping playback');
        } else if (currentSettings?.notifications?.fullAdhanEnabled) {
          // When Full Adhan foreground service is active, it handles audio — skip AdhanPlayer
          logger.log('🎵 Full Adhan service handling audio — skipping AdhanPlayer');
        } else {
          logger.log('🎵 Playing adhan for prayer notification in foreground');
          this.playFullAdhan();
        }
      }
    });

    // Handle notification responses (taps, actions)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification, actionIdentifier } = response;
      const data = notification.request.content.data;

      // Log notification tap
      AnalyticsService.logEvent('notification_tapped', {
        action: actionIdentifier,
        prayer: (data?.prayer as string) || 'unknown',
        type: (data?.type as string) || 'unknown',
      });

      // If user taps the notification itself
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Mosque mode prompt: store pending prayer and navigate to Home
        if (data?.type === 'mosque_mode_prompt' && data?.prayer) {
          const { useStore } = require('../store/useStore');
          useStore.getState().setPendingMosquePromptPrayer(data.prayer as PrayerName);
          if (this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'default');
          }
          logger.log('🕌 Mosque mode prompt tapped for:', data.prayer);
        }
        // Play adhan for both prayer-time and test notifications (only if adhan is enabled)
        else if ((data?.type === 'prayer-time' || data?.type === 'test') && (data?.prayer || data?.type === 'test')) {
          const tapSettings = StorageService.getUserSettings();
          const tapAdhanOn = tapSettings?.notifications?.enabled && tapSettings?.notifications?.adhanEnabled;
          if (Platform.OS === 'android' && tapSettings?.notifications?.fullAdhanEnabled) {
            // If Full Adhan service is running, stop it (user is now in-app)
            stopFullAdhan();
          } else if (tapAdhanOn) {
            // Play full adhan inside app (for immersive experience)
            this.playFullAdhan();
          }

          // Only navigate if it's a prayer-time notification with prayer data
          if (data?.prayer && this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'default');
          }
        }
      }

      switch (actionIdentifier) {
        case 'snooze':
          if (data?.prayer && data?.prayerId) {
            this.stopAdhan(); // Stop adhan if playing
            // Get user's snooze preferences
            const settings = StorageService.getUserSettings();
            const snoozeInterval = settings?.habitBuilder?.snooze?.defaultInterval || 10;

            // Check max snoozes
            const maxSnoozes = settings?.habitBuilder?.snooze?.maxSnoozesPerPrayer || 5;
            if (ReminderStateService.hasReachedMaxSnoozes(data.prayerId as string, maxSnoozes)) {
              logger.log('⚠️ Max snoozes reached for', data.prayerId);
              // Still allow one more snooze
            }
            // Increment snooze count and schedule snooze
            ReminderStateService.incrementSnoozeCount(data.prayerId as string);
            await this.snoozePrayerNotification(data.prayer as PrayerName, snoozeInterval, data.prayerId as string);
          }
          break;

        case 'complete':
        case 'mark_prayed': // DEPRECATED - keeping for compatibility
          if (data?.prayer) {
            this.stopAdhan();
            if (this.navigationHandler) {
              this.navigationHandler(data.prayer as PrayerName, 'complete');
            }
            logger.log('✅ Mark prayer complete:', data.prayer);
          }
          break;

        // PRAYER HABIT BUILDER ACTIONS
        case 'yes_prayed':
          if (data?.prayerId && data?.prayer) {
            this.stopAdhan();
            // Mark as completed in reminder state
            ReminderStateService.markPrayerCompleted(data.prayerId as string);
            // Cancel all future reminders for this prayer
            await this.cancelPrayerReminderFlow(data.prayerId as string);
            // Navigate to complete prayer flow
            if (this.navigationHandler) {
              this.navigationHandler(data.prayer as PrayerName, 'complete');
            }
          }
          break;

        case 'snooze_prayer':
          if (data?.prayerId && data?.prayer) {
            // Snooze for user's preferred interval
            const settingsSnooze = StorageService.getUserSettings();
            const snoozeIntervalCustom = settingsSnooze?.habitBuilder?.snooze?.defaultInterval || 10;

            ReminderStateService.incrementSnoozeCount(data.prayerId as string);
            await this.snoozePrayerNotification(data.prayer as PrayerName, snoozeIntervalCustom, data.prayerId as string);

            logger.log(`⏰ Prayer ${data.prayerId} snoozed for ${snoozeIntervalCustom} min`);
          }
          break;

        case 'skip_prayer':
          if (data?.prayerId && data?.prayer) {
            // User explicitly chose to skip
            ReminderStateService.markPrayerSkipped(data.prayerId as string);

            // Cancel all future reminders for this prayer
            await this.cancelPrayerReminderFlow(data.prayerId as string);

            AnalyticsService.logPrayerMissed(data.prayer as string);
            logger.log('⏭️ Prayer skipped:', data.prayerId);
          }
          break;

        case 'pray_now':
          // Grace period warning - open mindfulness flow
          if (data?.prayer && this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'prepare');
          }
          logger.log('🕌 Opening prayer flow from grace period warning');
          break;

        case 'prepare':
          // Navigate to mindfulness flow
          if (data?.prayer && this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'prepare');
          }
          logger.log('🧘 Open mindfulness flow for:', data?.prayer);
          break;

        default:
          // Handle mosque mode notifications
          if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) {
            await MosqueModeService.handleNotificationResponse(data);
          }
          // Already handled above for DEFAULT_ACTION_IDENTIFIER
          break;
      }
    });
  }

  // 🎵 AUDIO PLAYBACK — delegated to AdhanPlayer
  playFullAdhan(onComplete?: () => void) {
    AdhanPlayer.play(onComplete);
  }

  stopAdhan() {
    AdhanPlayer.stop();
    // Also stop the foreground service if running (Android full Adhan)
    if (Platform.OS === 'android') {
      stopFullAdhan();
    }
  }

  get isAdhanPlaying(): boolean {
    return AdhanPlayer.playing;
  }

  // 🚀 MAIN ENTRY POINT - Now simply delegates to the 14-day batch scheduler
  async scheduleAllPrayerNotifications() {
    try {
      const settings = StorageService.getUserSettings();
      if (!settings || !settings.notifications.enabled) {
        logger.log('📵 Notifications disabled in settings');
        return;
      }

      if (!isValidCoordinates(settings.location)) {
        logger.log('❌ No valid location for notifications');
        return;
      }

      logger.log('🗓️ Scheduling prayer notifications...');

      // Simply call the extended scheduler - it handles everything
      await this.scheduleExtendedNotifications();

    } catch (error) {
      logger.error('❌ Failed to schedule notifications:', error);
    }
  }

  // === PER-TIER SCHEDULING METHODS (used by horizontal passes) ===

  private async scheduleMainPrayerNotification(
    prayer: PrayerTime,
    settings: UserSettings,
    existingIdentifiers: Set<string>,
    iosCounter?: { count: number }
  ): Promise<boolean> {
    const { notifications, prayerNotifications } = settings;
    if (prayerNotifications && !prayerNotifications[prayer.name]) return false;

    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    const dateStr = format(prayer.time, 'yyyy-MM-dd');
    const prayerId = `${prayer.name}-${dateStr}`;
    const prayerIdentifier = `prayer-${prayer.name}-${dateStr}`;

    if (existingIdentifiers.has(prayerIdentifier)) return true; // Already scheduled

    if (Platform.OS === 'ios' && iosCounter && iosCounter.count >= IOS_NOTIFICATION_CAP) {
      logger.log(`🚫 iOS cap reached (${iosCounter.count}), skipping main ${prayer.name}`);
      return false;
    }

    // Hybrid Audio Logic
    let soundAsset: string | undefined = undefined;
    let androidChannel = CHANNELS.DEFAULT;
    const useFullAdhan = Platform.OS === 'android' && notifications.fullAdhanEnabled && notifications.adhanEnabled;
    if (notifications.enabled && notifications.adhanEnabled) {
      if (useFullAdhan) {
        // Full Adhan mode: silent channel (audio from foreground service)
        soundAsset = undefined;
        androidChannel = CHANNELS.ADHAN_SILENT;
      } else {
        soundAsset = Platform.OS === 'ios' ? SOUNDS.IOS_SHORT : SOUNDS.ANDROID_SHORT;
        androidChannel = CHANNELS.ADHAN;
      }
    } else if (notifications.enabled && notifications.soundEnabled) {
      soundAsset = 'default';
    }

    const mainContent = this.getPrayerTimeContent(prayerName, prayer.name);

    await Notifications.scheduleNotificationAsync({
      content: {
        ...mainContent,
        data: {
          prayer: prayer.name,
          prayerId,
          type: 'prayer-time',
          time: prayer.time.toISOString(),
          scheduledAt: new Date().toISOString(),
        },
        sound: soundAsset,
        categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
      },
      trigger: {
        type: 'date',
        date: prayer.time,
        ...(Platform.OS === 'android' && { channelId: androidChannel }),
      } as Notifications.NotificationTriggerInput,
      identifier: prayerIdentifier,
    });

    existingIdentifiers.add(prayerIdentifier);
    if (iosCounter) iosCounter.count++;

    // Schedule native full Adhan alarm (Android foreground service)
    if (useFullAdhan) {
      const displayName = PrayerTimeService.getPrayerDisplayName(prayer.name);
      await scheduleFullAdhan(prayer.time, prayer.name, displayName);
    }

    return true;
  }

  private async schedulePrePrayerNotification(
    prayer: PrayerTime,
    settings: UserSettings,
    existingIdentifiers: Set<string>,
    iosCounter?: { count: number }
  ): Promise<void> {
    const { notifications, prayerNotifications } = settings;
    if (prayerNotifications && !prayerNotifications[prayer.name]) return;
    if (notifications.beforePrayer <= 0) return;

    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    const dateStr = format(prayer.time, 'yyyy-MM-dd');
    const prayerId = `${prayer.name}-${dateStr}`;
    const preNotificationTime = new Date(prayer.time.getTime() - notifications.beforePrayer * 60000);

    if (preNotificationTime <= new Date()) return;

    const preIdentifier = `pre-${prayer.name}-${dateStr}`;
    if (existingIdentifiers.has(preIdentifier)) return;

    if (Platform.OS === 'ios' && iosCounter && iosCounter.count >= IOS_NOTIFICATION_CAP) {
      logger.log(`🚫 iOS cap reached (${iosCounter.count}), skipping pre-prayer ${prayer.name}`);
      return;
    }

    const content = this.getPrePrayerContent(prayerName, notifications.beforePrayer);

    await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        data: {
          prayer: prayer.name,
          prayerId,
          type: 'pre-prayer',
          time: prayer.time.toISOString(),
          scheduledAt: new Date().toISOString(),
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.PRE_PRAYER,
      },
      trigger: {
        type: 'date',
        date: preNotificationTime,
        ...(Platform.OS === 'android' && { channelId: CHANNELS.PRE_PRAYER }),
      } as Notifications.NotificationTriggerInput,
      identifier: preIdentifier,
    });

    existingIdentifiers.add(preIdentifier);
    if (iosCounter) iosCounter.count++;
  }

  private async scheduleLegacyPostPrayerCheck(
    prayer: PrayerTime,
    nextPrayer: PrayerTime | null,
    sunrise: Date,
    settings: UserSettings,
    existingIdentifiers: Set<string>,
    iosCounter?: { count: number }
  ): Promise<void> {
    if (!settings.notifications.postPrayerCheck) return;
    const { prayerNotifications } = settings;
    if (prayerNotifications && !prayerNotifications[prayer.name]) return;

    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    const dateStr = format(prayer.time, 'yyyy-MM-dd');
    const prayerId = `${prayer.name}-${dateStr}`;
    const deadline = prayer.name === 'Fajr' && sunrise ? sunrise : nextPrayer?.time || undefined;

    let postCheckTime = new Date(prayer.time.getTime() + 15 * 60000);
    if (deadline && postCheckTime >= deadline) {
      postCheckTime = new Date(deadline.getTime() - 5 * 60000);
    }

    if (postCheckTime <= new Date()) return;

    const checkIdentifier = `check-${prayer.name}-${dateStr}`;
    if (existingIdentifiers.has(checkIdentifier)) return;

    if (Platform.OS === 'ios' && iosCounter && iosCounter.count >= IOS_NOTIFICATION_CAP) {
      logger.log(`🚫 iOS cap reached (${iosCounter.count}), skipping post-prayer check ${prayer.name}`);
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${prayerName} Prayer`,
        body: 'Tap to mark your prayer and add a reflection',
        data: {
          prayer: prayer.name,
          prayerId,
          type: 'post-prayer-check',
          time: prayer.time.toISOString(),
          scheduledAt: new Date().toISOString(),
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK,
      },
      trigger: {
        type: 'date',
        date: postCheckTime,
        ...(Platform.OS === 'android' && { channelId: CHANNELS.DEFAULT }),
      } as Notifications.NotificationTriggerInput,
      identifier: checkIdentifier,
    });

    existingIdentifiers.add(checkIdentifier);
    if (iosCounter) iosCounter.count++;
  }

  private async scheduleKeepAliveNotification(iosCounter?: { count: number }): Promise<void> {
    const keepAliveTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    try {
      if (Platform.OS === 'ios' && iosCounter && iosCounter.count >= IOS_NOTIFICATION_CAP) {
        logger.log(`🚫 iOS cap reached, skipping keep-alive notification`);
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keep Your Prayer Reminders Active',
          body: 'Tap here to ensure your Adhan and prayer notifications continue.',
          data: { type: 'keepalive' },
          ...(Platform.OS === 'android' && { channelId: CHANNELS.DEFAULT }),
        },
        trigger: {
          type: 'date',
          date: keepAliveTime,
          ...(Platform.OS === 'android' && { channelId: CHANNELS.DEFAULT }),
        } as Notifications.NotificationTriggerInput,
        identifier: 'notification-keepalive',
      });
      if (iosCounter) iosCounter.count++;
      logger.log(`🔄 Keep-alive notification scheduled for ${format(keepAliveTime, 'yyyy-MM-dd HH:mm')}`);
    } catch (error) {
      logger.error('❌ Failed to schedule keep-alive:', error);
    }
  }

  // Mindfulness reminders
  async scheduleMindfulnessReminder(prayerName: PrayerName, delayMinutes: number = 30) {
    const reminderTime = new Date(Date.now() + delayMinutes * 60000);
    const displayName = PrayerTimeService.getPrayerDisplayName(prayerName);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mindful Moment 🧘‍♂️',
        body: `Take a moment to prepare your heart for ${displayName} prayer`,
        data: {
          prayer: prayerName,
          type: 'mindfulness-reminder',
          scheduledAt: new Date().toISOString(),
        },
      },
      trigger: {
        type: 'date',
        date: reminderTime,
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.MINDFULNESS,
        }),
      } as Notifications.NotificationTriggerInput,
      identifier: `mindfulness-${prayerName}-${Date.now()}`,
    });
  }

  private getPrePrayerContent(prayerName: string, minutes: number): NotificationContent {
    const messages = [
      `${prayerName} prayer in ${minutes} minutes — time to prepare your heart`,
      `${minutes} minutes until ${prayerName}. Begin your mindful preparation`,
      `${prayerName} approaching in ${minutes} minutes. Find your peaceful space`,
      `${prayerName} in ${minutes} minutes — a moment of stillness awaits`,
    ];

    return {
      title: `${prayerName} Prayer Soon`,
      body: messages[Math.floor(Math.random() * messages.length)],
      subtitle: 'Tap to begin mindfulness exercise',
    };
  }

  private getPrayerTimeContent(displayName: string, prayerKey: string): NotificationContent {
    const contextualMessages: Record<string, string[]> = {
      Fajr: [
        'Rise and shine! Start your day with prayer 🌅',
        'A blessed morning begins with Fajr 🌙',
        'The dawn prayer awaits you ☀️',
      ],
      Dhuhr: [
        'Take a break from the world, connect with Allah 🕌',
        'Pause your day for Dhuhr prayer 🌞',
        'Time for the midday prayer ☀️',
      ],
      Asr: [
        'The afternoon prayer brings peace to your day 🌤',
        'Take a moment for Asr prayer 🍃',
        'Refresh your soul with the afternoon prayer 🌿',
      ],
      Maghrib: [
        'As the sun sets, turn to prayer 🌇',
        'End your day with gratitude in Maghrib 🌅',
        'The sunset prayer is here 🌆',
      ],
      Isha: [
        'End your day in peace with Isha 🌙',
        'The night prayer brings tranquility 💫',
        'Close your day with the final prayer ⭐',
      ],
    };

    const messages = contextualMessages[prayerKey] || [`Time for ${displayName} prayer 🕌`];

    return {
      title: `${displayName} Prayer Time`,
      body: messages[Math.floor(Math.random() * messages.length)],
    };
  }

  async snoozePrayerNotification(prayerName: PrayerName, minutes: number, prayerId?: string) {
    const snoozeTime = new Date(Date.now() + minutes * 60000);
    const displayName = PrayerTimeService.getPrayerDisplayName(prayerName);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${displayName} Prayer`,
        body: `A gentle reminder for ${displayName} 🤲`,
        data: {
          prayer: prayerName,
          prayerId: prayerId || `${prayerName}-${format(new Date(), 'yyyy-MM-dd')}`,
          type: 'snoozed',
          scheduledAt: new Date().toISOString(),
        },
        sound: 'default',
        categoryIdentifier: NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK, // Use Tier 2 category
      },
      trigger: {
        type: 'date',
        date: snoozeTime,
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.DEFAULT,
        }),
      } as Notifications.NotificationTriggerInput,
      identifier: `snooze-${prayerName}-${Date.now()}`,
    });
    logger.log(`⏰ Snooze scheduled for ${displayName} in ${minutes} min`);
  }

  async cancelPrayerNotifications(prayerName: PrayerName) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((notif) => {
      const data = notif.content.data as any;
      if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) return false;
      return data?.prayer === prayerName;
    });

    if (toCancel.length > 0) {
      await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    }
  }

  async cancelAllPrayerNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotificationTypes = new Set([
      'pre-prayer',
      'prayer-time',
      'post-prayer-check',
      'mindfulness-reminder',
      'snoozed',
      'tier2-reminder',
      'tier3-warning',
      'keepalive',
    ]);

    const prayerNotifications = scheduled.filter((notif) => {
      const data = notif.content.data as any;
      if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) return false;
      if (data?.type && prayerNotificationTypes.has(data.type)) return true;
      return false;
    });

    if (prayerNotifications.length > 0) {
      await Promise.all(
        prayerNotifications.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    }

    // Also cancel any scheduled full Adhan foreground service alarms
    await cancelAllFullAdhans();

    logger.log(`🗑️ Cancelled ${prayerNotifications.length} prayer notifications`);
  }

  /**
* Cancel all notifications for a specific prayer reminder flow
* (Tier 1, Tier 2, Tier 3, and any snoozes)
*/
  async cancelPrayerReminderFlow(prayerId: string): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (notif) => notif.content.data?.prayerId === prayerId
    );
    if (toCancel.length > 0) {
      await Promise.all(
        toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
    }
    logger.log(`🗑️ Cancelled ${toCancel.length} notifications for ${prayerId}`);
  }

  // Tier 2/3 scheduling delegated to notifications/HabitBuilderNotifications.ts

  // Better integration with settings updates
  async updateNotificationSettings(settings: Partial<UserSettings['notifications']>) {
    const currentSettings = StorageService.getUserSettings();
    if (!currentSettings) return;

    const updatedSettings = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        ...settings,
      },
    };

    StorageService.setUserSettings(updatedSettings);

    // Stop any currently-playing adhan if adhan or notifications were just disabled
    if (!updatedSettings.notifications.enabled || !updatedSettings.notifications.adhanEnabled) {
      this.stopAdhan();
    }

    if (updatedSettings.notifications.enabled) {
      await this.scheduleAllPrayerNotifications();
    } else {
      await this.cancelAllPrayerNotifications();
    }
  }

  // Scheduling progress (0-1) for UI progress indicators
  schedulingProgress: number = 0;

  // 📅 SPLIT-TIER HORIZONTAL SCHEDULING
  // Tier 1 (Adhan) → 3 days | Pre-prayer, Tier 3, Tier 2 → 2 days
  // Called by useNotificationRescheduler hook every ~12h and background task every ~24h
  async scheduleExtendedNotifications(
    onProgress?: (day: number, total: number) => void
  ) {
    if (!this.acquireSchedulingLock()) {
      logger.log('🔒 Scheduling already in progress, skipping');
      return;
    }

    this.schedulingProgress = 0;
    try {
      logger.log('🗓️ Starting split-tier horizontal scheduling...');

      const settings = StorageService.getUserSettings();
      if (!settings?.notifications.enabled || !isValidCoordinates(settings.location)) {
        logger.log('📵 Notifications disabled or no location');
        return;
      }

      const fingerprint = this.getScheduleFingerprint(settings);
      const previousFingerprint = StorageService.getValue('notification_schedule_fingerprint');
      const shouldRebuild = previousFingerprint !== fingerprint;

      if (shouldRebuild) {
        await this.cancelAllPrayerNotifications();
        StorageService.setValue('notification_schedule_fingerprint', fingerprint);
      }

      // Get ALL scheduled notifications once for the entire scheduling cycle
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      // Reuse cached list to avoid a second native bridge call
      await this.cleanupPastPrayerNotifications(new Date(), scheduled);

      // Clean up stale reminder states on every reschedule (not just cold start)
      ReminderStateService.cleanupOldStates();
      const existingIdentifiers = new Set<string>();
      for (const notif of scheduled) {
        const data = (notif.content?.data || {}) as Record<string, unknown>;
        if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) continue;
        if (!this.isPrayerNotificationType(data?.type)) continue;
        existingIdentifiers.add(notif.identifier);
      }

      // iOS: count ALL scheduled notifications (global budget, not just prayer types)
      const iosCounter = Platform.OS === 'ios'
        ? { count: scheduled.length }
        : undefined;

      const today = new Date();
      const now = new Date();

      const fetcher: PrayerTimesFetcher =
        this.prayerTimesFetcher ||
        ((params) =>
          PrayerTimeService.getPrayerTimesList(
            params.location as any,
            params.date,
            params.calculationMethod as any,
            params.adjustments as any,
            (params.asrJuristic as any) || 'Standard'
          ));

      // Step 0: Fetch prayer times for all days upfront (max of Tier 1 horizon)
      interface DayPrayerData {
        prayers: PrayerTime[];
        sunrise: Date;
      }
      const allDays: DayPrayerData[] = [];

      for (let i = 0; i < NOTIFICATION_SCHEDULING_DAYS; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        try {
          const prayerData = await fetcher({
            location: settings.location,
            date,
            calculationMethod: settings.calculationMethod,
            adjustments: settings.adjustments,
            asrJuristic: settings.asrJuristic,
          });
          allDays.push({ prayers: prayerData.prayerTimes, sunrise: prayerData.sunrise });
        } catch (error) {
          logger.error(`❌ Failed to fetch day ${i}:`, error);
          allDays.push({ prayers: [], sunrise: new Date() });
        }

        this.schedulingProgress = (i + 1) / (NOTIFICATION_SCHEDULING_DAYS * 2);
        onProgress?.(i + 1, NOTIFICATION_SCHEDULING_DAYS);
      }

      // Initialize reminder states for all prayers (needed for Tier 2/3)
      for (const { prayers } of allDays) {
        for (let j = 0; j < prayers.length; j++) {
          const prayer = prayers[j];
          const nextPrayer = prayers[j + 1] || null;
          if (prayer.time > now && settings.habitBuilder?.enabled) {
            ReminderStateService.initializePrayerReminder(prayer, nextPrayer);
          }
        }
      }

      // === HORIZONTAL PASSES (priority order) ===

      // PASS 1: Tier 1 (Main Adhan) — NOTIFICATION_SCHEDULING_DAYS (3 days)
      logger.log('📢 Pass 1: Scheduling Tier 1 (Adhan) for 3 days...');
      for (let dayIdx = 0; dayIdx < NOTIFICATION_SCHEDULING_DAYS && dayIdx < allDays.length; dayIdx++) {
        const { prayers } = allDays[dayIdx];
        for (const prayer of prayers) {
          if (prayer.time > now) {
            await this.scheduleMainPrayerNotification(prayer, settings, existingIdentifiers, iosCounter);
          }
        }
      }

      // PASS 2: Pre-prayer — NOTIFICATION_LOWER_TIER_DAYS (2 days)
      const lowerDays = Math.min(NOTIFICATION_LOWER_TIER_DAYS, allDays.length);
      logger.log(`🔔 Pass 2: Scheduling pre-prayer for ${lowerDays} days...`);
      for (let dayIdx = 0; dayIdx < lowerDays; dayIdx++) {
        const { prayers } = allDays[dayIdx];
        for (const prayer of prayers) {
          if (prayer.time > now) {
            await this.schedulePrePrayerNotification(prayer, settings, existingIdentifiers, iosCounter);
          }
        }
      }

      // PASS 3: Tier 3 (Grace period warnings) — 2 days
      if (settings.habitBuilder?.enabled) {
        logger.log(`⚠️ Pass 3: Scheduling Tier 3 (grace warnings) for ${lowerDays} days...`);
        for (let dayIdx = 0; dayIdx < lowerDays; dayIdx++) {
          const { prayers, sunrise } = allDays[dayIdx];
          for (let j = 0; j < prayers.length; j++) {
            const prayer = prayers[j];
            const nextPrayer = prayers[j + 1] || null;
            if (prayer.time <= now || !nextPrayer) continue;

            const dateStr = format(prayer.time, 'yyyy-MM-dd');
            const prayerId = `${prayer.name}-${dateStr}`;
            const deadline = prayer.name === 'Fajr' && sunrise ? sunrise : nextPrayer?.time || undefined;

            await scheduleTier3GracePeriodWarning(prayer, nextPrayer, prayerId, settings, existingIdentifiers, deadline, iosCounter);
          }
        }
      }

      // PASS 4: Tier 2 (Persistent reminders) — 2 days, fills remaining budget
      if (settings.habitBuilder?.enabled) {
        logger.log(`🏗️ Pass 4: Scheduling Tier 2 (reminders) for ${lowerDays} days...`);
        for (let dayIdx = 0; dayIdx < lowerDays; dayIdx++) {
          const { prayers, sunrise } = allDays[dayIdx];
          for (let j = 0; j < prayers.length; j++) {
            const prayer = prayers[j];
            const nextPrayer = prayers[j + 1] || null;
            if (prayer.time <= now) continue;

            const dateStr = format(prayer.time, 'yyyy-MM-dd');
            const prayerId = `${prayer.name}-${dateStr}`;
            const deadline = prayer.name === 'Fajr' && sunrise ? sunrise : nextPrayer?.time || undefined;

            await scheduleTier2PersistentReminders(prayer, prayerId, settings, existingIdentifiers, deadline, iosCounter);
          }
        }
      }

      // PASS 5: Legacy post-prayer check — 2 days (for users without Habit Builder)
      if (!settings.habitBuilder?.enabled && settings.notifications.postPrayerCheck) {
        for (let dayIdx = 0; dayIdx < lowerDays; dayIdx++) {
          const { prayers, sunrise } = allDays[dayIdx];
          for (let j = 0; j < prayers.length; j++) {
            const prayer = prayers[j];
            const nextPrayer = prayers[j + 1] || null;
            if (prayer.time <= now) continue;
            await this.scheduleLegacyPostPrayerCheck(prayer, nextPrayer, sunrise, settings, existingIdentifiers, iosCounter);
          }
        }
      }

      // PASS 6: Keep-alive notification at T+48h (self-renewing safety net)
      await this.scheduleKeepAliveNotification(iosCounter);

      if (iosCounter) {
        logger.log(`📊 iOS notification count: ${iosCounter.count}/${IOS_NOTIFICATION_CAP}`);
      }

      this.schedulingProgress = 1;
      onProgress?.(NOTIFICATION_SCHEDULING_DAYS, NOTIFICATION_SCHEDULING_DAYS);
    } catch (error) {
      logger.error('❌ Extended scheduling failed:', error);
    } finally {
      this.releaseSchedulingLock();
      this.schedulingProgress = 0;
    }
  }

  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Alhamdulillah! Prayer notifications are working perfectly 🎉',
        subtitle: "You'll receive reminders for each prayer",
        data: {
          type: 'test',
          scheduledAt: new Date().toISOString(),
        },
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.DEFAULT,
        }),
      },
      trigger: null, // Immediate
    });
  }

  // Better debugging information
  async getScheduledNotifications() {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotifications = notifications.filter(
      (notif) =>
        notif.content.data?.prayer ||
        (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('prayer'))
    );

    // Sort by trigger time for better debugging
    return prayerNotifications.sort((a, b) => {
      const aTime = a.trigger && 'date' in a.trigger ? a.trigger.date : 0;
      const bTime = b.trigger && 'date' in b.trigger ? b.trigger.date : 0;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }

  // Comprehensive debugging method
  async getDebugInfo() {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduled = await this.getScheduledNotifications();
    const source = this.prayerTimesSource;

    // Tier distribution
    const tierCounts = { tier1: 0, prePrayer: 0, tier3: 0, tier2: 0, keepalive: 0, supplementary: 0, other: 0 };
    for (const n of allScheduled) {
      const type = (n.content.data?.type as string) || '';
      if (type === 'prayer-time') tierCounts.tier1++;
      else if (type === 'pre-prayer') tierCounts.prePrayer++;
      else if (type === 'tier3-warning') tierCounts.tier3++;
      else if (type === 'tier2-reminder') tierCounts.tier2++;
      else if (type === 'keepalive') tierCounts.keepalive++;
      else if (type.startsWith('ramadan') || type.startsWith('jummah') || type === 'eid' || type.startsWith('mosque_mode')) tierCounts.supplementary++;
      else tierCounts.other++;
    }

    return {
      totalScheduledCount: allScheduled.length,
      prayerScheduledCount: scheduled.length,
      iosCap: IOS_NOTIFICATION_CAP,
      tierDistribution: tierCounts,
      hasSource: !!source,
      sourceHasLocation: source?.hasValidLocation() || false,
      sourceLoading: source?.isLoading() || false,
      upcomingNotifications: scheduled.slice(0, 5).map((n) => {
        let triggerDisplay = 'Unknown';
        const t = n.trigger as any;

        if (t) {
          if (t.date) triggerDisplay = new Date(t.date).toLocaleString();
          else if (t.value) triggerDisplay = new Date(t.value).toLocaleString(); // Android often uses 'value'
          else if (t.seconds) triggerDisplay = `In ${t.seconds}s`;
        }

        return {
          id: n.identifier,
          prayer: n.content.data?.prayer,
          type: n.content.data?.type,
          trigger: triggerDisplay,
          channel: n.content.data?.channelId || 'unknown',
          scheduledAt: n.content.data?.scheduledAt,
        }
      }),
      prayerTimesInfo: source
        ? {
          todayPrayersCount: source.getTodayPrayerTimes().length,
          hasNextPrayer: !!source.getNextPrayer(),
          nextPrayerName: source.getNextPrayer()?.name || 'None',
        }
        : null,
    };
  }

  // 🧪 NEW: Dedicated Adhan Test
  async sendTestAdhanNotification() {
    logger.log('🔔 Sending Test Adhan...');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Adhan Test',
        body: 'This should play the full Adhan sound.',
        data: { type: 'test' },
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.ADHAN, // ✅ EXPLICITLY USE ADHAN CHANNEL
          priority: 'high',
        }),
      },
      trigger: null,
    });
  }

  // 🌌 TAHAJJUD ENCOURAGEMENT — gentle, occasional reminders
  private tahajjudMessages = [
    'The last third of the night... a time when du\'a is never rejected 🌌',
    'Rise for Tahajjud — even two rak\'ahs bring you closer 🤲',
    'The night is still... a beautiful time to stand before Allah 🕌',
    'Those who forsake their beds to invoke their Lord in fear and hope 💫',
    'A quiet moment with your Creator awaits — Tahajjud time 🌙',
    'The best prayer after the obligatory ones is the night prayer ⭐',
    'In the stillness of the night, hearts find their truest voice 🤲',
  ];

  async scheduleTahajjudEncouragement(): Promise<void> {
    try {
      const settings = StorageService.getUserSettings();
      if (!settings?.tahajjudReminders?.enabled) {
        logger.log('📵 Tahajjud reminders disabled');
        return;
      }

      if (!isValidCoordinates(settings.location)) {
        logger.log('❌ No valid location for Tahajjud reminders');
        return;
      }

      // Cancel existing Tahajjud notifications first
      await this.cancelTahajjudNotifications();

      const frequency = settings.tahajjudReminders.frequency || 'twice_weekly';

      // Determine which days to schedule (over next NOTIFICATION_LOWER_TIER_DAYS)
      const scheduleDays = this.getTahajjudScheduleDays(frequency);

      for (const dayOffset of scheduleDays) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);

        try {
          const fetcher: PrayerTimesFetcher =
            this.prayerTimesFetcher ||
            ((params) =>
              PrayerTimeService.getPrayerTimesList(
                params.location as any,
                params.date,
                params.calculationMethod as any,
                params.adjustments as any,
                (params.asrJuristic as any) || 'Standard'
              ));

          const prayerData = await fetcher({
            location: settings.location,
            date,
            calculationMethod: settings.calculationMethod,
            adjustments: settings.adjustments,
            asrJuristic: settings.asrJuristic,
          });

          // Get midnight time — schedule notification at midnight (start of last third)
          const midnight = (prayerData as any).midnight as Date | null;
          if (!midnight || midnight <= new Date()) continue;

          // Respect quiet hours
          if (settings.habitBuilder?.quietHours?.enabled) {
            const quietEnd = settings.habitBuilder.quietHours.end;
            if (quietEnd) {
              const [h, m] = quietEnd.split(':').map(Number);
              const quietEndDate = new Date(date);
              quietEndDate.setHours(h, m, 0, 0);
              // If midnight falls within quiet hours, skip
              if (midnight < quietEndDate) continue;
            }
          }

          const dateStr = format(midnight, 'yyyy-MM-dd');
          const identifier = `tahajjud-${dateStr}`;
          const message = this.tahajjudMessages[dayOffset % this.tahajjudMessages.length];

          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Tahajjud Time',
              body: message,
              data: {
                type: 'tahajjud-reminder',
                scheduledAt: new Date().toISOString(),
              },
              categoryIdentifier: NOTIFICATION_CATEGORIES.TAHAJJUD_REMINDER,
              ...(Platform.OS === 'android' && {
                channelId: CHANNELS.TAHAJJUD,
              }),
            },
            trigger: {
              type: 'date',
              date: midnight,
            } as Notifications.NotificationTriggerInput,
            identifier,
          });

          logger.log(`🌌 Tahajjud scheduled for ${dateStr}`);
        } catch (error) {
          logger.error(`❌ Failed to schedule Tahajjud day ${dayOffset}:`, error);
        }
      }
    } catch (error) {
      logger.error('❌ Tahajjud scheduling failed:', error);
    }
  }

  private getTahajjudScheduleDays(frequency: string): number[] {
    const days = Array.from({ length: NOTIFICATION_LOWER_TIER_DAYS }, (_, i) => i);
    switch (frequency) {
      case 'daily':
        return days;
      case 'weekdays':
        return days.filter(d => {
          const day = new Date();
          day.setDate(day.getDate() + d);
          const dow = day.getDay();
          return dow >= 1 && dow <= 5;
        });
      case 'weekends':
        return days.filter(d => {
          const day = new Date();
          day.setDate(day.getDate() + d);
          const dow = day.getDay();
          return dow === 0 || dow === 6;
        });
      case 'twice_weekly':
      default:
        return days.filter(d => {
          const day = new Date();
          day.setDate(day.getDate() + d);
          const dow = day.getDay();
          return dow === 1 || dow === 4;
        });
    }
  }

  async cancelTahajjudNotifications(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const tahajjudNotifs = scheduled.filter(
      (notif) => (notif.content.data as any)?.type === 'tahajjud-reminder'
    );
    if (tahajjudNotifs.length > 0) {
      await Promise.all(
        tahajjudNotifs.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
      logger.log(`🗑️ Cancelled ${tahajjudNotifs.length} Tahajjud notifications`);
    }
  }

  // Force rescheduling method for debugging
  async forceReschedule() {
    logger.log('🔧 Force rescheduling notifications...');
    await this.scheduleAllPrayerNotifications();
  }

  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    // Stop any playing audio
    this.stopAdhan();

    // Clear the source reference
    this.prayerTimesSource = null;
    logger.log('🧹 NotificationService cleaned up');
  }
}

export default new NotificationService();
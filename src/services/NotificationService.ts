// src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';
import ReminderStateService from './ReminderStateService';
import { format } from 'date-fns';
import { CHANNELS, SOUNDS, NOTIFICATION_CHANNEL_VERSION, NOTIFICATION_SCHEDULING_DAYS, NOTIFICATION_MAX_FUTURE_DAYS } from '../constants/NotificationConstants';
import MosqueModeService from './MosqueModeService';
import { NOTIFICATION_CATEGORIES, initializeChannelsAndCategories } from './notifications/NotificationChannels';
import AdhanPlayer from './notifications/AdhanPlayer';
import { scheduleTier2PersistentReminders, scheduleTier3GracePeriodWarning } from './notifications/HabitBuilderNotifications';
import { isValidCoordinates } from '../utils/locationValidation';
import logger from '../utils/logger';
import AnalyticsService from './AnalyticsService';

// NOTIFICATION_CATEGORIES now imported from ./notifications/NotificationChannels

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isTest = notification.request.content.data?.type === 'test';

    return {
      shouldShowAlert: !isTest || Platform.OS === 'ios',
      shouldPlaySound: true,
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

  private isScheduling = false;

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
      schedulingDays: NOTIFICATION_SCHEDULING_DAYS,
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

  private async cleanupPastPrayerNotifications(cutoff: Date): Promise<number> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelled = 0;

    for (const notif of scheduled) {
      const data = (notif.content?.data || {}) as Record<string, unknown>;
      if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) continue;
      if (!this.isPrayerNotificationType(data?.type)) continue;

      const triggerDate = this.getTriggerDate(notif.trigger);
      if (!triggerDate) continue;
      if (triggerDate.getTime() < cutoff.getTime()) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        cancelled++;
      }
    }

    return cancelled;
  }

  async maybeRescheduleExtendedNotifications(hoursThreshold: number = 24): Promise<boolean> {
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
        logger.log('🎵 Playing adhan for test notification in foreground');
        this.playFullAdhan();
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

      // If user taps the notification itself, play full Adhan
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Play adhan for both prayer-time and test notifications
        if ((data?.type === 'prayer-time' || data?.type === 'test') && (data?.prayer || data?.type === 'test')) {
          // Play full adhan inside app (for immersive experience)
          this.playFullAdhan();

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
  playFullAdhan() {
    AdhanPlayer.play();
  }

  stopAdhan() {
    AdhanPlayer.stop();
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

  private async schedulePrayerNotification(
    prayer: PrayerTime,
    settings: UserSettings,
    nextPrayer?: PrayerTime | null,
    existingIdentifiers?: Set<string>,
    sunrise?: Date
  ) {
    const { notifications, prayerNotifications } = settings;
    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);

    // ✅ NEW: Check per-prayer notification setting
    if (prayerNotifications && !prayerNotifications[prayer.name]) {
      logger.log(`🔕 Skipping ${prayer.name} - notifications disabled for this prayer`);
      return;
    }

    // Create unique identifiers to prevent duplicates
    const dateStr = format(prayer.time, 'yyyy-MM-dd');
    // Create unique prayer ID for Prayer Habit Builder tracking
    const prayerId = `${prayer.name}-${dateStr}`;

    // Better validation of notification times
    const now = new Date();
    const maxFutureTime = new Date(now.getTime() + NOTIFICATION_MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000);

    if (prayer.time > maxFutureTime) {
      logger.log(`⏭️ Skipping ${prayer.name} - too far in future`);
      return;
    }
    // Initialize Prayer Habit Builder state
    if (settings.habitBuilder?.enabled) {
      ReminderStateService.initializePrayerReminder(prayer, nextPrayer || null);
    }

    // Schedule pre-prayer notification
    if (notifications.beforePrayer > 0) {
      const preNotificationTime = new Date(prayer.time.getTime() - notifications.beforePrayer * 60000);

      if (preNotificationTime > now) {
        const preIdentifier = `pre-${prayer.name}-${dateStr}`;
        if (!existingIdentifiers?.has(preIdentifier)) {
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
              ...(Platform.OS === 'android' && {
                channelId: CHANNELS.PRE_PRAYER,
              }),
            },
            trigger: {
              type: 'date',
              date: preNotificationTime,
            } as Notifications.NotificationTriggerInput,
            identifier: preIdentifier,
          });

          existingIdentifiers?.add(preIdentifier);
        }
      }
    }

    // Schedule main prayer notification with Adhan logic
    let soundAsset: string | undefined = undefined;
    let androidChannel = CHANNELS.DEFAULT;

    // Hybrid Audio Logic
    if (notifications.enabled && notifications.adhanEnabled) {
      // iOS: Use short clip (limitation < 30s)
      soundAsset = Platform.OS === 'ios' ? SOUNDS.IOS_SHORT : undefined;
      // Android: Use specific Adhan channel (plays full sound)
      androidChannel = CHANNELS.ADHAN;
    } else if (notifications.enabled && notifications.soundEnabled) {
      // Standard Beep
      soundAsset = 'default';
      androidChannel = CHANNELS.DEFAULT;
    }

    const mainContent = this.getPrayerTimeContent(prayerName, prayer.name);

    const prayerIdentifier = `prayer-${prayer.name}-${dateStr}`;
    if (!existingIdentifiers?.has(prayerIdentifier)) {
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
          ...(Platform.OS === 'android' && {
            channelId: androidChannel,
            priority: 'high',
          }),
        },
        trigger: {
          type: 'date',
          date: prayer.time,
        } as Notifications.NotificationTriggerInput,
        identifier: prayerIdentifier,
      });

      existingIdentifiers?.add(prayerIdentifier);
    }

    // Compute effective deadline for this prayer's reminders:
    // Fajr ends at sunrise; all others end at the next prayer time
    const deadline = prayer.name === 'Fajr' && sunrise
      ? sunrise
      : nextPrayer?.time || undefined;

    // PRAYER HABIT BUILDER: Schedule Tier 2 & Tier 3 reminders
    if (settings.habitBuilder?.enabled) {
      // TIER 2: Persistent "Have you prayed?" reminders
      await scheduleTier2PersistentReminders(prayer, prayerId, settings, existingIdentifiers, deadline);

      // TIER 3: Grace period warning (only if we have next prayer)
      if (nextPrayer) {
        await scheduleTier3GracePeriodWarning(prayer, nextPrayer, prayerId, settings, existingIdentifiers, deadline);
      }

      logger.log(`🏗️ Prayer Habit Builder scheduled for ${prayerName}`);
    } else if (notifications.postPrayerCheck) {
      // LEGACY: Old post-prayer check — clamp to before the deadline
      let postCheckTime = new Date(prayer.time.getTime() + 15 * 60000);
      if (deadline && postCheckTime >= deadline) {
        // Schedule 5 min before deadline instead of after it
        postCheckTime = new Date(deadline.getTime() - 5 * 60000);
      }

      const checkIdentifier = `check-${prayer.name}-${dateStr}`;
      if (existingIdentifiers?.has(checkIdentifier)) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Did you pray ${prayerName}? 🤲`,
          body: 'Tap to mark your prayer and add a reflection',
          data: {
            prayer: prayer.name,
            prayerId,
            type: 'post-prayer-check',
            time: prayer.time.toISOString(),
            scheduledAt: new Date().toISOString(),
          },
          categoryIdentifier: NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK,
          ...(Platform.OS === 'android' && {
            channelId: CHANNELS.DEFAULT,
          }),
        },
        trigger: {
          type: 'date',
          date: postCheckTime,
        } as Notifications.NotificationTriggerInput,
        identifier: checkIdentifier,
      });

      existingIdentifiers?.add(checkIdentifier);
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
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.MINDFULNESS,
        }),
      },
      trigger: {
        type: 'date',
        date: reminderTime,
      } as Notifications.NotificationTriggerInput,
      identifier: `mindfulness-${prayerName}-${Date.now()}`,
    });
  }

  private getPrePrayerContent(prayerName: string, minutes: number): NotificationContent {
    const messages = [
      `${prayerName} prayer in ${minutes} minutes. Time to prepare your heart 🤲`,
      `${minutes} minutes until ${prayerName}. Begin your mindful preparation 🕌`,
      `Get ready for ${prayerName} prayer in ${minutes} minutes ✨`,
      `${prayerName} approaching in ${minutes} minutes. Find your peaceful space 🌿`,
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
        body: `Your ${minutes}-minute snooze is up! Time to pray 🕌`,
        data: {
          prayer: prayerName,
          prayerId: prayerId || `${prayerName}-${format(new Date(), 'yyyy-MM-dd')}`,
          type: 'snoozed',
          scheduledAt: new Date().toISOString(),
        },
        sound: 'default',
        categoryIdentifier: NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK, // Use Tier 2 category
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.DEFAULT,
          priority: 'high',
        }),
      },
      trigger: {
        type: 'date',
        date: snoozeTime,
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

    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
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
    ]);

    const prayerNotifications = scheduled.filter((notif) => {
      const data = notif.content.data as any;
      if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) return false;
      if (data?.type && prayerNotificationTypes.has(data.type)) return true;
      return false;
    });

    for (const notif of prayerNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

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
    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      logger.log(`❌ Cancelled notification: ${notif.identifier}`);
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

    if (updatedSettings.notifications.enabled) {
      await this.scheduleAllPrayerNotifications();
    } else {
      await this.cancelAllPrayerNotifications();
    }
  }

  // Scheduling progress (0-1) for UI progress indicators
  schedulingProgress: number = 0;

  // 📅 EXTENDED 14-DAY BATCH SCHEDULING
  // This is called by your useNotificationRescheduler hook every 24 hours
  // onProgress(day, total) is called after each day is scheduled
  async scheduleExtendedNotifications(
    onProgress?: (day: number, total: number) => void
  ) {
    if (this.isScheduling) {
      return;
    }

    this.isScheduling = true;
    this.schedulingProgress = 0;
    try {
      logger.log('🗓️ Starting 14-day batch scheduling...');

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

      await this.cleanupPastPrayerNotifications(new Date());

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existingIdentifiers = new Set<string>();
      for (const notif of scheduled) {
        const data = (notif.content?.data || {}) as Record<string, unknown>;
        if (data?.type && typeof data.type === 'string' && data.type.startsWith('mosque_mode')) continue;
        if (!this.isPrayerNotificationType(data?.type)) continue;
        existingIdentifiers.add(notif.identifier);
      }

      const today = new Date();

      for (let i = 0; i < NOTIFICATION_SCHEDULING_DAYS; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

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

          const prayers = prayerData.prayerTimes;
          const sunrise = prayerData.sunrise;
          for (let j = 0; j < prayers.length; j++) {
            const prayer = prayers[j];
            const nextPrayer = prayers[j + 1] || null;

            if (prayer.time > new Date()) {
              await this.schedulePrayerNotification(prayer, settings, nextPrayer, existingIdentifiers, sunrise);
            }
          }
        } catch (error) {
          logger.error(`❌ Failed to schedule day ${i}:`, error);
        }

        // Report progress after each day
        this.schedulingProgress = (i + 1) / NOTIFICATION_SCHEDULING_DAYS;
        onProgress?.(i + 1, NOTIFICATION_SCHEDULING_DAYS);
      }
    } catch (error) {
      logger.error('❌ Extended scheduling failed:', error);
    } finally {
      this.isScheduling = false;
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
    const scheduled = await this.getScheduledNotifications();
    const source = this.prayerTimesSource;

    return {
      scheduledCount: scheduled.length,
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
        title: '🕌 Adhan Test',
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

      // Determine which days to schedule (over next 7 days)
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
              title: '🌌 Tahajjud Time',
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
    switch (frequency) {
      case 'daily':
        return [0, 1, 2, 3, 4, 5, 6];
      case 'weekdays':
        // Mon-Fri from today
        return [0, 1, 2, 3, 4, 5, 6].filter(d => {
          const day = new Date();
          day.setDate(day.getDate() + d);
          const dow = day.getDay();
          return dow >= 1 && dow <= 5;
        });
      case 'weekends':
        return [0, 1, 2, 3, 4, 5, 6].filter(d => {
          const day = new Date();
          day.setDate(day.getDate() + d);
          const dow = day.getDay();
          return dow === 0 || dow === 6;
        });
      case 'twice_weekly':
      default:
        // Monday and Thursday (Sunnah fasting days)
        return [0, 1, 2, 3, 4, 5, 6].filter(d => {
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
    for (const notif of tahajjudNotifs) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
    if (tahajjudNotifs.length > 0) {
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
// src/services/NotificationService.ts (COMPLETE MERGED VERSION)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';
import { CHANNELS, SOUNDS, NOTIFICATION_CHANNEL_VERSION } from '../constants/NotificationConstants';

// Notification categories for iOS
const NOTIFICATION_CATEGORIES = {
  PRAYER_REMINDER: 'prayer-reminder',
  PRE_PRAYER: 'pre-prayer',
  POST_PRAYER_CHECK: 'post-prayer-check',
};

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

class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private notificationCache = new Map<string, string>();
  private navigationHandler: ((prayer: PrayerName, action: string) => void) | null = null;

  // 🎵 AudioPlayer from expo-audio
  private audioPlayer: AudioPlayer | null = null;

  private prayerTimesSource: PrayerTimesSource | null = null;

  // Set the prayer times source
  setPrayerTimesSource(source: PrayerTimesSource) {
    this.prayerTimesSource = source;
    console.log('✅ Prayer times source connected to NotificationService');
  }

  // Register a handler function that will be called when navigation is needed
  registerNavigationHandler(handler: (prayer: PrayerName, action: string) => void) {
    this.navigationHandler = handler;
    console.log('✅ Navigation handler registered');
  }

  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('📵 Notification permissions not granted');
        return false;
      }

      // Set up Audio Mode
      try {
        await setAudioModeAsync({
          playsInSilentMode: true, // Allow Adhan even if switch is silent
        });
      } catch (e) {
        console.warn('⚠️ Failed to set audio mode:', e);
      }

      // Set up notification categories (iOS)
      if (Platform.OS === 'ios') {
        await this.setupNotificationCategories();
      }

      // Set up notification channels (Android)
      if (Platform.OS === 'android') {
        // 1. Cleanup old channels first to ensure sound updates apply
        await this.cleanupOldChannels();
        // 2. Setup new channels with versioned IDs
        await this.setupNotificationChannels();
      }

      // Set up listeners
      this.setupListeners();

      console.log('✅ NotificationService initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('📱 Notifications only work on physical devices');
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

  // 🧹 Auto-delete old channels to keep Android settings clean and force sound updates
  private async cleanupOldChannels() {
    if (Platform.OS !== 'android') return;
    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      for (const channel of channels) {
        // If channel is from our app but has an old version number (or no version)
        if (
          (channel.id.includes('prayer-times') || channel.id.includes('adhan') || channel.id.includes('pre-prayer') || channel.id.includes('mindfulness')) &&
          !channel.id.includes(`v${NOTIFICATION_CHANNEL_VERSION}`)
        ) {
          console.log(`🧹 Deleting old channel: ${channel.id}`);
          await Notifications.deleteNotificationChannelAsync(channel.id);
        }
      }
      console.log('✅ Old channels cleaned up');
    } catch (e) {
      console.warn('⚠️ Failed to cleanup old channels:', e);
    }
  }

  // Setup notification channels with Adhan support
  private async setupNotificationChannels() {
    // 1. Default Channel (Standard Beep)
    await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
      name: 'Prayer Times (Beep)',
      description: 'Standard notifications for prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E3F',
      sound: 'default',
      bypassDnd: false,
      showBadge: true,
    });

    // 2. Adhan Channel (Plays Full Adhan)
    // CRITICAL: This links the channel to 'res/raw/adhan_full.mp3'
    await Notifications.setNotificationChannelAsync(CHANNELS.ADHAN, {
      name: 'Prayer Times (Adhan)',
      description: 'Plays the full call to prayer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 1000, 500, 1000],
      lightColor: '#1B5E3F',
      sound: SOUNDS.ANDROID_FULL, // References android/app/src/main/res/raw/adhan_full.mp3
      bypassDnd: false,
      showBadge: true,
    });

    // 3. Pre-prayer reminder channel
    await Notifications.setNotificationChannelAsync(CHANNELS.PRE_PRAYER, {
      name: 'Prayer Preparation',
      description: 'Reminders before prayer time',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#D4AF37',
      sound: 'default',
    });

    // 4. Mindfulness channel
    await Notifications.setNotificationChannelAsync(CHANNELS.MINDFULNESS, {
      name: 'Mindfulness Reminders',
      description: 'Gentle reminders for prayer preparation',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 50],
      sound: null, // Silent
    });

    console.log('✅ Notification channels set up with versioning');
  }

  private async setupNotificationCategories() {
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PRAYER_REMINDER, [
      {
        identifier: 'snooze',
        buttonTitle: 'Snooze 10 min',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'complete',
        buttonTitle: 'Mark Complete',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.PRE_PRAYER, [
      {
        identifier: 'prepare',
        buttonTitle: 'Prepare Mindfully',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.POST_PRAYER_CHECK, [
      {
        identifier: 'mark_prayed',
        buttonTitle: 'Yes, I Prayed',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  private setupListeners() {
    // Handle notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received:', notification.request.content.title);
    });

    // Handle notification responses (taps, actions)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification, actionIdentifier } = response;
      const data = notification.request.content.data;

      // If user taps the notification itself, play full Adhan
      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        if (data?.type === 'prayer-time' && data?.prayer) {
          // Play full adhan inside app (for immersive experience)
          this.playFullAdhan();

          if (this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'default');
          }
        }
      }

      switch (actionIdentifier) {
        case 'snooze':
          if (data?.prayer) {
            this.stopAdhan(); // Stop adhan if playing
            await this.snoozePrayerNotification(data.prayer as PrayerName, 10);
          }
          break;

        case 'complete':
        case 'mark_prayed':
          if (data?.prayer) {
            this.stopAdhan();
            if (this.navigationHandler) {
              this.navigationHandler(data.prayer as PrayerName, 'complete');
            }
            console.log('✅ Mark prayer complete:', data.prayer);
          }
          break;

        case 'prepare':
          // Navigate to mindfulness flow
          if (data?.prayer && this.navigationHandler) {
            this.navigationHandler(data.prayer as PrayerName, 'prepare');
          }
          console.log('🧘 Open mindfulness flow for:', data?.prayer);
          break;

        default:
          // Already handled above for DEFAULT_ACTION_IDENTIFIER
          break;
      }
    });
  }

  // 🎵 AUDIO PLAYBACK METHODS
  playFullAdhan() {
    try {
      this.stopAdhan(); // Stop any existing sound first

      const source = require('../../assets/sounds/adhan_full.mp3');
      this.audioPlayer = createAudioPlayer(source);
      this.audioPlayer.play();
      console.log('🔊 Playing full Adhan in foreground');

      // Optional: Cleanup when done
      this.audioPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.stopAdhan();
        }
      });
    } catch (error) {
      console.error('❌ Error playing Adhan:', error);
    }
  }

  stopAdhan() {
    if (this.audioPlayer) {
      try {
        this.audioPlayer.pause();
        this.audioPlayer.seekTo(0);
        this.audioPlayer.remove();
        this.audioPlayer = null;
      } catch (e) {
        // Ignore errors if already cleaned up
      }
    }
  }

  // 🚀 MAIN ENTRY POINT - Now simply delegates to the 14-day batch scheduler
  async scheduleAllPrayerNotifications() {
    try {
      const settings = StorageService.getUserSettings();
      if (!settings || !settings.notifications.enabled) {
        console.log('📵 Notifications disabled in settings');
        return;
      }

      if (!settings.location?.latitude || !settings.location?.longitude) {
        console.log('❌ No valid location for notifications');
        return;
      }

      console.log('🗓️ Scheduling prayer notifications via 14-day batch...');

      // Simply call the extended scheduler - it handles everything
      await this.scheduleExtendedNotifications();

    } catch (error) {
      console.error('❌ Failed to schedule notifications:', error);
    }
  }

  private async schedulePrayerNotification(prayer: PrayerTime, settings: UserSettings) {
    const { notifications } = settings;
    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);

    // Create unique identifiers to prevent duplicates
    const dateStr = prayer.time.toISOString().split('T')[0];

    // Better validation of notification times
    const now = new Date();
    const maxFutureTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    if (prayer.time > maxFutureTime) {
      console.log(`⏭️ Skipping ${prayer.name} - too far in future`);
      return;
    }

    // Schedule pre-prayer notification
    if (notifications.beforePrayer > 0) {
      const preNotificationTime = new Date(prayer.time.getTime() - notifications.beforePrayer * 60000);

      if (preNotificationTime > now) {
        const content = this.getPrePrayerContent(prayerName, notifications.beforePrayer);

        await Notifications.scheduleNotificationAsync({
          content: {
            ...content,
            data: {
              prayer: prayer.name,
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
            type: 'timeInterval',
            seconds: Math.max((preNotificationTime.getTime() - now.getTime()) / 1000, 1),
            repeats: false,
          } as Notifications.NotificationTriggerInput,
          identifier: `pre-${prayer.name}-${dateStr}`,
        });
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

    await Notifications.scheduleNotificationAsync({
      content: {
        ...mainContent,
        data: {
          prayer: prayer.name,
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
        type: 'timeInterval',
        seconds: Math.max((prayer.time.getTime() - now.getTime()) / 1000, 1),
        repeats: false,
        channelId: androidChannel
      } as Notifications.NotificationTriggerInput,
      identifier: `prayer-${prayer.name}-${dateStr}`,
    });

    // Schedule post-prayer check
    if (notifications.postPrayerCheck) {
      const postCheckTime = new Date(prayer.time.getTime() + 15 * 60000);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Did you pray ${prayerName}? 🤲`,
          body: 'Tap to mark your prayer and add a reflection',
          data: {
            prayer: prayer.name,
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
          type: 'timeInterval',
          seconds: Math.max((postCheckTime.getTime() - now.getTime()) / 1000, 1),
          repeats: false,
        } as Notifications.NotificationTriggerInput,
        identifier: `check-${prayer.name}-${dateStr}`,
      });
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
        type: 'calendar',
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

  async snoozePrayerNotification(prayerName: PrayerName, minutes: number) {
    const snoozeTime = new Date(Date.now() + minutes * 60000);
    const displayName = PrayerTimeService.getPrayerDisplayName(prayerName);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${displayName} Prayer`,
        body: `Your ${minutes}-minute snooze is up! Time to pray 🕌`,
        data: {
          prayer: prayerName,
          type: 'snoozed',
          scheduledAt: new Date().toISOString(),
        },
        sound: 'default',
        ...(Platform.OS === 'android' && {
          channelId: CHANNELS.DEFAULT,
          priority: 'high',
        }),
      },
      trigger: {
        type: 'calendar',
        date: snoozeTime,
      } as Notifications.NotificationTriggerInput,
      identifier: `snooze-${prayerName}-${Date.now()}`,
    });
  }

  async cancelPrayerNotifications(prayerName: PrayerName) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((notif) => notif.content.data?.prayer === prayerName);

    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  async cancelAllPrayerNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotifications = scheduled.filter(
      (notif) =>
        notif.content.data?.prayer ||
        (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('prayer'))
    );

    for (const notif of prayerNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    console.log(`🗑️ Cancelled ${prayerNotifications.length} prayer notifications`);
  }

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

  // 📅 EXTENDED 14-DAY BATCH SCHEDULING
  // This is called by your useNotificationRescheduler hook every 24 hours
  async scheduleExtendedNotifications() {
    try {
      console.log('🗓️ Starting 14-day batch scheduling...');

      // 1. Cancel everything to start fresh
      await Notifications.cancelAllScheduledNotificationsAsync();

      const settings = StorageService.getUserSettings();
      if (!settings?.notifications.enabled || !settings.location) {
        console.log('📵 Notifications disabled or no location');
        return;
      }

      const today = new Date();
      let totalScheduled = 0;

      // 2. Loop for 14 days
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        try {
          // Get times for this specific date
          const prayers = await PrayerTimeService.getPrayerTimesList(
            settings.location,
            date,
            settings.calculationMethod,
            settings.adjustments
          );

          // Schedule them
          for (const prayer of prayers) {
            if (prayer.time > new Date()) {
              await this.schedulePrayerNotification(prayer, settings);
              totalScheduled++;
            }
          }
        } catch (error) {
          console.error(`❌ Failed to schedule day ${i}:`, error);
          // Continue with next day
        }
      }

      console.log(`✅ Extended scheduling complete: ${totalScheduled} notifications scheduled`);
    } catch (error) {
      console.error('❌ Extended scheduling failed:', error);
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
    console.log('🔔 Sending Test Adhan...');
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

  // Force rescheduling method for debugging
  async forceReschedule() {
    console.log('🔧 Force rescheduling notifications...');
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
    console.log('🧹 NotificationService cleaned up');
  }
}

export default new NotificationService();
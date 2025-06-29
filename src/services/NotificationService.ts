import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';

// Notification categories for iOS
const NOTIFICATION_CATEGORIES = {
  PRAYER_REMINDER: 'prayer-reminder',
  PRE_PRAYER: 'pre-prayer',
  POST_PRAYER_CHECK: 'post-prayer-check',
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Don't show notification if app is in foreground and it's a test
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

class NotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private notificationCache = new Map<string, string>();

  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Set up notification categories (iOS)
      if (Platform.OS === 'ios') {
        await this.setupNotificationCategories();
      }

      // Set up notification channels (Android)
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }

      // Set up listeners
      this.setupListeners();
      
      // Schedule initial notifications
      await this.scheduleAllPrayerNotifications();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
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
          // allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  private async setupNotificationChannels() {
    // Main prayer time channel
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'Prayer Times',
      description: 'Notifications for prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E3F',
      sound: 'default',
      bypassDnd: false,
      showBadge: true,
    });

    // Pre-prayer reminder channel
    await Notifications.setNotificationChannelAsync('pre-prayer', {
      name: 'Prayer Preparation',
      description: 'Reminders before prayer time',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#D4AF37',
      sound: 'default',
    });

    // Mindfulness channel
    await Notifications.setNotificationChannelAsync('mindfulness', {
      name: 'Mindfulness Reminders',
      description: 'Gentle reminders for prayer preparation',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 50],
      sound: null, // Silent
    });
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
  }

  private setupListeners() {
    // Handle notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Handle notification responses (taps, actions)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { notification, actionIdentifier } = response;
        const data = notification.request.content.data;

        switch (actionIdentifier) {
          case 'snooze':
            if (data?.prayer) {
              await this.snoozePrayerNotification(data.prayer as PrayerName, 10);
            }
            break;
            
          case 'complete':
            if (data?.prayer) {
              // This would trigger navigation to mark prayer complete
              // We'll handle this in the main app
              console.log('Mark prayer complete:', data.prayer);
            }
            break;
            
          case 'prepare':
            // Navigate to mindfulness flow
            console.log('Open mindfulness flow for:', data?.prayer);
            break;
            
          default:
            // Default tap action - open app
            console.log('Notification tapped');
        }
      }
    );
  }

  async scheduleAllPrayerNotifications() {
    try {
      // Cancel all existing prayer notifications
      await this.cancelAllPrayerNotifications();
      
      const settings = StorageService.getUserSettings();
      if (!settings || !settings.notifications.enabled) {
        return;
      }

      // Get today's and tomorrow's prayer times
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayPrayers = await PrayerTimeService.getPrayerTimesList(
        settings.location,
        today,
        settings.calculationMethod
      );

      const tomorrowPrayers = await PrayerTimeService.getPrayerTimesList(
        settings.location,
        tomorrow,
        settings.calculationMethod
      );

      // Schedule notifications for upcoming prayers only
      const allPrayers = [...todayPrayers, ...tomorrowPrayers];
      const upcomingPrayers = allPrayers.filter(prayer => prayer.time > new Date());

      for (const prayer of upcomingPrayers) {
        await this.schedulePrayerNotification(prayer, settings);
      }

      console.log(`Scheduled notifications for ${upcomingPrayers.length} prayers`);
    } catch (error) {
      console.error('Failed to schedule notifications:', error);
    }
  }

  private async schedulePrayerNotification(
    prayer: PrayerTime,
    settings: UserSettings
  ) {
    const { notifications } = settings;
    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    
    // Create unique identifiers to prevent duplicates
    const dateStr = prayer.time.toISOString().split('T')[0];
    
    // Schedule pre-prayer notification
    if (notifications.beforePrayer > 0) {
      const preNotificationTime = new Date(
        prayer.time.getTime() - notifications.beforePrayer * 60000
      );
      
      if (preNotificationTime > new Date()) {
        const content = this.getPrePrayerContent(prayerName, notifications.beforePrayer);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            ...content,
            data: { 
              prayer: prayer.name, 
              type: 'pre-prayer',
              time: prayer.time.toISOString(),
            },
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRE_PRAYER,
            ...(Platform.OS === 'android' && {
              channelId: 'pre-prayer',
            }),
          },
          trigger: {
            type: 'timeInterval',
            seconds: Math.max((preNotificationTime.getTime() - Date.now()) / 1000, 1),
            repeats: false,
          } as Notifications.NotificationTriggerInput,
          identifier: `pre-${prayer.name}-${dateStr}`,
        });
      }
    }
    
    // Schedule main prayer notification
    const mainContent = this.getPrayerTimeContent(prayerName, prayer.name);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        ...mainContent,
        data: { 
          prayer: prayer.name, 
          type: 'prayer-time',
          time: prayer.time.toISOString(),
        },
        sound: notifications.soundEnabled ? 'default' : undefined,
        categoryIdentifier: NOTIFICATION_CATEGORIES.PRAYER_REMINDER,
        ...(Platform.OS === 'android' && {
          channelId: 'prayer-times',
          priority: 'high',
        }),
      },
      trigger: {
        type: 'timeInterval',
        seconds: Math.max((prayer.time.getTime() - Date.now()) / 1000,1),
        repeats: false,
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
          },
          ...(Platform.OS === 'android' && {
            channelId: 'prayer-times',
          }),
        },
      trigger: {
        type: 'timeInterval',
        seconds: Math.max((postCheckTime.getTime() - Date.now()) / 1000,1),
        repeats: false,
      } as Notifications.NotificationTriggerInput,
        identifier: `check-${prayer.name}-${dateStr}`,
      });
    }
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
      fajr: [
        'Rise and shine! Start your day with prayer 🌅',
        'A blessed morning begins with Fajr 🌙',
        'The dawn prayer awaits you ☀️',
      ],
      dhuhr: [
        'Take a break from the world, connect with Allah 🕌',
        'Pause your day for Dhuhr prayer 🌞',
        'Time for the midday prayer ☀️',
      ],
      asr: [
        'The afternoon prayer brings peace to your day 🌤',
        'Take a moment for Asr prayer 🍃',
        'Refresh your soul with the afternoon prayer 🌿',
      ],
      maghrib: [
        'As the sun sets, turn to prayer 🌇',
        'End your day with gratitude in Maghrib 🌅',
        'The sunset prayer is here 🌆',
      ],
      isha: [
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
        },
        sound: 'default',
        ...(Platform.OS === 'android' && {
          channelId: 'prayer-times',
          priority: 'high',
        }),
      },
      trigger: {
        type: 'calendar',
        date: snoozeTime,
      }as Notifications.NotificationTriggerInput,
      identifier: `snooze-${prayerName}-${Date.now()}`,
    });
  }

  async cancelPrayerNotifications(prayerName: PrayerName) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      notif => notif.content.data?.prayer === prayerName
    );
    
    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  async cancelAllPrayerNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotifications = scheduled.filter(
      notif => notif.content.data?.prayer || 
        (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('prayer'))
    );
    
    for (const notif of prayerNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

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

  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Alhamdulillah! Prayer notifications are working perfectly 🎉',
        subtitle: 'You\'ll receive reminders for each prayer',
        data: { type: 'test' },
        ...(Platform.OS === 'android' && {
          channelId: 'prayer-times',
        }),
      },
      trigger: null, // Immediate
    });
  }

  async getScheduledNotifications() {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.filter(
      notif => notif.content.data?.prayer || (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('prayer'))
    );
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
  }
}

export default new NotificationService();
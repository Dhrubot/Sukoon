// src/services/NotificationService.ts (COMPLETE VERSION)
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

// 🎯 SIMPLIFIED: Lightweight interface for prayer times (fits your architecture)
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
  
  // 🎯 SIMPLIFIED: Just a simple source reference (no complex provider pattern)
  private prayerTimesSource: PrayerTimesSource | null = null;
  private lastScheduledHash: string = '';

  // 🎯 SIMPLE: Set the prayer times source (called from useServiceInitialization)
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

  // 🎯 ENHANCED: All notification channels including mindfulness
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

    // 🎯 ENHANCED: Mindfulness channel
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
        console.log('🔔 Notification received:', notification.request.content.title);
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
              // Call navigation handler if registered
              if (this.navigationHandler) {
                this.navigationHandler(data.prayer as PrayerName, 'complete');
              }
              console.log('Mark prayer complete:', data.prayer);
            }
            break;
            
          case 'prepare':
            // Navigate to mindfulness flow
            if (data?.prayer && this.navigationHandler) {
              this.navigationHandler(data.prayer as PrayerName, 'prepare');
            }
            console.log('Open mindfulness flow for:', data?.prayer);
            break;
            
          default:
            // Default tap action - open app
            if (data?.prayer && this.navigationHandler) {
              this.navigationHandler(data.prayer as PrayerName, 'default');
            }
            console.log('Notification tapped');
        }
      }
    );
  }

  // 🎯 ENHANCED: Use centralized prayer times when available, fallback to API
  async scheduleAllPrayerNotifications() {
    try {
      // Cancel all existing prayer notifications
      await this.cancelAllPrayerNotifications();
      
      const settings = StorageService.getUserSettings();
      if (!settings || !settings.notifications.enabled) {
        console.log('📵 Notifications disabled in settings');
        return;
      }

      let upcomingPrayers: PrayerTime[] = [];

      // 🎯 TRY: Use centralized prayer times first
      if (this.prayerTimesSource?.hasValidLocation() && !this.prayerTimesSource.isLoading()) {
        const todayPrayers = this.prayerTimesSource.getTodayPrayerTimes();
        const nextPrayer = this.prayerTimesSource.getNextPrayer();
        
        // Get all upcoming prayers (today + next prayer which could be tomorrow's Fajr)
        upcomingPrayers = [...todayPrayers];
        if (nextPrayer && nextPrayer.time > new Date()) {
          upcomingPrayers.push(nextPrayer);
        }
        
        console.log('✅ Using centralized prayer times for notifications');
      } 
      // 🎯 FALLBACK: Direct API call (your existing logic)
      else {
        if (!settings.location?.latitude || !settings.location?.longitude) {
          console.log('❌ No valid location for notifications');
          return;
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get today's prayers
        const todayPrayers = await PrayerTimeService.getPrayerTimesList(
          settings.location,
          today,
          settings.calculationMethod,
          settings.adjustments
        );

        upcomingPrayers = [...todayPrayers];

        // If no more prayers today, get tomorrow's Fajr
        const now = new Date();
        const hasUpcomingToday = todayPrayers.some(p => p.time > now);
        
        if (!hasUpcomingToday) {
          const tomorrowPrayers = await PrayerTimeService.getPrayerTimesList(
            settings.location,
            tomorrow,
            settings.calculationMethod,
            settings.adjustments
          );
          
          const fajr = tomorrowPrayers.find(p => p.name === 'Fajr');
          if (fajr) {
            upcomingPrayers.push(fajr);
          }
        }
        
        console.log('⚠️ Using fallback prayer time calculation');
      }

      // 🎯 SMART: Skip rescheduling if prayers haven't changed
      const currentHash = this.generatePrayerHash(upcomingPrayers);
      if (currentHash === this.lastScheduledHash) {
        console.log('📋 Prayer times unchanged, skipping rescheduling');
        return;
      }

      // Filter to only future prayers
      const futurePrayers = upcomingPrayers.filter(p => p.time > new Date());

      // 🎯 ENHANCED: Batch scheduling with better error handling
      const schedulingPromises = futurePrayers.map(prayer => 
        this.schedulePrayerNotification(prayer, settings).catch(error => {
          console.error(`❌ Failed to schedule notification for ${prayer.name}:`, error);
          return null;
        })
      );

      await Promise.allSettled(schedulingPromises);

      this.lastScheduledHash = currentHash;
      console.log(`✅ Scheduled notifications for ${futurePrayers.length} prayers`);
      
    } catch (error) {
      console.error('❌ Failed to schedule notifications:', error);
    }
  }

  // 🎯 ENHANCED: Hash generation for change detection
  private generatePrayerHash(prayers: PrayerTime[]): string {
    return prayers
      .map(p => `${p.name}:${p.time.getTime()}`)
      .join('|');
  }

  private async schedulePrayerNotification(prayer: PrayerTime, settings: UserSettings) {
    const { notifications } = settings;
    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    
    // Create unique identifiers to prevent duplicates
    const dateStr = prayer.time.toISOString().split('T')[0];
    
    // 🎯 ENHANCED: Better validation of notification times
    const now = new Date();
    const maxFutureTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    
    if (prayer.time > maxFutureTime) {
      console.log(`⏭️ Skipping ${prayer.name} - too far in future`);
      return;
    }
    
    // Schedule pre-prayer notification
    if (notifications.beforePrayer > 0) {
      const preNotificationTime = new Date(
        prayer.time.getTime() - notifications.beforePrayer * 60000
      );
      
      if (preNotificationTime > now) {
        const content = this.getPrePrayerContent(prayerName, notifications.beforePrayer);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            ...content,
            data: { 
              prayer: prayer.name, 
              type: 'pre-prayer',
              time: prayer.time.toISOString(),
              scheduledAt: new Date().toISOString(), // 🎯 ENHANCED: Track when scheduled
            },
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRE_PRAYER,
            ...(Platform.OS === 'android' && {
              channelId: 'pre-prayer',
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
    
    // Schedule main prayer notification
    const mainContent = this.getPrayerTimeContent(prayerName, prayer.name);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        ...mainContent,
        data: { 
          prayer: prayer.name, 
          type: 'prayer-time',
          time: prayer.time.toISOString(),
          scheduledAt: new Date().toISOString(), // 🎯 ENHANCED: Track when scheduled
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
        seconds: Math.max((prayer.time.getTime() - now.getTime()) / 1000, 1),
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
            scheduledAt: new Date().toISOString(), // 🎯 ENHANCED: Track when scheduled
          },
          ...(Platform.OS === 'android' && {
            channelId: 'prayer-times',
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

  // 🎯 ENHANCED: Mindfulness reminders
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
          channelId: 'mindfulness',
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
          channelId: 'prayer-times',
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
    
    // 🎯 ENHANCED: Reset the hash to force rescheduling next time
    this.lastScheduledHash = '';
  }

  // 🎯 ENHANCED: Better integration with settings updates
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

    // Force rescheduling by clearing hash
    this.lastScheduledHash = '';

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
        data: { 
          type: 'test',
          scheduledAt: new Date().toISOString(),
        },
        ...(Platform.OS === 'android' && {
          channelId: 'prayer-times',
        }),
      },
      trigger: null, // Immediate
    });
  }

  // 🎯 ENHANCED: Better debugging information
  async getScheduledNotifications() {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    const prayerNotifications = notifications.filter(
      notif => notif.content.data?.prayer || 
        (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('prayer'))
    );
    
    // Sort by trigger time for better debugging
    return prayerNotifications.sort((a, b) => {
      const aTime = a.trigger && 'date' in a.trigger ? a.trigger.date : 0;
      const bTime = b.trigger && 'date' in b.trigger ? b.trigger.date : 0;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }

  // 🎯 ENHANCED: Comprehensive debugging method
  async getDebugInfo() {
    const scheduled = await this.getScheduledNotifications();
    const source = this.prayerTimesSource;
    
    return {
      scheduledCount: scheduled.length,
      hasSource: !!source,
      sourceHasLocation: source?.hasValidLocation() || false,
      sourceLoading: source?.isLoading() || false,
      lastScheduledHash: this.lastScheduledHash,
      upcomingNotifications: scheduled.slice(0, 5).map(n => ({
        id: n.identifier,
        prayer: n.content.data?.prayer,
        type: n.content.data?.type,
        scheduledAt: n.content.data?.scheduledAt,
        trigger: n.trigger && 'date' in n.trigger ? new Date(n.trigger.date).toLocaleString() : 'Unknown',
      })),
      prayerTimesInfo: source ? {
        todayPrayersCount: source.getTodayPrayerTimes().length,
        hasNextPrayer: !!source.getNextPrayer(),
        nextPrayerName: source.getNextPrayer()?.name || 'None',
      } : null,
    };
  }

  // 🎯 ENHANCED: Force rescheduling method for debugging
  async forceReschedule() {
    console.log('🔧 Force rescheduling notifications...');
    this.lastScheduledHash = '';
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
    
    // Clear the source reference
    this.prayerTimesSource = null;
    console.log('🧹 NotificationService cleaned up');
  }
}

export default new NotificationService();
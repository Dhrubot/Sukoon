// src/services/NotificationService.ts (COMPLETE VERSION WITH EXPO-AUDIO)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';

// 🎵 SOUND CONFIGURATION
const IOS_SHORT_SOUND = 'adhan_short.wav'; // iOS uses short version (<30s)
const ANDROID_FULL_SOUND = 'adhan_full'; // Android uses full version (res/raw)

// 📢 CHANNEL CONFIGURATION
const CHANNEL_ADHAN = 'prayer-times-adhan';
const CHANNEL_DEFAULT = 'prayer-times';
const CHANNEL_PRE_PRAYER = 'pre-prayer';
const CHANNEL_MINDFULNESS = 'mindfulness';

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
  
  // 🎯 NEW: AudioPlayer from expo-audio
  private audioPlayer: AudioPlayer | null = null;
  
  private prayerTimesSource: PrayerTimesSource | null = null;
  private lastScheduledHash: string = '';

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

      // 🎯 NEW: Set up Audio Mode with expo-audio
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

  // Setup notification channels with Adhan support
  private async setupNotificationChannels() {
    // 1. Default Channel (Standard Beep)
    await Notifications.setNotificationChannelAsync(CHANNEL_DEFAULT, {
      name: 'Prayer Times (Default)',
      description: 'Standard notifications for prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E3F',
      sound: 'default',
      bypassDnd: false,
      showBadge: true,
    });

    // 2. Adhan Channel (Plays Full Adhan)
    await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN, {
      name: 'Prayer Times (Adhan)',
      description: 'Plays the call to prayer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 1000, 500, 1000],
      lightColor: '#1B5E3F',
      sound: ANDROID_FULL_SOUND, // References res/raw/adhan_full
      bypassDnd: false,
      showBadge: true,
    });

    // 3. Pre-prayer reminder channel
    await Notifications.setNotificationChannelAsync(CHANNEL_PRE_PRAYER, {
      name: 'Prayer Preparation',
      description: 'Reminders before prayer time',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#D4AF37',
      sound: 'default',
    });

    // 4. Mindfulness channel
    await Notifications.setNotificationChannelAsync(CHANNEL_MINDFULNESS, {
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

        // If user taps the notification itself, play full Adhan
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          if (data?.type === 'prayer-time' && data?.prayer) {
            // Play full adhan inside app (mostly for iOS experience)
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
            if (data?.prayer) {
              this.stopAdhan();
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
            // Already handled above for DEFAULT_ACTION_IDENTIFIER
            break;
        }
      }
    );
  }

  // 🎵 AUDIO PLAYBACK METHODS (expo-audio)
  playFullAdhan() {
    try {
      this.stopAdhan(); // Stop any existing sound first
      
      // 🎯 NEW: Synchronous creation of player
      const source = require('../../assets/sounds/adhan_full.mp3');
      this.audioPlayer = createAudioPlayer(source);
      
      // 🎯 NEW: Synchronous play()
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
        // 🎯 NEW: Methods for stopping/cleanup
        this.audioPlayer.pause();
        this.audioPlayer.seekTo(0); // Reset position
        this.audioPlayer.remove(); // Clean up
        this.audioPlayer = null;
      } catch (e) {
        // Ignore errors if already cleaned up
      }
    }
  }

  // Use centralized prayer times when available, fallback to API
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

      // TRY: Use centralized prayer times first
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
      // FALLBACK: Direct API call
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

      // SMART: Skip rescheduling if prayers haven't changed
      const currentHash = this.generatePrayerHash(upcomingPrayers);
      if (currentHash === this.lastScheduledHash) {
        console.log('📋 Prayer times unchanged, skipping rescheduling');
        return;
      }

      // Filter to only future prayers
      const futurePrayers = upcomingPrayers.filter(p => p.time > new Date());

      // Batch scheduling with better error handling
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

  // Hash generation for change detection
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
    
    // Better validation of notification times
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
              scheduledAt: new Date().toISOString(),
            },
            categoryIdentifier: NOTIFICATION_CATEGORIES.PRE_PRAYER,
            ...(Platform.OS === 'android' && {
              channelId: CHANNEL_PRE_PRAYER,
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
    let androidChannel = CHANNEL_DEFAULT;

    // Hybrid Audio Logic
    if (notifications.enabled && notifications.adhanEnabled) {
      // iOS: Use short clip (limitation < 30s)
      soundAsset = IOS_SHORT_SOUND; 
      // Android: Use specific Adhan channel (plays full sound)
      androidChannel = CHANNEL_ADHAN;
    } else if (notifications.enabled && notifications.soundEnabled) {
      // Standard Beep
      soundAsset = 'default';
      androidChannel = CHANNEL_DEFAULT;
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
          ...(Platform.OS === 'android' && {
            channelId: CHANNEL_DEFAULT,
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
          channelId: CHANNEL_MINDFULNESS,
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
          channelId: CHANNEL_DEFAULT,
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
    
    // Reset the hash to force rescheduling next time
    this.lastScheduledHash = '';
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
          channelId: CHANNEL_DEFAULT,
        }),
      },
      trigger: null, // Immediate
    });
  }

  // Better debugging information
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

  // Comprehensive debugging method
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

  // Force rescheduling method for debugging
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
    
    // Stop any playing audio
    this.stopAdhan();
    
    // Clear the source reference
    this.prayerTimesSource = null;
    console.log('🧹 NotificationService cleaned up');
  }
}

export default new NotificationService();
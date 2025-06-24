import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PrayerTime, PrayerName, UserSettings } from '../types';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private notificationListener: any;
  private responseListener: any;

  async initialize() {
    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('Notification permissions not granted');
      return false;
    }

    // Set up listeners
    this.setupListeners();
    
    // Schedule initial notifications
    await this.scheduleAllPrayerNotifications();
    
    return true;
  }

  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    // Android specific channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('prayer-times', {
        name: 'Prayer Times',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B5E3F',
        sound: 'default', // We'll add custom sounds later
      });
    }
    
    return true;
  }

  private setupListeners() {
    // Handle incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    // Handle notification interactions
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      response => {
        const { prayer, action } = response.notification.request.content.data;
        
        if (action === 'prepare') {
          // Navigate to mindfulness flow
          // This will be handled by navigation service
          console.log('Prepare for prayer:', prayer);
        } else if (action === 'snooze') {
          // Snooze for 10 minutes
          // Add type guard to ensure prayer is a valid PrayerName
          const isValidPrayer = (p: unknown): p is PrayerName => 
            typeof p === 'string' && ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(p);
          
          if (isValidPrayer(prayer)) {
            this.snoozePrayerNotification(prayer, 10);
          } else {
            console.error('Invalid prayer name received in notification:', prayer);
          }
        }
      }
    );
  }

  async scheduleAllPrayerNotifications() {
    const settings = StorageService.getUserSettings();
    if (!settings || !settings.notifications.enabled) {
      return;
    }

    // Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Get prayer times for today and tomorrow
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

    // Schedule notifications for all prayers
    [...todayPrayers, ...tomorrowPrayers].forEach(prayer => {
      if (prayer.time > new Date()) {
        this.schedulePrayerNotification(prayer, settings);
      }
    });
  }

  private async schedulePrayerNotification(
    prayer: PrayerTime,
    settings: UserSettings
  ) {
    const { notifications } = settings;
    const prayerName = PrayerTimeService.getPrayerDisplayName(prayer.name);
    
    // Schedule pre-prayer notification
    if (notifications.beforePrayer > 0) {
      const preNotificationTime = new Date(
        prayer.time.getTime() - notifications.beforePrayer * 60000
      );
      
      if (preNotificationTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${prayerName} in ${notifications.beforePrayer} minutes`,
            body: 'Time to prepare for prayer 🕌',
            data: { 
              prayer: prayer.name, 
              type: 'pre-prayer',
              action: 'prepare' 
            },
            categoryIdentifier: 'prayer-reminder',
          },
          trigger: {
            date: preNotificationTime,
          },
          identifier: `pre-${prayer.name}-${prayer.time.toISOString()}`,
        });
      }
    }
    
    // Schedule main prayer notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for ${prayerName} Prayer`,
        body: notifications.reminderText.replace('{prayer}', prayerName),
        data: { 
          prayer: prayer.name, 
          type: 'prayer-time' 
        },
        sound: notifications.soundEnabled ? 'default' : null,
        priority: 'high',
      },
      trigger: {
        date: prayer.time,
      },
      identifier: `${prayer.name}-${prayer.time.toISOString()}`,
    });
    
    // Schedule post-prayer check (15 minutes after)
    const postCheckTime = new Date(prayer.time.getTime() + 15 * 60000);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Did you pray ${prayerName}?`,
        body: 'Tap to mark your prayer as complete',
        data: { 
          prayer: prayer.name, 
          type: 'post-prayer-check' 
        },
      },
      trigger: {
        date: postCheckTime,
      },
      identifier: `check-${prayer.name}-${prayer.time.toISOString()}`,
    });
  }

  async snoozePrayerNotification(prayerName: PrayerName, minutes: number) {
    const snoozeTime = new Date(Date.now() + minutes * 60000);
    const displayName = PrayerTimeService.getPrayerDisplayName(prayerName);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${displayName} Prayer`,
        body: 'This is your snoozed reminder 🕌',
        data: { 
          prayer: prayerName, 
          type: 'snoozed' 
        },
        sound: 'default',
        priority: 'high',
      },
      trigger: {
        date: snoozeTime,
      },
      identifier: `snooze-${prayerName}-${snoozeTime.toISOString()}`,
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

  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'Prayer notifications are working! 🎉',
        data: { type: 'test' },
      },
      trigger: {
        seconds: 2,
      },
    });
  }

  // Update notification settings
  async updateNotificationSettings(enabled: boolean) {
    if (enabled) {
      await this.scheduleAllPrayerNotifications();
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  // Clean up
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();
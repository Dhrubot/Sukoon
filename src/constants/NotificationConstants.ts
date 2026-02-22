// src/constants/NotificationConstants.ts

// 🛠 BUMP THIS VERSION whenever change sound files or channel settings
// This forces Android to create a new channel with the fresh config.
export const NOTIFICATION_CHANNEL_VERSION = 6;

export const NOTIFICATION_SCHEDULING_DAYS = 7;
export const NOTIFICATION_MAX_FUTURE_DAYS = NOTIFICATION_SCHEDULING_DAYS + 1;

export const CHANNELS = {
  // Appends version: "prayer-times-adhan-v2"
  ADHAN: `prayer-times-adhan-v${NOTIFICATION_CHANNEL_VERSION}`,
  DEFAULT: `prayer-times-default-v${NOTIFICATION_CHANNEL_VERSION}`,
  PRE_PRAYER: `pre-prayer-v${NOTIFICATION_CHANNEL_VERSION}`,
  MINDFULNESS: `mindfulness-v${NOTIFICATION_CHANNEL_VERSION}`,
  GRACE_WARNING: `grace-warning-v${NOTIFICATION_CHANNEL_VERSION}`, // Prayer Habit Builder Tier 3
  TAHAJJUD: `tahajjud-v${NOTIFICATION_CHANNEL_VERSION}`, // Gentle Tahajjud encouragement
  RAMADAN_COUNTDOWN: `ramadan-countdown-v${NOTIFICATION_CHANNEL_VERSION}`, // Ramadan countdown & encouragement
  JUMMAH: `jummah-v${NOTIFICATION_CHANNEL_VERSION}`, // Friday Jummah reminders & Sunnah
};

export const SOUNDS = {
  // Both platforms use the short (<30s) clip for lock-screen notifications
  IOS_SHORT: 'adhan_short.wav', 
  ANDROID_SHORT: 'adhan_short',
};
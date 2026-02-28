// src/constants/NotificationConstants.ts

// 🛠 BUMP THIS VERSION whenever change sound files or channel settings
// This forces Android to create a new channel with the fresh config.
export const NOTIFICATION_CHANNEL_VERSION = 8;

export const NOTIFICATION_SCHEDULING_DAYS = 7;
export const NOTIFICATION_MAX_FUTURE_DAYS = NOTIFICATION_SCHEDULING_DAYS + 1;

// iOS imposes a hard limit of 64 local scheduled notifications per app.
// We cap at 58 to leave headroom for Tahajjud, test notifications, etc.
export const IOS_NOTIFICATION_CAP = 58;

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
  IOS_SHORT: 'adhan_ios.caf', 
  ANDROID_SHORT: 'adhan_short.ogg',
};
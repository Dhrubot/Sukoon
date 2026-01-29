// src/constants/NotificationConstants.ts

// 🛠 BUMP THIS VERSION whenever change sound files or channel settings
// This forces Android to create a new channel with the fresh config.
export const NOTIFICATION_CHANNEL_VERSION = 5;

export const NOTIFICATION_SCHEDULING_DAYS = 7;
export const NOTIFICATION_MAX_FUTURE_DAYS = NOTIFICATION_SCHEDULING_DAYS + 1;

export const CHANNELS = {
  // Appends version: "prayer-times-adhan-v2"
  ADHAN: `prayer-times-adhan-v${NOTIFICATION_CHANNEL_VERSION}`,
  DEFAULT: `prayer-times-default-v${NOTIFICATION_CHANNEL_VERSION}`,
  PRE_PRAYER: `pre-prayer-v${NOTIFICATION_CHANNEL_VERSION}`,
  MINDFULNESS: `mindfulness-v${NOTIFICATION_CHANNEL_VERSION}`,
  GRACE_WARNING: `grace-warning-v${NOTIFICATION_CHANNEL_VERSION}`, // Prayer Habit Builder Tier 3
};

export const SOUNDS = {
  // iOS needs short (<30s), Android can play long
  IOS_SHORT: 'adhan_short.wav', 
  ANDROID_FULL: 'adhan_full',
};
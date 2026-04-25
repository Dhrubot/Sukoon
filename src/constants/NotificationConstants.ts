// src/constants/NotificationConstants.ts

// 🛠 BUMP THIS VERSION whenever change sound files or channel settings
// This forces Android to create a new channel with the fresh config.
export const NOTIFICATION_CHANNEL_VERSION = 9;

export const NOTIFICATION_SCHEDULING_DAYS = 3;   // iOS Tier 1 horizon
export const NOTIFICATION_LOWER_TIER_DAYS = 2;    // iOS lower-tier horizon
export const ANDROID_NOTIFICATION_SCHEDULING_DAYS = 7;
export const ANDROID_NOTIFICATION_LOWER_TIER_DAYS = 5;
export const NOTIFICATION_MAX_FUTURE_DAYS = ANDROID_NOTIFICATION_SCHEDULING_DAYS + 1;

// iOS imposes a hard limit of 64 local scheduled notifications per app.
// We cap at 58 to leave headroom for Tahajjud, test notifications, etc.
export const IOS_NOTIFICATION_CAP = 58;

export const CHANNELS = {
  // Appends version: "prayer-times-adhan-v2"
  ADHAN: `prayer-times-adhan-v${NOTIFICATION_CHANNEL_VERSION}`,
  ADHAN_SILENT: `prayer-times-adhan-silent-v${NOTIFICATION_CHANNEL_VERSION}`,
  DEFAULT: `prayer-times-default-v${NOTIFICATION_CHANNEL_VERSION}`,
  PRE_PRAYER: `pre-prayer-v${NOTIFICATION_CHANNEL_VERSION}`,
  PERSISTENT_URGENT: `persistent-urgent-v${NOTIFICATION_CHANNEL_VERSION}`,
  MINDFULNESS: `mindfulness-v${NOTIFICATION_CHANNEL_VERSION}`,
  GRACE_WARNING: `grace-warning-v${NOTIFICATION_CHANNEL_VERSION}`, // Prayer Habit Builder Tier 3
  TAHAJJUD: `tahajjud-v${NOTIFICATION_CHANNEL_VERSION}`, // Gentle Tahajjud encouragement
  RAMADAN_COUNTDOWN: `ramadan-countdown-v${NOTIFICATION_CHANNEL_VERSION}`, // Ramadan countdown & encouragement
  JUMMAH: `jummah-v${NOTIFICATION_CHANNEL_VERSION}`, // Friday Jummah reminders & Sunnah
};

// Scheduling lock timeout (ms) — prevents concurrent scheduling runs
export const SCHEDULING_LOCK_TIMEOUT_MS = 120_000; // 2 minutes

// Keep-alive notification interval (ms) — self-renewing safety net
export const KEEP_ALIVE_INTERVAL_MS = 48 * 60 * 60 * 1000; // 48 hours

// Prayer time API request timeout (ms)
export const PRAYER_API_TIMEOUT_MS = 8_000;

// Hero ring early advance threshold (minutes before next prayer's adhan)
export const HERO_ADVANCE_MINUTES = 15;

export const SOUNDS = {
  // Both platforms use the short (<30s) clip for lock-screen notifications
  IOS_SHORT: 'adhan_ios.caf', 
  ANDROID_SHORT: 'adhan_short.ogg',
};

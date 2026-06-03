import { CHANNELS, SOUNDS } from '../../constants/NotificationConstants';
import { UserSettings } from '../../types';

/** Which audio clip the user wants to hear for the call to prayer. */
export type AdhanClip = 'short' | 'full';

/**
 * How the adhan audio is delivered for a given platform / permission state.
 * - `native_alarm`        — Android AlarmManager + foreground-service MediaPlayer (USAGE_ALARM).
 *                           Primary path: bypasses silent/DND, plays any length, survives app kill.
 * - `channel_sound`       — Android notification-channel sound (alarm-grade, short clip only).
 *                           Fallback when exact-alarm permission is unavailable.
 * - `ios_notification`    — iOS notification sound (short clip). Full-length / DND-bypass would
 *                           require Apple's Critical Alerts entitlement (out of scope).
 * - `silent`              — adhan disabled (optionally a standard beep).
 */
export type AdhanAudioEngine = 'native_alarm' | 'channel_sound' | 'ios_notification' | 'silent';

type NotificationSettings = UserSettings['notifications'];
type SupportedPlatform = string;

export interface AdhanDeliveryPlan {
  /** True when the call to prayer should be audible. */
  audible: boolean;
  /** The clip that should ultimately play (a channel_sound fallback forces 'short'). */
  clip: AdhanClip;
  /** How the audio is delivered. */
  engine: AdhanAudioEngine;
  /** Sound attached to the notification request (channel_sound / iOS). */
  notificationSound?: string;
  /** Android channel for the (possibly silent) visual notification. */
  androidChannelId: string;
  /** Whether to schedule the native AlarmManager-backed audio service for this prayer. */
  scheduleNativeAudio: boolean;
}

function hasAdhanEnabled(notifications: NotificationSettings): boolean {
  return Boolean(notifications.enabled && notifications.adhanEnabled);
}

/** The clip the user selected. `fullAdhanEnabled` now means "play the full clip". */
export function selectedAdhanClip(notifications: NotificationSettings): AdhanClip {
  return notifications.fullAdhanEnabled ? 'full' : 'short';
}

/** Whether the adhan should make sound at all (independent of delivery mechanism). */
export function isAdhanAudible(notifications: NotificationSettings): boolean {
  return hasAdhanEnabled(notifications);
}

/**
 * Single source of truth for adhan audio delivery. Used by both the scheduler and the
 * runtime/foreground handler so background and foreground behavior can never diverge.
 *
 * @param exactAlarmGranted Android exact-alarm permission state. Ignored off Android.
 */
export function resolveAdhanDelivery(
  platform: SupportedPlatform,
  notifications: NotificationSettings,
  exactAlarmGranted: boolean
): AdhanDeliveryPlan {
  if (hasAdhanEnabled(notifications)) {
    const clip = selectedAdhanClip(notifications);

    if (platform === 'android') {
      // Primary: native foreground-service playback (alarm stream, any length, app-killed safe).
      if (exactAlarmGranted) {
        return {
          audible: true,
          clip,
          engine: 'native_alarm',
          notificationSound: undefined,
          androidChannelId: CHANNELS.ADHAN_SILENT,
          scheduleNativeAudio: true,
        };
      }

      // Fallback: alarm-grade notification channel sound. Channels can only reliably
      // play a short (<30s) clip, so we degrade `full` to `short` here.
      return {
        audible: true,
        clip: 'short',
        engine: 'channel_sound',
        notificationSound: SOUNDS.ANDROID_SHORT,
        androidChannelId: CHANNELS.ADHAN,
        scheduleNativeAudio: false,
      };
    }

    // iOS: short clip via notification sound.
    return {
      audible: true,
      clip: 'short',
      engine: 'ios_notification',
      notificationSound: SOUNDS.IOS_SHORT,
      androidChannelId: CHANNELS.ADHAN,
      scheduleNativeAudio: false,
    };
  }

  // Adhan off: optionally play the standard beep, otherwise stay silent.
  if (notifications.enabled && notifications.soundEnabled) {
    return {
      audible: false,
      clip: 'short',
      engine: 'silent',
      notificationSound: 'default',
      androidChannelId: CHANNELS.DEFAULT,
      scheduleNativeAudio: false,
    };
  }

  return {
    audible: false,
    clip: 'short',
    engine: 'silent',
    notificationSound: undefined,
    androidChannelId: CHANNELS.DEFAULT,
    scheduleNativeAudio: false,
  };
}

/**
 * Whether the foreground notification handler should mute the channel sound for an adhan
 * notification. We mute only when the native service produces the audio (`native_alarm`),
 * so the `channel_sound` fallback can still be heard while the app is foregrounded.
 */
export function shouldSuppressForegroundAdhanNotificationSound(plan: AdhanDeliveryPlan): boolean {
  return plan.engine === 'native_alarm';
}

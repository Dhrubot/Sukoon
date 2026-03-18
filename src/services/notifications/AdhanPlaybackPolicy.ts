import { CHANNELS, SOUNDS } from '../../constants/NotificationConstants';
import { UserSettings } from '../../types';

export type AdhanPlaybackPolicy =
  | 'silent'
  | 'short_notification_sound'
  | 'foreground_full_clip'
  | 'android_scheduled_full_adhan';

type NotificationSettings = UserSettings['notifications'];
type SupportedPlatform = string;

export interface MainPrayerNotificationAudioResolution {
  playbackPolicy: AdhanPlaybackPolicy;
  notificationSound?: string;
  androidChannelId: string;
  shouldScheduleNativeFullAdhan: boolean;
}

function hasAdhanEnabled(notifications: NotificationSettings): boolean {
  return Boolean(notifications.enabled && notifications.adhanEnabled);
}

export function resolveMainPrayerNotificationAudio(
  platform: SupportedPlatform,
  notifications: NotificationSettings
): MainPrayerNotificationAudioResolution {
  if (hasAdhanEnabled(notifications)) {
    if (platform === 'android' && notifications.fullAdhanEnabled) {
      return {
        playbackPolicy: 'android_scheduled_full_adhan',
        notificationSound: undefined,
        androidChannelId: CHANNELS.ADHAN_SILENT,
        shouldScheduleNativeFullAdhan: true,
      };
    }

    return {
      playbackPolicy: 'short_notification_sound',
      notificationSound: platform === 'ios' ? SOUNDS.IOS_SHORT : SOUNDS.ANDROID_SHORT,
      androidChannelId: CHANNELS.ADHAN,
      shouldScheduleNativeFullAdhan: false,
    };
  }

  if (notifications.enabled && notifications.soundEnabled) {
    return {
      playbackPolicy: 'silent',
      notificationSound: 'default',
      androidChannelId: CHANNELS.DEFAULT,
      shouldScheduleNativeFullAdhan: false,
    };
  }

  return {
    playbackPolicy: 'silent',
    notificationSound: undefined,
    androidChannelId: CHANNELS.DEFAULT,
    shouldScheduleNativeFullAdhan: false,
  };
}

export function resolveRuntimeAdhanPlaybackPolicy(
  platform: SupportedPlatform,
  notifications: NotificationSettings
): AdhanPlaybackPolicy {
  if (!hasAdhanEnabled(notifications)) {
    return 'silent';
  }

  if (platform === 'android' && notifications.fullAdhanEnabled) {
    return 'android_scheduled_full_adhan';
  }

  return 'foreground_full_clip';
}

export function shouldSuppressForegroundAdhanNotificationSound(
  platform: SupportedPlatform,
  isAdhanNotification: boolean,
  notifications: NotificationSettings
): boolean {
  if (!isAdhanNotification || platform !== 'android') {
    return false;
  }

  return resolveRuntimeAdhanPlaybackPolicy(platform, notifications) !== 'silent';
}

export function shouldPlayForegroundClip(policy: AdhanPlaybackPolicy): boolean {
  return policy === 'foreground_full_clip';
}

export function usesAndroidScheduledFullAdhan(policy: AdhanPlaybackPolicy): boolean {
  return policy === 'android_scheduled_full_adhan';
}

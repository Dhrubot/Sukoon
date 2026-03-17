import {
  resolveMainPrayerNotificationAudio,
  resolveRuntimeAdhanPlaybackPolicy,
  shouldPlayForegroundClip,
  shouldSuppressForegroundAdhanNotificationSound,
  usesAndroidScheduledFullAdhan,
} from '../services/notifications/AdhanPlaybackPolicy';
import { CHANNELS, SOUNDS } from '../constants/NotificationConstants';
import { UserSettings } from '../types';

const baseNotifications: UserSettings['notifications'] = {
  enabled: true,
  adhanEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  beforePrayer: 10,
  reminderText: 'Time for {prayer} prayer',
  postPrayerCheck: false,
  liveActivityEnabled: false,
};

describe('AdhanPlaybackPolicy', () => {
  it('uses short custom sound for iOS scheduled prayer notifications', () => {
    const resolution = resolveMainPrayerNotificationAudio('ios', baseNotifications);

    expect(resolution).toEqual({
      playbackPolicy: 'short_notification_sound',
      notificationSound: SOUNDS.IOS_SHORT,
      androidChannelId: CHANNELS.ADHAN,
      shouldScheduleNativeFullAdhan: false,
    });
  });

  it('uses Android native full adhan scheduling when full adhan is enabled', () => {
    const resolution = resolveMainPrayerNotificationAudio('android', {
      ...baseNotifications,
      fullAdhanEnabled: true,
    });

    expect(resolution).toEqual({
      playbackPolicy: 'android_scheduled_full_adhan',
      notificationSound: undefined,
      androidChannelId: CHANNELS.ADHAN_SILENT,
      shouldScheduleNativeFullAdhan: true,
    });
  });

  it('falls back to default notification sound when adhan is off but sounds remain enabled', () => {
    const resolution = resolveMainPrayerNotificationAudio('android', {
      ...baseNotifications,
      adhanEnabled: false,
    });

    expect(resolution).toEqual({
      playbackPolicy: 'silent',
      notificationSound: 'default',
      androidChannelId: CHANNELS.DEFAULT,
      shouldScheduleNativeFullAdhan: false,
    });
  });

  it('returns silent runtime policy when adhan is disabled', () => {
    expect(
      resolveRuntimeAdhanPlaybackPolicy('ios', {
        ...baseNotifications,
        adhanEnabled: false,
      })
    ).toBe('silent');
  });

  it('returns foreground clip runtime policy for iOS when adhan is enabled', () => {
    const policy = resolveRuntimeAdhanPlaybackPolicy('ios', baseNotifications);

    expect(policy).toBe('foreground_full_clip');
    expect(shouldPlayForegroundClip(policy)).toBe(true);
    expect(usesAndroidScheduledFullAdhan(policy)).toBe(false);
  });

  it('suppresses foreground notification sound on Android when the app handles playback', () => {
    expect(
      shouldSuppressForegroundAdhanNotificationSound('android', true, baseNotifications)
    ).toBe(true);
  });

  it('does not suppress non-adhan notifications', () => {
    expect(
      shouldSuppressForegroundAdhanNotificationSound('android', false, baseNotifications)
    ).toBe(false);
  });
});

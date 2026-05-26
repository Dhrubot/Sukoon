import {
  resolveAdhanDelivery,
  isAdhanAudible,
  selectedAdhanClip,
  shouldSuppressForegroundAdhanNotificationSound,
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
  describe('resolveAdhanDelivery', () => {
    it('uses the native alarm service on Android when exact alarms are granted', () => {
      const plan = resolveAdhanDelivery('android', baseNotifications, true);

      expect(plan).toEqual({
        audible: true,
        clip: 'short',
        engine: 'native_alarm',
        notificationSound: undefined,
        androidChannelId: CHANNELS.ADHAN_SILENT,
        scheduleNativeAudio: true,
      });
    });

    it('passes the full clip through to the native service when selected', () => {
      const plan = resolveAdhanDelivery(
        'android',
        { ...baseNotifications, fullAdhanEnabled: true },
        true
      );

      expect(plan.engine).toBe('native_alarm');
      expect(plan.clip).toBe('full');
      expect(plan.scheduleNativeAudio).toBe(true);
    });

    it('falls back to the alarm-grade channel sound (short clip) when exact alarms are denied', () => {
      const plan = resolveAdhanDelivery(
        'android',
        { ...baseNotifications, fullAdhanEnabled: true },
        false
      );

      expect(plan).toEqual({
        audible: true,
        clip: 'short', // full degrades to short on the channel fallback
        engine: 'channel_sound',
        notificationSound: SOUNDS.ANDROID_SHORT,
        androidChannelId: CHANNELS.ADHAN,
        scheduleNativeAudio: false,
      });
    });

    it('uses the iOS short notification sound', () => {
      const plan = resolveAdhanDelivery('ios', baseNotifications, false);

      expect(plan).toEqual({
        audible: true,
        clip: 'short',
        engine: 'ios_notification',
        notificationSound: SOUNDS.IOS_SHORT,
        androidChannelId: CHANNELS.ADHAN,
        scheduleNativeAudio: false,
      });
    });

    it('falls back to the default beep when adhan is off but sounds remain enabled', () => {
      const plan = resolveAdhanDelivery(
        'android',
        { ...baseNotifications, adhanEnabled: false },
        true
      );

      expect(plan).toEqual({
        audible: false,
        clip: 'short',
        engine: 'silent',
        notificationSound: 'default',
        androidChannelId: CHANNELS.DEFAULT,
        scheduleNativeAudio: false,
      });
    });

    it('is fully silent when adhan and sounds are both off', () => {
      const plan = resolveAdhanDelivery(
        'android',
        { ...baseNotifications, adhanEnabled: false, soundEnabled: false },
        true
      );

      expect(plan.audible).toBe(false);
      expect(plan.notificationSound).toBeUndefined();
      expect(plan.scheduleNativeAudio).toBe(false);
    });
  });

  describe('isAdhanAudible / selectedAdhanClip', () => {
    it('reports audible when adhan is enabled', () => {
      expect(isAdhanAudible(baseNotifications)).toBe(true);
      expect(isAdhanAudible({ ...baseNotifications, adhanEnabled: false })).toBe(false);
    });

    it('maps the fullAdhanEnabled toggle to the clip choice', () => {
      expect(selectedAdhanClip(baseNotifications)).toBe('short');
      expect(selectedAdhanClip({ ...baseNotifications, fullAdhanEnabled: true })).toBe('full');
    });
  });

  describe('shouldSuppressForegroundAdhanNotificationSound', () => {
    it('mutes the channel sound only for the native_alarm engine', () => {
      const nativePlan = resolveAdhanDelivery('android', baseNotifications, true);
      const fallbackPlan = resolveAdhanDelivery('android', baseNotifications, false);

      expect(shouldSuppressForegroundAdhanNotificationSound(nativePlan)).toBe(true);
      expect(shouldSuppressForegroundAdhanNotificationSound(fallbackPlan)).toBe(false);
    });
  });
});

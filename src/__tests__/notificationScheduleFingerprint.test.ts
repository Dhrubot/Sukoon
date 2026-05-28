// src/__tests__/notificationScheduleFingerprint.test.ts
// Unit tests for fingerprint v2: minute-rounding, Hijri inclusion,
// no UTC-offset term, and determinism.

import {
  buildNotificationScheduleFingerprintV2,
  buildNotificationScheduleFingerprint,
  FINGERPRINT_V1_KEY,
  FINGERPRINT_V2_KEY,
} from '../utils/notificationScheduleFingerprint';
import { PrayerTime, UserSettings } from '../types';

// ── Minimal mock for StorageService (ramadan.ts calls it for getCachedHijriDate) ─
jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getValue: jest.fn(() => null),
    setValue: jest.fn(),
    deleteValue: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────────

const baseSettings: UserSettings = {
  location: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
  calculationMethod: 'MWL',
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Time for {prayer} prayer',
    postPrayerCheck: false,
    liveActivityEnabled: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: false,
    persistentReminders: { enabled: false, firstCheckDelay: 15, interval: 15, maxReminders: 3 },
    gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [10], defaultInterval: 10, maxSnoozesPerPrayer: 3 },
    quietHours: { enabled: false, start: '22:00', end: '04:00' },
  },
  mosqueMode: {
    enabled: false,
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    iqamahOffsets: { Fajr: 15, Dhuhr: 15, Asr: 10, Maghrib: 5, Isha: 15 },
  },
  theme: 'auto',
};

function makePrayer(name: string, h: number, m: number, s: number = 0, ms: number = 0): PrayerTime {
  const t = new Date(2026, 0, 1, h, m, s, ms);
  return { name: name as PrayerTime['name'], time: t, timestamp: t.getTime(), isNext: false };
}

const PRAYERS_EXACT_MINUTE: PrayerTime[] = [
  makePrayer('Fajr', 5, 12, 0, 0),
  makePrayer('Dhuhr', 12, 5, 0, 0),
  makePrayer('Asr', 15, 30, 0, 0),
  makePrayer('Maghrib', 17, 40, 0, 0),
  makePrayer('Isha', 19, 0, 0, 0),
];

// Same prayers but with sub-second noise (500 ms offset)
const PRAYERS_WITH_MS_NOISE: PrayerTime[] = PRAYERS_EXACT_MINUTE.map((p) => ({
  ...p,
  time: new Date(p.time.getTime() + 500),
  timestamp: p.time.getTime() + 500,
}));

// Same prayers but shifted by exactly 1 full minute
const PRAYERS_SHIFTED_ONE_MINUTE: PrayerTime[] = PRAYERS_EXACT_MINUTE.map((p) => ({
  ...p,
  time: new Date(p.time.getTime() + 60000),
  timestamp: p.time.getTime() + 60000,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildNotificationScheduleFingerprintV2', () => {
  it('is deterministic: same inputs produce identical output', () => {
    const fp1 = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const fp2 = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    expect(fp1).toBe(fp2);
  });

  it('eliminates sub-minute noise: 500ms variation does not change fingerprint', () => {
    const fpExact = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const fpNoisy = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_WITH_MS_NOISE, null);
    expect(fpExact).toBe(fpNoisy);
  });

  it('detects genuine prayer time shift: 1-minute shift changes fingerprint', () => {
    const fpBase = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const fpShifted = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_SHIFTED_ONE_MINUTE, null);
    expect(fpBase).not.toBe(fpShifted);
  });

  it('does NOT include UTC timezone offset in the hash', () => {
    // Parse the JSON and verify timezoneOffset key is absent
    const fp = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const parsed = JSON.parse(fp);
    expect(parsed).not.toHaveProperty('timezoneOffset');
    expect(parsed).not.toHaveProperty('timezone_offset');
  });

  it('includes Hijri date when provided', () => {
    const fpNoHijri = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const fpWithHijri = buildNotificationScheduleFingerprintV2(
      baseSettings,
      PRAYERS_EXACT_MINUTE,
      { year: 1447, month: 11, day: 15 }
    );
    expect(fpNoHijri).not.toBe(fpWithHijri);

    const parsed = JSON.parse(fpWithHijri);
    expect(parsed.hijriDate).toEqual({ year: 1447, month: 11, day: 15 });
  });

  it('changes fingerprint when Hijri date changes (e.g. month rollover)', () => {
    const fpMonthA = buildNotificationScheduleFingerprintV2(
      baseSettings,
      PRAYERS_EXACT_MINUTE,
      { year: 1447, month: 9, day: 30 }
    );
    const fpMonthB = buildNotificationScheduleFingerprintV2(
      baseSettings,
      PRAYERS_EXACT_MINUTE,
      { year: 1447, month: 10, day: 1 }
    );
    expect(fpMonthA).not.toBe(fpMonthB);
  });

  it('stores minute-rounded timestamps (not raw ms) in the JSON', () => {
    const fp = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const parsed = JSON.parse(fp);

    for (const entry of parsed.prayerTimes) {
      // minutesSinceEpoch should be an integer (no fractional minutes)
      expect(Number.isInteger(entry.minutesSinceEpoch)).toBe(true);
      // Verify it equals Math.floor(ms / 60000)
      const matchingPrayer = PRAYERS_EXACT_MINUTE.find((p) => p.name === entry.name);
      if (matchingPrayer) {
        expect(entry.minutesSinceEpoch).toBe(
          Math.floor(matchingPrayer.time.getTime() / 60000)
        );
      }
    }
  });

  it('detects settings change (e.g. beforePrayer minutes)', () => {
    const fpBefore = buildNotificationScheduleFingerprintV2(baseSettings, PRAYERS_EXACT_MINUTE, null);
    const modifiedSettings = {
      ...baseSettings,
      notifications: { ...baseSettings.notifications, beforePrayer: 15 },
    };
    const fpAfter = buildNotificationScheduleFingerprintV2(modifiedSettings, PRAYERS_EXACT_MINUTE, null);
    expect(fpBefore).not.toBe(fpAfter);
  });
});

describe('FINGERPRINT key constants', () => {
  it('exports the correct key strings', () => {
    expect(FINGERPRINT_V1_KEY).toBe('notification_schedule_fingerprint');
    expect(FINGERPRINT_V2_KEY).toBe('notification_schedule_fingerprint_v2');
  });
});

describe('buildNotificationScheduleFingerprint (v1 — backward compat)', () => {
  it('still returns a valid JSON string', () => {
    const fp = buildNotificationScheduleFingerprint(baseSettings, PRAYERS_EXACT_MINUTE);
    expect(() => JSON.parse(fp)).not.toThrow();
  });
});

import {
  formatDuration,
  formatPrayerDate,
  formatTime,
  formatTimeRemaining,
  getGreeting,
  getIslamicDate,
  getLocalDateKey,
  getTimeOfDay,
  isPrayerTime,
} from '../utils/dateHelpers';

describe('dateHelpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 17, 10, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats remaining time across minute, hour, day, and expired states', () => {
    expect(formatTimeRemaining(new Date(2026, 2, 17, 9, 59, 0))).toBe('Now');
    expect(formatTimeRemaining(new Date(2026, 2, 17, 10, 30, 0))).toBe('30 min');
    expect(formatTimeRemaining(new Date(2026, 2, 17, 12, 15, 0))).toBe('2h 15m');
    expect(formatTimeRemaining(new Date(2026, 2, 19, 10, 0, 0))).toBe('2 days');
  });

  it('formats prayer-relative calendar labels', () => {
    expect(formatPrayerDate(new Date(2026, 2, 17, 18, 0, 0))).toBe('Today');
    expect(formatPrayerDate(new Date(2026, 2, 18, 18, 0, 0))).toBe('Tomorrow');
    expect(formatPrayerDate(new Date(2026, 2, 16, 18, 0, 0))).toBe('Yesterday');
    expect(formatPrayerDate(new Date(2026, 2, 22, 18, 0, 0))).toBe('Sunday, Mar 22');
  });

  it('derives time-of-day greetings from the current clock', () => {
    expect(getTimeOfDay()).toBe('morning');
    expect(getGreeting('Amina')).toBe('Good morning, Amina ☀️');

    jest.setSystemTime(new Date(2026, 2, 17, 13, 0, 0));
    expect(getTimeOfDay()).toBe('afternoon');
    expect(getGreeting()).toBe('Good afternoon 🌞');

    jest.setSystemTime(new Date(2026, 2, 17, 18, 30, 0));
    expect(getTimeOfDay()).toBe('evening');

    jest.setSystemTime(new Date(2026, 2, 17, 23, 0, 0));
    expect(getTimeOfDay()).toBe('night');
    expect(getGreeting('Yusuf')).toBe('Peace be upon you, Yusuf 🌙');
  });

  it('formats durations and detects whether a prayer is within the active window', () => {
    expect(isPrayerTime(new Date(2026, 2, 17, 10, 20, 0))).toBe(true);
    expect(isPrayerTime(new Date(2026, 2, 17, 11, 0, 0))).toBe(false);

    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(180)).toBe('3 minutes');

    expect(formatTime(45)).toBe('45 min');
    expect(formatTime(125)).toBe('2h 5m');
    expect(formatTime(180)).toBe('3 hours');
  });

  it('formats stable date strings for local keys and the placeholder Islamic date', () => {
    expect(getLocalDateKey(new Date(2026, 2, 17, 10, 0, 0))).toBe('2026-03-17');
    expect(getIslamicDate()).toBe('17 March 2026');
  });
});

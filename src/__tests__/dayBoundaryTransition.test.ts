// src/__tests__/dayBoundaryTransition.test.ts
// Test 2: Day-boundary transition — verify that when the date changes
// while the app is backgrounded, loadPrayerTimes is called on resume.

import { getLocalDateKey } from '../utils/dateHelpers';

// We test the core logic: date comparison that triggers the reload.
// The actual AppState listener is in PrayerTimesProvider — we test the
// predicate it uses: currentDateKey !== lastLoadedDateRef.current

describe('Day-boundary detection', () => {
  it('getLocalDateKey returns YYYY-MM-DD format', () => {
    const key = getLocalDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getLocalDateKey returns different keys for different dates', () => {
    const today = getLocalDateKey(new Date(2025, 2, 9));  // March 9
    const tomorrow = getLocalDateKey(new Date(2025, 2, 10)); // March 10
    expect(today).not.toBe(tomorrow);
  });

  it('getLocalDateKey returns same key for same calendar day', () => {
    const morning = getLocalDateKey(new Date(2025, 2, 9, 6, 0));
    const evening = getLocalDateKey(new Date(2025, 2, 9, 22, 0));
    expect(morning).toBe(evening);
  });

  it('detects midnight crossover correctly', () => {
    const beforeMidnight = getLocalDateKey(new Date(2025, 2, 9, 23, 59));
    const afterMidnight = getLocalDateKey(new Date(2025, 2, 10, 0, 1));
    expect(beforeMidnight).not.toBe(afterMidnight);
    // This is the condition that triggers loadPrayerTimes() in PrayerTimesProvider:
    // currentDateKey !== lastLoadedDateRef.current
  });
});

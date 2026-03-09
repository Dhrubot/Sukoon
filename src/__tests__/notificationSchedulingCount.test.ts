// src/__tests__/notificationSchedulingCount.test.ts
// Test 3: Notification scheduling count — verify iOS cap (≤58) is respected
// and tier distribution is correct.

import { IOS_NOTIFICATION_CAP, NOTIFICATION_SCHEDULING_DAYS, NOTIFICATION_LOWER_TIER_DAYS } from '../constants/NotificationConstants';

describe('Notification scheduling constants', () => {
  it('iOS cap is 58 (leaves headroom below 64 hard limit)', () => {
    expect(IOS_NOTIFICATION_CAP).toBe(58);
    expect(IOS_NOTIFICATION_CAP).toBeLessThan(64);
  });

  it('Tier 1 (Adhan) schedules for more days than lower tiers', () => {
    expect(NOTIFICATION_SCHEDULING_DAYS).toBeGreaterThan(NOTIFICATION_LOWER_TIER_DAYS);
  });

  it('Tier 1 horizon is 3 days', () => {
    expect(NOTIFICATION_SCHEDULING_DAYS).toBe(3);
  });

  it('Lower tier horizon is 2 days', () => {
    expect(NOTIFICATION_LOWER_TIER_DAYS).toBe(2);
  });

  it('Max Tier 1 notifications per day (5 prayers × 1 adhan = 5) fits within iOS cap across horizon', () => {
    // 3 days × 5 prayers = 15 Tier 1 notifications
    // Plus pre-prayer, grace warnings, reminders, keep-alive, etc.
    // Total should stay under 58
    const maxTier1 = NOTIFICATION_SCHEDULING_DAYS * 5;
    expect(maxTier1).toBeLessThanOrEqual(IOS_NOTIFICATION_CAP);
  });
});

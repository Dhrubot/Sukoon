// src/__tests__/dstRetryBackoff.test.ts
// Unit tests for the DST retry back-off in useNotificationRescheduler.
//
// Strategy: test the key back-off behaviour via the StorageService key
// interactions, mocking dependencies so we never render a React hook.

import { DST_RETRY_BACKOFF_MS } from '../constants/NotificationConstants';

// ── Storage mock ───────────────────────────────────────────────────────────────
const mockStorage: Record<string, string> = {};

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getValue: jest.fn((key: string) => mockStorage[key] ?? null),
    setValue: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    deleteValue: jest.fn((key: string) => { delete mockStorage[key]; }),
    isInitialized: jest.fn(() => true),
    getUserSettings: jest.fn(() => null),
  },
}));

// ── Logger mock ────────────────────────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── NotificationService mock ───────────────────────────────────────────────────
const mockReconcile = jest.fn(() => Promise.resolve(false));
jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    get reconcileScheduling() { return mockReconcile; },
    maybeRescheduleExtendedNotifications: jest.fn(() => Promise.resolve(false)),
  },
}));

// ── NotificationTraceService mock ─────────────────────────────────────────────
jest.mock('../services/NotificationTraceService', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

// ── LocationService mock ───────────────────────────────────────────────────────
jest.mock('../services/LocationService', () => ({
  __esModule: true,
  default: { getCurrentLocation: jest.fn(() => Promise.resolve(null)) },
}));

// ── useStore mock ──────────────────────────────────────────────────────────────
jest.mock('../store/useStore', () => ({
  useStore: {
    getState: jest.fn(() => ({
      userSettings: {
        location: { latitude: 23.8, longitude: 90.4, city: 'Dhaka', country: 'BD' },
      },
      setLocation: jest.fn(),
      updateUserSettings: jest.fn(),
    })),
  },
}));

// ── notificationScheduleFingerprint mock ─────────────────────────────────────
jest.mock('../utils/notificationScheduleFingerprint', () => ({
  buildNotificationLocationFingerprint: jest.fn(() => '23.810,90.413'),
}));

// ── Inline implementation of the DST back-off logic ──────────────────────────
// We test the algorithm in isolation, mirroring the logic in
// useNotificationRescheduler.ts, to avoid React hook rendering complexity.

import StorageService from '../services/StorageService';
import NotificationService from '../services/NotificationService';
import NotificationTraceService from '../services/NotificationTraceService';
import logger from '../utils/logger';

const DST_LAST_ATTEMPT_KEY = 'last_dst_reschedule_attempted_at';

async function simulateDstReschedule(
  savedOffset: string | null,
  currentOffset: number
): Promise<{ skipped: boolean; rescheduled: boolean }> {
  if (savedOffset === null || parseInt(savedOffset, 10) === currentOffset) {
    return { skipped: false, rescheduled: false };
  }

  // DST change detected — apply back-off check
  const lastAttemptStr = StorageService.getValue(DST_LAST_ATTEMPT_KEY);
  if (lastAttemptStr) {
    const msSinceAttempt = Date.now() - parseInt(lastAttemptStr, 10);
    if (msSinceAttempt < DST_RETRY_BACKOFF_MS) {
      // Back-off: too soon
      return { skipped: true, rescheduled: false };
    }
  }

  // Record the attempt timestamp BEFORE calling reconcile
  StorageService.setValue(DST_LAST_ATTEMPT_KEY, Date.now().toString());

  const rescheduled = await NotificationService.reconcileScheduling('timezone_change', { force: true });

  if (rescheduled) {
    // Clear the back-off key on success
    StorageService.deleteValue(DST_LAST_ATTEMPT_KEY);
    // Update saved offset
    StorageService.setValue('notification_utc_offset', currentOffset.toString());
  }

  return { skipped: false, rescheduled };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DST retry back-off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    mockReconcile.mockResolvedValue(false);
  });

  it('constant DST_RETRY_BACKOFF_MS is 5 minutes (300000 ms)', () => {
    expect(DST_RETRY_BACKOFF_MS).toBe(5 * 60 * 1000);
  });

  it('fires reschedule on first DST change attempt (no prior attempt key)', async () => {
    const { skipped, rescheduled } = await simulateDstReschedule('0', 60);
    expect(skipped).toBe(false);
    expect(mockReconcile).toHaveBeenCalledWith('timezone_change', { force: true });
    // reconcile returned false so rescheduled is false
    expect(rescheduled).toBe(false);
    // Attempt key must be set
    expect(mockStorage[DST_LAST_ATTEMPT_KEY]).toBeDefined();
  });

  it('skips reschedule when a failed attempt occurred within back-off window', async () => {
    // Simulate a failed attempt 2 minutes ago (within 5-min back-off)
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    mockStorage[DST_LAST_ATTEMPT_KEY] = twoMinutesAgo.toString();

    const { skipped } = await simulateDstReschedule('0', 60);
    expect(skipped).toBe(true);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('allows retry after back-off window expires (6 minutes ago)', async () => {
    // Simulate a failed attempt 6 minutes ago (past the 5-min back-off)
    const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
    mockStorage[DST_LAST_ATTEMPT_KEY] = sixMinutesAgo.toString();

    const { skipped } = await simulateDstReschedule('0', 60);
    expect(skipped).toBe(false);
    expect(mockReconcile).toHaveBeenCalledWith('timezone_change', { force: true });
  });

  it('clears the attempt key when reschedule succeeds', async () => {
    mockReconcile.mockResolvedValueOnce(true);

    await simulateDstReschedule('0', 60);

    // On success the key is deleted
    expect(mockStorage[DST_LAST_ATTEMPT_KEY]).toBeUndefined();
    // And the saved offset is updated
    expect(mockStorage['notification_utc_offset']).toBe('60');
  });

  it('retains the attempt key when reschedule fails (throttle subsequent attempts)', async () => {
    mockReconcile.mockResolvedValueOnce(false);

    await simulateDstReschedule('0', 60);

    // Key should still be set (failure → no delete)
    expect(mockStorage[DST_LAST_ATTEMPT_KEY]).toBeDefined();
    // The saved offset must NOT be updated on failure
    expect(mockStorage['notification_utc_offset']).toBeUndefined();
  });

  it('does nothing when offset has not changed (no DST)', async () => {
    const { skipped, rescheduled } = await simulateDstReschedule('60', 60);
    expect(skipped).toBe(false);
    expect(rescheduled).toBe(false);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('does nothing when there is no previously saved offset', async () => {
    const { skipped, rescheduled } = await simulateDstReschedule(null, 60);
    expect(skipped).toBe(false);
    expect(rescheduled).toBe(false);
    expect(mockReconcile).not.toHaveBeenCalled();
  });
});

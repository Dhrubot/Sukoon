/**
 * MeaningsService test suite.
 *
 * Covers:
 *  - Preference state machine (getPreference / setPreference)
 *  - Daily-rotation algorithm (getTodaysMeaning)
 *  - 5-day invite-prompt eligibility (shouldShowPrompt)
 *  - Implicit opt-in (recordScreenOpen)
 *  - Reset helper (resetForTesting)
 */

// ─── External collaborator mocks ─────────────────────────────────────────────

const mockStorage: Record<string, string> = {};

jest.mock('../../../services/StorageService', () => ({
  __esModule: true,
  default: {
    getValue: jest.fn((key: string) => mockStorage[key] ?? null),
    setValue: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    deleteValue: jest.fn((key: string) => {
      delete mockStorage[key];
    }),
  },
}));

jest.mock('../../../services/AnalyticsService', () => ({
  __esModule: true,
  default: {
    logMeaningsPromptAnswered: jest.fn(),
    logMeaningsScreenOpened: jest.fn(),
  },
}));

// ─── Imports (AFTER jest.mock calls) ────────────────────────────────────────

import AnalyticsService from '../../../services/AnalyticsService';
import StorageService from '../../../services/StorageService';
import { MEANINGS_CONSTANTS, MEANINGS_STORAGE_KEYS } from '../constants';
import { ALL_MEANINGS } from '../content';

// Import the singleton — must come after all mocks are registered.
import meaningsService from '../services/MeaningsService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Advance simulated time by N whole days from the given base date. */
function advanceDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

const BASE_DATE = new Date('2026-06-04T12:00:00Z');

// ─── Suite ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear the in-memory storage map.
  Object.keys(mockStorage).forEach((k) => {
    delete mockStorage[k];
  });

  // Reset all mock function call history.
  jest.clearAllMocks();

  // Reset service subscriber list + any module-level caches.
  meaningsService.resetForTesting();

  // Fix the simulated clock to the project's "current date".
  jest.useFakeTimers();
  jest.setSystemTime(BASE_DATE);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── 1. Preference state machine ─────────────────────────────────────────────

describe('Preference state machine', () => {
  it('1. returns "unset" when storage is empty', () => {
    expect(meaningsService.getPreference()).toBe('unset');
  });

  it('2. returns "opted_in" after setPreference("opted_in", "prompt")', () => {
    meaningsService.setPreference('opted_in', 'prompt');
    expect(meaningsService.getPreference()).toBe('opted_in');
  });

  it('3. returns "declined" and populates meanings.declined_at after setPreference("declined", "prompt")', () => {
    meaningsService.setPreference('declined', 'prompt');

    expect(meaningsService.getPreference()).toBe('declined');
    const declinedAt = mockStorage[MEANINGS_STORAGE_KEYS.DECLINED_AT];
    expect(declinedAt).toBeDefined();
    // Should be a parseable ISO date string.
    expect(() => new Date(declinedAt)).not.toThrow();
    expect(new Date(declinedAt).getTime()).not.toBeNaN();
  });

  it('4a. subscribers fire when setPreference is called', () => {
    const listener = jest.fn();
    meaningsService.subscribe(listener);
    meaningsService.setPreference('opted_in', 'settings');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('4b. unsubscribe stops further notifications', () => {
    const listener = jest.fn();
    const unsubscribe = meaningsService.subscribe(listener);

    meaningsService.setPreference('opted_in', 'settings');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    meaningsService.setPreference('declined', 'settings');
    // Still only 1 — fired before unsubscribe, not after.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('5a. calls logMeaningsPromptAnswered("yes") when source==="prompt" and pref==="opted_in"', () => {
    meaningsService.setPreference('opted_in', 'prompt');
    expect(AnalyticsService.logMeaningsPromptAnswered).toHaveBeenCalledWith('yes');
  });

  it('5b. calls logMeaningsPromptAnswered("later") when source==="prompt" and pref==="declined"', () => {
    meaningsService.setPreference('declined', 'prompt');
    expect(AnalyticsService.logMeaningsPromptAnswered).toHaveBeenCalledWith('later');
  });

  it('5c. calls logMeaningsPromptAnswered("know") when source==="prompt" and pref==="knows_meanings"', () => {
    meaningsService.setPreference('knows_meanings', 'prompt');
    expect(AnalyticsService.logMeaningsPromptAnswered).toHaveBeenCalledWith('know');
  });

  it('5d. does NOT call analytics when source is "settings"', () => {
    meaningsService.setPreference('opted_in', 'settings');
    expect(AnalyticsService.logMeaningsPromptAnswered).not.toHaveBeenCalled();
  });

  it('5e. does NOT call analytics when source is "implicit"', () => {
    meaningsService.setPreference('opted_in', 'implicit');
    expect(AnalyticsService.logMeaningsPromptAnswered).not.toHaveBeenCalled();
  });
});

// ─── 2. Daily-rotation algorithm ─────────────────────────────────────────────

describe('Daily-rotation algorithm', () => {
  it('6. two calls on the same simulated date return the same meaning id (cached)', () => {
    const first = meaningsService.getTodaysMeaning();
    const second = meaningsService.getTodaysMeaning();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBe(second!.id);
  });

  it('7. advancing to the next calendar day returns a different date stamp in storage', () => {
    const day1 = meaningsService.getTodaysMeaning();
    expect(day1).not.toBeNull();

    const dateAfterDay1 = mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE];
    expect(dateAfterDay1).toBe('2026-06-04');

    // Advance 1 day.
    jest.setSystemTime(advanceDays(BASE_DATE, 1));

    // Clear cached date/id so the service computes a fresh pick.
    delete mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE];
    delete mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_ID];

    const day2 = meaningsService.getTodaysMeaning();
    expect(day2).not.toBeNull();

    const dateAfterDay2 = mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE];
    expect(dateAfterDay2).toBe('2026-06-05');
  });

  it('8. after all items are in the seen-window the pool restarts (no error, returns a valid meaning)', () => {
    // Fill the seen-ids list with ALL meaning ids so fresh=[] on every call.
    const allIds = ALL_MEANINGS.map((m) => m.id);
    mockStorage[MEANINGS_STORAGE_KEYS.SEEN_IDS] = JSON.stringify(allIds);

    // Clear any cached daily entry to force a fresh selection.
    delete mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE];
    delete mockStorage[MEANINGS_STORAGE_KEYS.LAST_DAILY_ID];

    const result = meaningsService.getTodaysMeaning();
    expect(result).not.toBeNull();
    // Must still be one of the known meanings.
    expect(allIds).toContain(result!.id);
  });
});

// ─── 3. Prompt eligibility (shouldShowPrompt) ─────────────────────────────────

describe('Prompt eligibility (shouldShowPrompt)', () => {
  /**
   * Helper: stamp first_open_at to N days ago so the day-gate condition
   * can be exercised without calling getPreference() first.
   */
  function stampFirstOpenDaysAgo(days: number): void {
    const ts = advanceDays(BASE_DATE, -days).toISOString();
    mockStorage[MEANINGS_STORAGE_KEYS.FIRST_OPEN_AT] = ts;
  }

  it('10. returns false when no first_open_at has been recorded yet (no prior getPreference call)', () => {
    // Do NOT call getPreference() so first_open_at is never stamped.
    // shouldShowPrompt internally calls ensureFirstOpenRecorded() which
    // stamps it at "now", then checks days < 5 → false.
    const result = meaningsService.shouldShowPrompt();
    expect(result).toBe(false);
  });

  it('11. returns false when only 4 days have elapsed since first_open', () => {
    stampFirstOpenDaysAgo(4);
    expect(meaningsService.shouldShowPrompt()).toBe(false);
  });

  it('12. returns true when ≥5 days have elapsed and preference is "unset"', () => {
    stampFirstOpenDaysAgo(5);
    // preference defaults to 'unset' (empty storage).
    expect(meaningsService.shouldShowPrompt()).toBe(true);
  });

  it('13. returns false when preference is "opted_in" regardless of days', () => {
    stampFirstOpenDaysAgo(10);
    mockStorage[MEANINGS_STORAGE_KEYS.PREFERENCE] = 'opted_in';
    expect(meaningsService.shouldShowPrompt()).toBe(false);
  });

  it('14. returns false when preference is "knows_meanings" regardless of days', () => {
    stampFirstOpenDaysAgo(10);
    mockStorage[MEANINGS_STORAGE_KEYS.PREFERENCE] = 'knows_meanings';
    expect(meaningsService.shouldShowPrompt()).toBe(false);
  });

  it('15a. after declining, returns false for 29 days', () => {
    stampFirstOpenDaysAgo(10);
    mockStorage[MEANINGS_STORAGE_KEYS.PREFERENCE] = 'declined';
    // declined_at = 29 days ago → not yet eligible for re-prompt.
    const declinedAt = advanceDays(BASE_DATE, -29).toISOString();
    mockStorage[MEANINGS_STORAGE_KEYS.DECLINED_AT] = declinedAt;

    expect(meaningsService.shouldShowPrompt()).toBe(false);
  });

  it('15b. after declining, returns true on day 30+', () => {
    stampFirstOpenDaysAgo(40);
    mockStorage[MEANINGS_STORAGE_KEYS.PREFERENCE] = 'declined';
    // declined_at = exactly 30 days ago → eligible.
    const declinedAt = advanceDays(BASE_DATE, -30).toISOString();
    mockStorage[MEANINGS_STORAGE_KEYS.DECLINED_AT] = declinedAt;

    expect(meaningsService.shouldShowPrompt()).toBe(true);
  });

  it('16. returns false after markPromptShown() has been called MAX_PROMPTS_PER_USER times', () => {
    stampFirstOpenDaysAgo(10);
    // preference is 'unset' so all other conditions pass.

    for (let i = 0; i < MEANINGS_CONSTANTS.MAX_PROMPTS_PER_USER; i++) {
      meaningsService.markPromptShown();
    }

    expect(meaningsService.shouldShowPrompt()).toBe(false);
  });
});

// ─── 4. Implicit opt-in (recordScreenOpen) ───────────────────────────────────

describe('Implicit opt-in (recordScreenOpen)', () => {
  it('17. when preference is "unset", recordScreenOpen returns { didImplicitlyOptIn: true } and flips to "opted_in"', () => {
    const result = meaningsService.recordScreenOpen('garden');

    expect(result.didImplicitlyOptIn).toBe(true);
    expect(meaningsService.getPreference()).toBe('opted_in');
  });

  it('18. second call to recordScreenOpen returns { didImplicitlyOptIn: false } (idempotent)', () => {
    meaningsService.recordScreenOpen('garden');
    const second = meaningsService.recordScreenOpen('garden');

    expect(second.didImplicitlyOptIn).toBe(false);
  });

  it('19. when preference is "declined", recordScreenOpen does NOT flip to "opted_in"', () => {
    mockStorage[MEANINGS_STORAGE_KEYS.PREFERENCE] = 'declined';

    const result = meaningsService.recordScreenOpen('menu');

    expect(result.didImplicitlyOptIn).toBe(false);
    expect(meaningsService.getPreference()).toBe('declined');
  });

  it('20a. always logs meanings_screen_opened with source "garden"', () => {
    meaningsService.recordScreenOpen('garden');
    expect(AnalyticsService.logMeaningsScreenOpened).toHaveBeenCalledWith('garden');
  });

  it('20b. always logs meanings_screen_opened with source "menu"', () => {
    meaningsService.recordScreenOpen('menu');
    expect(AnalyticsService.logMeaningsScreenOpened).toHaveBeenCalledWith('menu');
  });

  it('20c. always logs meanings_screen_opened with source "direct" (default)', () => {
    meaningsService.recordScreenOpen();
    expect(AnalyticsService.logMeaningsScreenOpened).toHaveBeenCalledWith('direct');
  });
});

// ─── 5. Reset helper ─────────────────────────────────────────────────────────

describe('resetForTesting()', () => {
  it('21. clears all meanings.* keys from storage', () => {
    // Populate every known key.
    Object.values(MEANINGS_STORAGE_KEYS).forEach((k) => {
      mockStorage[k] = 'some-value';
    });
    // Also add a non-meanings key that must NOT be cleared.
    mockStorage['other.key'] = 'untouched';

    meaningsService.resetForTesting();

    Object.values(MEANINGS_STORAGE_KEYS).forEach((k) => {
      expect(StorageService.deleteValue).toHaveBeenCalledWith(k);
    });

    // Verify the in-memory map is clean for all meanings keys.
    Object.values(MEANINGS_STORAGE_KEYS).forEach((k) => {
      expect(mockStorage[k]).toBeUndefined();
    });

    // Non-meanings key is unaffected.
    expect(mockStorage['other.key']).toBe('untouched');
  });
});

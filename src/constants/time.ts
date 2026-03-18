// src/constants/time.ts
// Named time constants to replace magic numbers across the codebase.

/** One day in milliseconds (86,400,000) */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Isha fallback deadline: 4 hours after Isha if tomorrow's Fajr and midnight are unavailable */
export const ISHA_FALLBACK_DEADLINE_MS = 4 * 60 * 60 * 1000;

/** Debounce delay for notification rescheduling after settings changes */
export const SCHEDULING_DEBOUNCE_MS = 3_000;

/**
 * Capture a single timestamp at the top of time-sensitive operations.
 * Prevents drift from multiple `new Date()` calls spread across an async function.
 * Usage: `const now = captureNow();` then derive all dates from `now`.
 */
export const captureNow = (): Date => new Date();

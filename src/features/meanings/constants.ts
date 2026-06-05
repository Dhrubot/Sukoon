// Meanings of Prayer — feature-wide constants.
//
// Timing thresholds, storage keys, defaults. Lives at module root so any
// internal file can import without circular reference risk.

import type { LanguageCode } from './content/schema';

export const MEANINGS_CONSTANTS = {
  // ─── 5-day invite prompt ─────────────────────────────────────────────
  // Days of consistent app usage before the prompt is eligible to fire.
  DAYS_BEFORE_FIRST_PROMPT: 5,
  // After a "Maybe later" answer, how long until the prompt may fire again.
  DAYS_BEFORE_REPROMPT: 30,
  // Hard cap on prompts shown to a single user across the app's lifetime.
  // After this many, "Maybe later" is treated as "know" — silent forever.
  MAX_PROMPTS_PER_USER: 2,

  // ─── Daily rotation ──────────────────────────────────────────────────
  // How many days an item is excluded from "today's meaning" after being shown.
  // 14 ensures variety; once all items have been seen, the cycle restarts.
  DAILY_ROTATION_SKIP_DAYS: 14,

  // ─── Defaults ────────────────────────────────────────────────────────
  DEFAULT_LANGUAGE: 'en' as LanguageCode,
} as const;

export const MEANINGS_STORAGE_KEYS = {
  PREFERENCE: 'meanings.preference',
  DECLINED_AT: 'meanings.declined_at',
  PROMPTED_COUNT: 'meanings.prompted_count',
  FIRST_OPEN_AT: 'meanings.first_open_at',
  LAST_DAILY_ID: 'meanings.last_daily_id',
  LAST_DAILY_DATE: 'meanings.last_daily_date',
  SEEN_IDS: 'meanings.seen_ids',
} as const;

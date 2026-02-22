// ═══════════════════════════════════════════════════════════════════
// Moon Sighting Utilities
// ═══════════════════════════════════════════════════════════════════
// Detects critical Hijri calendar transition windows and manages
// the moon sighting confirmation prompt.
//
// States: 'confirmed' = permanent dismiss, 'deferred' = user said
// "not yet" and can re-trigger via the HomeScreen card.

import StorageService from '../services/StorageService';
import { getRawCachedHijriDate, HijriDate } from './ramadan';

// Hijri month numbers
const SHABAN = 8;
const RAMADAN = 9;
const SHAWWAL = 10;
const DHUL_QIDAH = 11;
const DHUL_HIJJAH = 12;

export type MoonSightingEventType = 'ramadan' | 'eid_fitr' | 'eid_adha';
type DismissState = 'confirmed' | 'deferred';

export interface MoonSightingEvent {
  type: MoonSightingEventType;
  /** Large emoji for the prompt */
  emoji: string;
  /** e.g. "The Crescent of Ramadan" */
  title: string;
  /** Body text explaining the situation */
  body: string;
  /** Label for the "Yes" primary button */
  yesLabel: string;
  /** Label for the "Not yet" secondary button */
  noLabel: string;
  /** The adjustment value if user taps "Yes" */
  yesAdjustment: -1 | 0 | 1;
  /** The adjustment value if user taps "Not yet" */
  noAdjustment: -1 | 0 | 1;
  /** The raw Hijri date (for display) */
  rawDate: HijriDate;
}

// ─── Persistence helpers ─────────────────────────────────────────

function getKey(event: MoonSightingEventType, hijriYear: number): string {
  return `moon_sighting_${event}_${hijriYear}`;
}

function getState(event: MoonSightingEventType, hijriYear: number): DismissState | null {
  const val = StorageService.getValue(getKey(event, hijriYear));
  if (val === 'confirmed' || val === 'deferred') return val;
  // Migrate legacy 'true' values from v1
  if (val === 'true') return 'confirmed';
  return null;
}

/** Permanently dismiss — user tapped "Yes" or "I follow calculations". */
export function confirmMoonSighting(event: MoonSightingEventType, hijriYear: number): void {
  StorageService.setValue(getKey(event, hijriYear), 'confirmed');
}

/** Soft defer — user tapped "Not yet". Can re-trigger via HomeScreen card. */
export function deferMoonSighting(event: MoonSightingEventType, hijriYear: number): void {
  StorageService.setValue(getKey(event, hijriYear), 'deferred');
}

// ─── Event builders ──────────────────────────────────────────────

function buildEvent(
  type: MoonSightingEventType,
  raw: HijriDate,
  isEve: boolean,
  title: string,
  yesLabel: string,
  noLabel: string,
): MoonSightingEvent {
  return {
    type,
    emoji: '🌙',
    title,
    body: `Our calculations show today as ${raw.day} ${raw.monthNameEn} ${raw.year} AH.\n\nHas the crescent been sighted in your community?`,
    yesLabel,
    noLabel,
    yesAdjustment: isEve ? 1 : 0,
    noAdjustment: isEve ? 0 : -1,
    rawDate: raw,
  };
}

/** Map of (month, day) → event builder info */
type WindowCheck = {
  type: MoonSightingEventType;
  month: number;
  day: number;
  eveMonth: number;
  title: string;
  yesLabel: string;
  noLabel: string;
};

const WINDOWS: WindowCheck[] = [
  // Ramadan
  { type: 'ramadan', month: SHABAN,    day: 29, eveMonth: SHABAN,    title: 'The Crescent of Ramadan',    yesLabel: 'Yes — Ramadan has begun!',       noLabel: 'Not yet in my area' },
  { type: 'ramadan', month: RAMADAN,   day: 1,  eveMonth: SHABAN,    title: 'The Crescent of Ramadan',    yesLabel: 'Yes — Ramadan has begun!',       noLabel: 'Not yet in my area' },
  // Eid al-Fitr
  { type: 'eid_fitr', month: RAMADAN,  day: 29, eveMonth: RAMADAN,   title: 'The Crescent of Shawwal',    yesLabel: 'Yes — Eid Mubarak!',            noLabel: 'Not yet — still Ramadan' },
  { type: 'eid_fitr', month: SHAWWAL,  day: 1,  eveMonth: RAMADAN,   title: 'The Crescent of Shawwal',    yesLabel: 'Yes — Eid Mubarak!',            noLabel: 'Not yet — still Ramadan' },
  // Eid al-Adha
  { type: 'eid_adha', month: DHUL_QIDAH, day: 29, eveMonth: DHUL_QIDAH, title: 'The Crescent of Dhul Hijjah', yesLabel: 'Yes — Dhul Hijjah has begun!', noLabel: 'Not yet in my area' },
  { type: 'eid_adha', month: DHUL_HIJJAH, day: 1, eveMonth: DHUL_QIDAH, title: 'The Crescent of Dhul Hijjah', yesLabel: 'Yes — Dhul Hijjah has begun!', noLabel: 'Not yet in my area' },
];

// ─── Public API ──────────────────────────────────────────────────

/**
 * Detect if we're in a critical moon sighting window and the prompt
 * should be shown. Returns event info or null.
 *
 * @param maghribTime - Today's Maghrib time. On "eve" dates (29th),
 *   the prompt is only shown after Maghrib (when the moon is actually sought).
 *   On "day of" dates (1st), shown anytime.
 */
export function getMoonSightingEvent(maghribTime?: Date): MoonSightingEvent | null {
  const raw = getRawCachedHijriDate();
  if (!raw) return null;

  const { month, day, year } = raw;

  for (const w of WINDOWS) {
    if (month !== w.month || day !== w.day) continue;

    // Already handled (confirmed or deferred) → skip auto-popup
    const state = getState(w.type, year);
    if (state === 'confirmed' || state === 'deferred') return null;

    const isEve = month === w.eveMonth && day === 29;

    // On eve dates, only show after Maghrib (moon sighting happens after sunset)
    if (isEve && maghribTime) {
      const now = new Date();
      if (now < maghribTime) return null;
    }

    return buildEvent(w.type, raw, isEve, w.title, w.yesLabel, w.noLabel);
  }

  return null;
}

// ─── Expanded Nudge (days 1–3 of critical months) ────────────

export interface HijriNudgeEvent {
  /** The event type this nudge relates to */
  type: MoonSightingEventType;
  /** Current computed hijri date (with any existing adjustment) */
  currentDay: number;
  currentMonth: string;
  currentYear: number;
  /** Hijri month number */
  monthNumber: number;
}

/**
 * Check if we should show a persistent "Is today X?" nudge card.
 * Returns an event during days 1–3 of Ramadan, Shawwal, Dhul Hijjah
 * ONLY if the user has NOT confirmed the moon sighting for this transition.
 *
 * This is different from getMoonSightingEvent() which shows a modal popup.
 * The nudge is a non-intrusive card that persists for 3 days.
 */
export function getHijriNudgeEvent(): HijriNudgeEvent | null {
  const raw = getRawCachedHijriDate();
  if (!raw) return null;

  const { month, day, year } = raw;

  // Only nudge during the first 3 days of critical months
  if (day < 1 || day > 3) return null;

  const NUDGE_MAP: Array<{ month: number; type: MoonSightingEventType }> = [
    { month: RAMADAN,    type: 'ramadan' },
    { month: SHAWWAL,    type: 'eid_fitr' },
    { month: DHUL_HIJJAH, type: 'eid_adha' },
  ];

  for (const nm of NUDGE_MAP) {
    if (month !== nm.month) continue;

    // If user already confirmed for this transition, no nudge needed
    const state = getState(nm.type, year);
    if (state === 'confirmed') return null;

    return {
      type: nm.type,
      currentDay: day,
      currentMonth: raw.monthNameEn,
      currentYear: year,
      monthNumber: month,
    };
  }

  return null;
}

/**
 * Get a deferred moon sighting event (user previously said "Not yet").
 * Used to show the re-trigger card on HomeScreen.
 */
export function getDeferredMoonSightingEvent(): MoonSightingEvent | null {
  const raw = getRawCachedHijriDate();
  if (!raw) return null;

  const { month, day, year } = raw;

  for (const w of WINDOWS) {
    if (month !== w.month || day !== w.day) continue;
    if (getState(w.type, year) !== 'deferred') return null;

    const isEve = month === w.eveMonth && day === 29;
    return buildEvent(w.type, raw, isEve, w.title, w.yesLabel, w.noLabel);
  }

  return null;
}

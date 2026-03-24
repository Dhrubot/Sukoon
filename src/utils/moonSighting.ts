// ═══════════════════════════════════════════════════════════════════
// Moon Sighting Utilities
// ═══════════════════════════════════════════════════════════════════
// Detects critical Hijri calendar transition windows and manages
// the moon sighting confirmation prompt.
//
// States: 'confirmed' = permanent dismiss, 'deferred' = user said
// "not yet" and can re-trigger via the HomeScreen card.

import StorageService from '../services/StorageService';
import { getCachedHijriDate, getCurrentHijriAdjustment, HijriDate } from './ramadan';

// Hijri month numbers
const SHABAN = 8;
const RAMADAN = 9;
const SHAWWAL = 10;
const DHUL_QIDAH = 11;
const DHUL_HIJJAH = 12;

export type MoonSightingEventType = 'ramadan' | 'eid_fitr' | 'eid_adha';
type DismissState = 'confirmed' | 'deferred';
type CriticalMonthType = MoonSightingEventType;

export interface AutoDeduceEvent {
  /** The event that was auto-deduced */
  type: MoonSightingEventType;
  /** Celebratory message to show (informational, not a question) */
  title: string;
  body: string;
  emoji: string;
}

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

function getDateConfirmationKey(event: CriticalMonthType, hijriYear: number): string {
  return `hijri_date_confirmed_${event}_${hijriYear}`;
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

export function acknowledgeHijriDate(event: CriticalMonthType, hijriYear: number): void {
  StorageService.setValue(getDateConfirmationKey(event, hijriYear), 'true');
}

export function hasAcknowledgedHijriDate(event: CriticalMonthType, hijriYear: number): boolean {
  return StorageService.getValue(getDateConfirmationKey(event, hijriYear)) === 'true';
}

function clampAdjustment(value: number): -1 | 0 | 1 {
  if (value < -1) return -1;
  if (value > 1) return 1;
  return value as -1 | 0 | 1;
}

// ─── Event builders ──────────────────────────────────────────────

function buildEvent(
  type: MoonSightingEventType,
  currentDate: HijriDate,
  isEve: boolean,
  title: string,
  yesLabel: string,
  noLabel: string,
  currentAdjustment: -1 | 0 | 1,
): MoonSightingEvent {
  return {
    type,
    emoji: '🌙',
    title,
    body: `Our calculations show today as ${currentDate.day} ${currentDate.monthNameEn} ${currentDate.year} AH.\n\nHas the crescent been sighted in your community?`,
    yesLabel,
    noLabel,
    yesAdjustment: isEve
      ? clampAdjustment(currentAdjustment + 1)
      : currentAdjustment,
    noAdjustment: isEve
      ? currentAdjustment
      : clampAdjustment(currentAdjustment - 1),
    rawDate: currentDate,
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

/**
 * Detect if today is the 30th of a month that precedes a critical month,
 * meaning tomorrow MUST be the 1st of the next month (Hijri months can't
 * exceed 30 days). Returns celebratory event info for display.
 *
 * Covers:
 *  - Ramadan 30 → tomorrow is Eid al-Fitr (1 Shawwal)
 *  - Dhul Qi'dah 30 → tomorrow is Dhul Hijjah 1
 */
export function getAutoDeduceEndOfMonthEvent(): AutoDeduceEvent | null {
  // Use the ADJUSTED date so we respect the user's hijriAdjustment setting.
  // If user has adjustment=-1, raw day 30 means their actual day is 29 → not safe to auto-deduce.
  const adjusted = getCachedHijriDate();
  if (!adjusted) return null;

  const { month, day, year } = adjusted;
  if (day !== 30) return null;

  // Ramadan 30 → tomorrow MUST be 1 Shawwal (Eid al-Fitr)
  if (month === RAMADAN) {
    const state = getState('eid_fitr', year);
    if (state === 'confirmed') return null;
    // Auto-confirm since it's certain
    confirmMoonSighting('eid_fitr', year);
    return {
      type: 'eid_fitr',
      title: 'Tomorrow is Eid al-Fitr!',
      body: 'Ramadan has been 30 days this year. May Allah accept your fasting and worship.',
      emoji: '🌙',
    };
  }

  // Dhul Qi'dah 30 → tomorrow MUST be Dhul Hijjah 1
  if (month === DHUL_QIDAH) {
    const state = getState('eid_adha', year);
    if (state === 'confirmed') return null;
    confirmMoonSighting('eid_adha', year);
    return {
      type: 'eid_adha',
      title: 'Dhul Hijjah Begins Tomorrow!',
      body: 'The blessed days of Dhul Hijjah are upon us. May Allah accept your worship.',
      emoji: '🕋',
    };
  }

  return null;
}

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
  const currentDate = getCachedHijriDate();
  if (!currentDate) return null;

  const { month, day, year } = currentDate;
  const currentAdjustment = getCurrentHijriAdjustment();

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

    return buildEvent(
      w.type,
      currentDate,
      isEve,
      w.title,
      w.yesLabel,
      w.noLabel,
      currentAdjustment,
    );
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
 * Check if we should show a "Is today X?" nudge sheet.
 *
 * For **fresh installs** (no prior moon sighting state): triggers on ANY day
 * of a critical month, because the Aladhan API returns a calculated Hijri date
 * that can be ±1 day off from the user's regional moon sighting. Mid-month
 * installers need the same chance to correct.
 *
 * For **returning users** who previously deferred: triggers on days 1–3 only.
 *
 * Never triggers if the user already confirmed for this transition.
 *
 * This is different from getMoonSightingEvent() which shows a prompt sheet.
 * The nudge is a non-intrusive bottom sheet shown once per session.
 */
export function getHijriNudgeEvent(): HijriNudgeEvent | null {
  const currentDate = getCachedHijriDate();
  if (!currentDate) return null;

  const { month, day, year } = currentDate;

  const NUDGE_MAP: Array<{ month: number; type: MoonSightingEventType }> = [
    { month: RAMADAN,    type: 'ramadan' },
    { month: SHAWWAL,    type: 'eid_fitr' },
    { month: DHUL_HIJJAH, type: 'eid_adha' },
  ];

  for (const nm of NUDGE_MAP) {
    if (month !== nm.month) continue;

    if (hasAcknowledgedHijriDate(nm.type, year)) return null;

    const state = getState(nm.type, year);

    // Already confirmed → no nudge
    if (state === 'confirmed') return null;

    if (month === SHAWWAL && day > 3) return null;

    return {
      type: nm.type,
      currentDay: day,
      currentMonth: currentDate.monthNameEn,
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
  const currentDate = getCachedHijriDate();
  if (!currentDate) return null;

  const { month, day, year } = currentDate;
  const currentAdjustment = getCurrentHijriAdjustment();

  for (const w of WINDOWS) {
    if (month !== w.month || day !== w.day) continue;
    if (getState(w.type, year) !== 'deferred') return null;

    const isEve = month === w.eveMonth && day === 29;
    return buildEvent(
      w.type,
      currentDate,
      isEve,
      w.title,
      w.yesLabel,
      w.noLabel,
      currentAdjustment,
    );
  }

  return null;
}

export function finalizeHijriDateConfirmation(
  nudge: HijriNudgeEvent,
  adjustment: -1 | 0 | 1,
): void {
  acknowledgeHijriDate(nudge.type, nudge.currentYear);

  if (nudge.monthNumber === RAMADAN && nudge.currentDay === 1) {
    if (adjustment === 0) confirmMoonSighting('ramadan', nudge.currentYear);
    if (adjustment === -1) deferMoonSighting('ramadan', nudge.currentYear);
    return;
  }

  if (nudge.monthNumber === RAMADAN && nudge.currentDay === 29) {
    if (adjustment === 1) confirmMoonSighting('eid_fitr', nudge.currentYear);
    return;
  }

  if (nudge.monthNumber === SHAWWAL && nudge.currentDay === 1) {
    if (adjustment === 0) confirmMoonSighting('eid_fitr', nudge.currentYear);
    if (adjustment === -1) deferMoonSighting('eid_fitr', nudge.currentYear);
    return;
  }

  if (nudge.monthNumber === DHUL_HIJJAH && nudge.currentDay === 1) {
    if (adjustment === 0) confirmMoonSighting('eid_adha', nudge.currentYear);
    if (adjustment === -1) deferMoonSighting('eid_adha', nudge.currentYear);
  }
}

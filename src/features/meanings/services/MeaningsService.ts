// MeaningsService — the only stateful surface in the Meanings module.
//
// Public API consumed via hooks (Phase 4) and screens (Phase 3).
// External code should NOT import this directly — go through the module's
// public index.ts so internals can refactor without breaking callers.
//
// In Phase 1 this is a skeleton: content getters are wired, but preference,
// daily rotation, and prompt eligibility are TODOs implemented in Phase 4.

import type {
  LanguageCode,
  Meaning,
  MeaningsPreference,
  PrayerPosition,
  PreferenceChangeSource,
} from '../content/schema';
import { ALL_MEANINGS } from '../content';
import { MEANINGS_CONSTANTS } from '../constants';

class MeaningsService {
  // ─── Content getters ─────────────────────────────────────────────────

  getAll(): Meaning[] {
    return ALL_MEANINGS;
  }

  getById(id: string): Meaning | null {
    return ALL_MEANINGS.find((m) => m.id === id) ?? null;
  }

  getByPosition(position: PrayerPosition): Meaning[] {
    return ALL_MEANINGS.filter((m) => m.position === position);
  }

  // ─── Daily rotation ──────────────────────────────────────────────────

  /**
   * Returns today's meaning. Deterministic per calendar day so the same
   * card shows across launches; rotates daily, skipping recently-seen ids.
   *
   * Phase 1: returns the first item or null. Real algorithm lands in Phase 4.
   */
  getTodaysMeaning(
    _language: LanguageCode = MEANINGS_CONSTANTS.DEFAULT_LANGUAGE,
  ): Meaning | null {
    // TODO Phase 4: deterministic daily selection + 14-day skip window.
    return ALL_MEANINGS[0] ?? null;
  }

  // ─── Preference state machine ────────────────────────────────────────

  /**
   * Current preference for daily-card surfacing.
   * 'unset' (the default) means the user has neither been prompted nor
   * organically opened the Meanings screen yet.
   */
  getPreference(): MeaningsPreference {
    // TODO Phase 4: read from StorageService.
    return 'unset';
  }

  setPreference(_pref: MeaningsPreference, _source: PreferenceChangeSource): void {
    // TODO Phase 4: persist + record declined_at + telemetry.
  }

  // ─── 5-day invite prompt ─────────────────────────────────────────────

  shouldShowPrompt(): boolean {
    // TODO Phase 4: gate on first_open_at + 5 days + preference == 'unset'
    //               OR (preference == 'declined' && declined_at + 30 days)
    //               AND prompted_count < MAX_PROMPTS_PER_USER.
    return false;
  }

  markPromptShown(): void {
    // TODO Phase 4: increment prompted_count.
  }

  markPromptDismissed(): void {
    // TODO Phase 4: treat as 'later' answer.
  }

  // ─── Implicit opt-in ─────────────────────────────────────────────────

  /**
   * Called when the Meanings screen mounts. If preference is 'unset',
   * flip it to 'opted_in' so the daily card starts surfacing. A one-time
   * toast on the screen surface explains.
   */
  recordScreenOpen(): void {
    // TODO Phase 4: flip 'unset' → 'opted_in' with source='implicit'.
  }

  hasImplicitlyOptedIn(): boolean {
    // TODO Phase 4: derive from preference history.
    return false;
  }

  // ─── Audio resolution ────────────────────────────────────────────────

  /**
   * Returns the require()'d module ref for a meaning's bundled audio clip,
   * or null if the asset is not yet available (Phase 6 wires real assets).
   */
  resolveAudioAsset(id: string): number | null {
    const m = this.getById(id);
    return m?.audioAsset ?? null;
  }
}

const meaningsService = new MeaningsService();
export default meaningsService;

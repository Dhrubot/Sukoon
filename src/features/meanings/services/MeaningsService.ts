// MeaningsService — the only stateful surface in the Meanings module.
//
// Public API consumed via hooks and screens. External code should NOT
// import this directly — go through the module's public index.ts.
//
// Storage: uses StorageService (encrypted MMKV) under the `meanings.*`
// key namespace. Preferences are personal worship state, so they live
// in the encrypted store rather than the public/high-frequency one.

import AnalyticsService from '../../../services/AnalyticsService';
import StorageService from '../../../services/StorageService';
import type {
  LanguageCode,
  Meaning,
  MeaningsPreference,
  PrayerPosition,
  PreferenceChangeSource,
} from '../content/schema';
import { ALL_MEANINGS } from '../content';
import { MEANINGS_CONSTANTS, MEANINGS_STORAGE_KEYS } from '../constants';

type Listener = () => void;

class MeaningsService {
  // Simple observer pattern so hooks can re-render on preference changes
  // without forcing a global state store.
  private listeners = new Set<Listener>();

  // ─── Subscriptions ────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ─── Content getters ──────────────────────────────────────────────────

  getAll(): Meaning[] {
    return ALL_MEANINGS;
  }

  getById(id: string): Meaning | null {
    return ALL_MEANINGS.find((m) => m.id === id) ?? null;
  }

  getByPosition(position: PrayerPosition): Meaning[] {
    return ALL_MEANINGS.filter((m) => m.position === position);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Idempotent — stamps the user's first-feature-aware moment so prompt
   * eligibility can count days. Called lazily by anything that reads or
   * writes preference state.
   */
  private ensureFirstOpenRecorded(): void {
    if (!StorageService.getValue(MEANINGS_STORAGE_KEYS.FIRST_OPEN_AT)) {
      StorageService.setValue(
        MEANINGS_STORAGE_KEYS.FIRST_OPEN_AT,
        new Date().toISOString(),
      );
    }
  }

  // ─── Daily rotation ───────────────────────────────────────────────────

  /**
   * Returns today's meaning. Deterministic per calendar day:
   *   - same date → same id across multiple opens (cached)
   *   - new date → fresh selection from a pool excluding recently-seen ids
   *   - if every item has been seen within the skip window, restart the cycle
   *
   * The seen-id window length is `DAILY_ROTATION_SKIP_DAYS` (14).
   */
  getTodaysMeaning(
    _language: LanguageCode = MEANINGS_CONSTANTS.DEFAULT_LANGUAGE,
  ): Meaning | null {
    const today = this.formatDate(new Date());
    const cachedDate = StorageService.getValue(MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE);

    if (cachedDate === today) {
      const cachedId = StorageService.getValue(MEANINGS_STORAGE_KEYS.LAST_DAILY_ID);
      if (cachedId) {
        const m = this.getById(cachedId);
        if (m) return m;
      }
    }

    const all = this.getAll();
    if (!all.length) return null;

    const seenIds = this.getSeenIds();
    const fresh = all.filter((m) => !seenIds.includes(m.id));
    const pool = fresh.length ? fresh : all;

    // Deterministic hash → same date always picks the same pool index.
    // Math.random() / Date.now() are avoided so cached results across the
    // day match the live computation, and so tests can mock Date.
    const hash = this.simpleHash(today);
    const chosen = pool[hash % pool.length];

    StorageService.setValue(MEANINGS_STORAGE_KEYS.LAST_DAILY_DATE, today);
    StorageService.setValue(MEANINGS_STORAGE_KEYS.LAST_DAILY_ID, chosen.id);
    const newSeen = [chosen.id, ...seenIds].slice(
      0,
      MEANINGS_CONSTANTS.DAILY_ROTATION_SKIP_DAYS,
    );
    StorageService.setValue(MEANINGS_STORAGE_KEYS.SEEN_IDS, JSON.stringify(newSeen));

    return chosen;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private getSeenIds(): string[] {
    const raw = StorageService.getValue(MEANINGS_STORAGE_KEYS.SEEN_IDS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  // ─── Preference state machine ────────────────────────────────────────

  getPreference(): MeaningsPreference {
    this.ensureFirstOpenRecorded();
    const v = StorageService.getValue(MEANINGS_STORAGE_KEYS.PREFERENCE);
    if (v === 'opted_in' || v === 'declined' || v === 'knows_meanings') {
      return v;
    }
    return 'unset';
  }

  setPreference(pref: MeaningsPreference, source: PreferenceChangeSource): void {
    StorageService.setValue(MEANINGS_STORAGE_KEYS.PREFERENCE, pref);
    if (pref === 'declined') {
      StorageService.setValue(
        MEANINGS_STORAGE_KEYS.DECLINED_AT,
        new Date().toISOString(),
      );
    }
    if (source === 'prompt') {
      const choiceMap: Record<string, 'yes' | 'later' | 'know'> = {
        opted_in: 'yes',
        declined: 'later',
        knows_meanings: 'know',
      };
      const choice = choiceMap[pref];
      if (choice) {
        void AnalyticsService.logMeaningsPromptAnswered(choice);
      }
    }
    this.notify();
  }

  // ─── 5-day invite prompt ─────────────────────────────────────────────

  /**
   * True iff:
   *   - prompted_count < MAX_PROMPTS_PER_USER, AND
   *   - first_open was at least DAYS_BEFORE_FIRST_PROMPT (5) ago, AND
   *   - preference is 'unset' OR
   *     (preference is 'declined' AND declined_at + DAYS_BEFORE_REPROMPT (30) ago)
   *
   * 'opted_in' and 'knows_meanings' never see the prompt again.
   */
  shouldShowPrompt(): boolean {
    this.ensureFirstOpenRecorded();

    if (this.getPromptedCount() >= MEANINGS_CONSTANTS.MAX_PROMPTS_PER_USER) {
      return false;
    }

    const pref = this.getPreference();
    if (pref === 'opted_in' || pref === 'knows_meanings') return false;

    const firstOpen = StorageService.getValue(MEANINGS_STORAGE_KEYS.FIRST_OPEN_AT);
    if (!firstOpen) return false;
    const days = this.daysBetween(new Date(firstOpen), new Date());
    if (days < MEANINGS_CONSTANTS.DAYS_BEFORE_FIRST_PROMPT) return false;

    if (pref === 'unset') return true;

    // pref === 'declined' — re-prompt after the cooldown.
    const declinedAt = StorageService.getValue(MEANINGS_STORAGE_KEYS.DECLINED_AT);
    if (!declinedAt) return true;
    const declinedDays = this.daysBetween(new Date(declinedAt), new Date());
    return declinedDays >= MEANINGS_CONSTANTS.DAYS_BEFORE_REPROMPT;
  }

  markPromptShown(): void {
    const count = this.getPromptedCount();
    StorageService.setValue(
      MEANINGS_STORAGE_KEYS.PROMPTED_COUNT,
      String(count + 1),
    );
  }

  /**
   * User dismissed without choosing. Treated as "Maybe later" — same as
   * choosing the second option explicitly.
   */
  markPromptDismissed(): void {
    this.markPromptShown();
    this.setPreference('declined', 'prompt');
  }

  private getPromptedCount(): number {
    const raw = StorageService.getValue(MEANINGS_STORAGE_KEYS.PROMPTED_COUNT);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : n;
  }

  private daysBetween(earlier: Date, later: Date): number {
    const ms = later.getTime() - earlier.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // ─── Implicit opt-in ─────────────────────────────────────────────────

  /**
   * Called when the Meanings or MeaningDetail screen mounts. The `source`
   * attributes the open for analytics. If preference is 'unset', flips
   * to 'opted_in' so the daily card starts surfacing in Reflection Garden.
   * Returns a signal the caller can use to show a one-time toast.
   */
  recordScreenOpen(
    source: 'garden' | 'menu' | 'direct' = 'direct',
  ): { didImplicitlyOptIn: boolean } {
    void AnalyticsService.logMeaningsScreenOpened(source);
    this.ensureFirstOpenRecorded();
    const pref = this.getPreference();
    if (pref === 'unset') {
      this.setPreference('opted_in', 'implicit');
      return { didImplicitlyOptIn: true };
    }
    return { didImplicitlyOptIn: false };
  }

  hasImplicitlyOptedIn(): boolean {
    return this.getPreference() === 'opted_in';
  }

  // ─── Audio resolution ────────────────────────────────────────────────

  resolveAudioAsset(id: string): number | null {
    const m = this.getById(id);
    return m?.audioAsset ?? null;
  }

  // ─── Test/debug helpers ──────────────────────────────────────────────

  /**
   * Clears all meanings-related storage. Intended for tests and the
   * Debug screen — not exposed in production UI.
   */
  resetForTesting(): void {
    Object.values(MEANINGS_STORAGE_KEYS).forEach((k) => StorageService.deleteValue(k));
    this.notify();
  }
}

const meaningsService = new MeaningsService();
export default meaningsService;

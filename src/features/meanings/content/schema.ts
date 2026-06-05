// Meanings of Prayer — content schema.
//
// All types for the feature live here. External consumers should import
// from '../../../features/meanings' (the public surface), not from this file
// directly, so the schema can evolve without breaking callers.

export type LanguageCode = 'en' | 'bn' | 'ur' | 'id' | 'tr';

export type PrayerPosition =
  | 'opening'          // istiftah, ta'awwudh, bismillah
  | 'standing'         // Fatihah, surah after Fatihah
  | 'transition'       // takbir between positions
  | 'ruku'
  | 'rising'           // sami'allahu liman hamidah / rabbana wa lakal hamd
  | 'sujood'
  | 'between_sajdahs'  // rabbi-ghfir-li
  | 'sitting'          // tashahhud, salawat, closing du'a
  | 'taslim';

export interface MeaningTranslation {
  // Full phrase translation (Saheeh International for EN unless noted).
  translation: string;
  // 2–3 sentences of contemplative insight, written original.
  // Invitation tone — never grading, never implying the reader is deficient.
  reflection: string;
}

export interface WordByWordEntry {
  // 1-indexed position of the word within the phrase, left-to-right
  // in the original Arabic ordering (i.e. the order spoken).
  position: number;
  arabic: string;
  transliteration: string;
  // Three-letter (or longer) Arabic root in space-separated form, e.g. "ر ح م".
  root?: string;
  // Plain-English meaning of the root concept, e.g. "mercy, womb".
  rootMeaning?: string;
  // Contextual meaning of this specific word in this phrase.
  meaning: string;
  // Optional grammatical or rhetorical insight.
  note?: string;
}

export interface MeaningSource {
  arabic: 'mushaf' | 'hadith';
  // Where the Arabic text was sourced (Quran reference, hadith collection, etc.).
  arabicReference?: string;
  // Citation for the translation, e.g. "Saheeh International, 2010".
  translation: string;
}

export interface Meaning {
  // Stable identifier, kebab-case. Used for storage, routing, audio resolution.
  id: string;
  position: PrayerPosition;
  // Canonical ordering for browse view (low number first).
  // Recitations and surahs share one number line so a sorted list reads
  // in salah order.
  order: number;
  // Human-readable label, e.g. "Al-Fatihah", "Tasbih in Ruku".
  title: string;
  arabic: string;
  // Romanised transliteration (Saheeh International style for consistency).
  transliteration: string;
  // require()'d ref to bundled .m4a. Null until audio is added in Phase 6.
  audioAsset: number | null;
  // Recommended repetitions (e.g. 3 for tasbihat). Omitted when not applicable.
  recommendedReps?: number;
  // Per-language translation + reflection. EN required for v1.1.
  translations: Partial<Record<LanguageCode, MeaningTranslation>>;
  // Word-by-word data only present for high-leverage items (Fatihah in v1.1).
  wordByWord?: WordByWordEntry[];
  source: MeaningSource;
}

// ─── Preference state machine ────────────────────────────────────────────

export type MeaningsPreference =
  | 'unset'           // never prompted, never opened the screen
  | 'opted_in'        // daily card surfaces in Reflection Garden
  | 'declined'        // "Maybe later" — re-prompt eligible after 30 days
  | 'knows_meanings'; // permanent silent state, never re-prompt

export type PromptAnswer = 'yes' | 'later' | 'know';

export type PreferenceChangeSource = 'prompt' | 'settings' | 'implicit';

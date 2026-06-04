// Meanings of Prayer — public module surface.
//
// All external consumers (Reflection Garden, Settings, Menu row, etc.) MUST
// import only from this file. Internal files (services/, components/, etc.)
// can refactor freely without breaking callers as long as this surface holds.
//
// Decoupling test: moving the daily card from Reflection Garden to Menu row
// later should require changes only in the consumer file, not here.

// ─── Types ────────────────────────────────────────────────────────────
export type {
  Meaning,
  MeaningTranslation,
  MeaningSource,
  WordByWordEntry,
  PrayerPosition,
  LanguageCode,
  MeaningsPreference,
  PromptAnswer,
  PreferenceChangeSource,
} from './content/schema';

// ─── Service ──────────────────────────────────────────────────────────
export { default as MeaningsService } from './services/MeaningsService';

// ─── Constants ────────────────────────────────────────────────────────
export { MEANINGS_CONSTANTS } from './constants';

// ─── Components ───────────────────────────────────────────────────────
export { MeaningCard, WordByWord } from './components';
export type { MeaningCardProps, MeaningCardVariant, WordByWordProps } from './components';

// ─── Hooks ────────────────────────────────────────────────────────────
export { useMeaningsPreference, useDailyMeaning } from './hooks';
export type { UseMeaningsPreferenceResult } from './hooks';

// ─── Screens ──────────────────────────────────────────────────────────
export { MeaningsScreen, MeaningDetailScreen } from './screens';

// ─── Wired in later phases ────────────────────────────────────────────
// Phase 4 (preference + 5-day invite):
//   export { MeaningInvitePrompt } from './components';
//   export { useMeaningPromptEligibility } from './hooks';

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

// ─── Wired in later phases ────────────────────────────────────────────
// Phase 3 (screens):
//   export { MeaningsScreen, MeaningDetailScreen } from './screens';
// Phase 4 (hooks + components):
//   export { useMeaningsPreference, useDailyMeaning, useMeaningPromptEligibility } from './hooks';
//   export { MeaningCard, MeaningInvitePrompt, WordByWord } from './components';

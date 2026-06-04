// Aggregated content surface.
//
// All Meaning instances flow through ALL_MEANINGS so the service has one
// canonical list. Pure data — no service or storage imports here.
//
// The aggregator also attaches word-by-word data (currently Fatihah only)
// to its parent Meaning, keeping the source files clean and decoupled.

import type { Meaning } from './schema';
import { PRAYER_RECITATIONS } from './recitations';
import { SHORT_SURAHS } from './shortSurahs';
import { FATIHAH_WORD_BY_WORD } from './wordByWord/fatihah';

export * from './schema';
export { PRAYER_RECITATIONS } from './recitations';
export { SHORT_SURAHS } from './shortSurahs';
export { FATIHAH_WORD_BY_WORD } from './wordByWord/fatihah';

// Attach word-by-word data to its parent meaning before publishing the list.
// New word-by-word datasets join here without recitations.ts ever importing
// from the wordByWord/ subdirectory.
const ENRICHED_RECITATIONS: Meaning[] = PRAYER_RECITATIONS.map((m) =>
  m.id === 'fatihah' ? { ...m, wordByWord: FATIHAH_WORD_BY_WORD } : m,
);

// Sorted by canonical salah order — orders 1–3 (opening + Fatihah),
// 4–13 (short surahs after Fatihah), 14–23 (transition through taslim).
export const ALL_MEANINGS: Meaning[] = [...ENRICHED_RECITATIONS, ...SHORT_SURAHS].sort(
  (a, b) => a.order - b.order,
);

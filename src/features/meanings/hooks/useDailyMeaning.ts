// useDailyMeaning — returns the meaning surfaced for today.
//
// Deterministic per calendar day. Same id across multiple opens on the same
// day; rotates tomorrow. The real selection algorithm lands in Phase 4 inside
// MeaningsService.getTodaysMeaning(); this hook is just the React-facing shim.

import { useMemo } from 'react';
import MeaningsService from '../services/MeaningsService';
import { MEANINGS_CONSTANTS } from '../constants';
import type { LanguageCode, Meaning } from '../content/schema';

export const useDailyMeaning = (
  language: LanguageCode = MEANINGS_CONSTANTS.DEFAULT_LANGUAGE,
): Meaning | null => {
  return useMemo(() => MeaningsService.getTodaysMeaning(language), [language]);
};

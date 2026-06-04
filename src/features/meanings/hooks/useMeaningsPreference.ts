// useMeaningsPreference — reactive preference state.
//
// Subscribes to MeaningsService notifications so any UI consuming this
// hook re-renders when preference changes from anywhere (the 5-day prompt,
// the daily-card "⋯" menu, Settings, the implicit opt-in on first screen
// open). One subscription per component instance, cleaned up on unmount.

import { useCallback, useEffect, useState } from 'react';
import MeaningsService from '../services/MeaningsService';
import type { MeaningsPreference, PreferenceChangeSource } from '../content/schema';

export interface UseMeaningsPreferenceResult {
  preference: MeaningsPreference;
  setPreference: (pref: MeaningsPreference, source: PreferenceChangeSource) => void;
}

export const useMeaningsPreference = (): UseMeaningsPreferenceResult => {
  const [preference, setLocal] = useState<MeaningsPreference>(() =>
    MeaningsService.getPreference(),
  );

  useEffect(() => {
    const unsubscribe = MeaningsService.subscribe(() => {
      setLocal(MeaningsService.getPreference());
    });
    // Re-read on mount in case service state changed between render and effect.
    setLocal(MeaningsService.getPreference());
    return unsubscribe;
  }, []);

  const setPreference = useCallback(
    (pref: MeaningsPreference, source: PreferenceChangeSource) => {
      MeaningsService.setPreference(pref, source);
    },
    [],
  );

  return { preference, setPreference };
};

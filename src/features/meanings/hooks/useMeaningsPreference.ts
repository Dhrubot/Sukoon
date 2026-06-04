// useMeaningsPreference — reads/writes the meanings preference state.
//
// In Phase 3 this is a thin wrapper around MeaningsService.getPreference()
// which currently returns a stubbed 'unset'. Phase 4 wires real persistence.

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

  // Re-sync on mount in case another surface updated preference while this
  // hook was unmounted. Phase 4 will replace this with a proper subscription.
  useEffect(() => {
    setLocal(MeaningsService.getPreference());
  }, []);

  const setPreference = useCallback(
    (pref: MeaningsPreference, source: PreferenceChangeSource) => {
      MeaningsService.setPreference(pref, source);
      setLocal(pref);
    },
    [],
  );

  return { preference, setPreference };
};

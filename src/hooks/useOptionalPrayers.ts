// src/hooks/useOptionalPrayers.ts
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { usePrayerTimes } from '../providers/PrayerTimesProvider';
import { getAvailablePrayers, PrayerDefinition } from '../constants/prayerRegistry';
import { isRamadan, isFriday, isEidDay } from '../utils/ramadan';
import { OptionalPrayerTime } from '../types';

/**
 * Computes currently-relevant optional prayers (Taraweeh, Tahajjud, Jumah).
 *
 * Time-gating rules:
 * - Taraweeh: visible all day during Ramadan (time = Isha + 30 min)
 * - Tahajjud: visible all day when tahajjudReminders enabled (time = Midnight from API)
 * - Jumah: visible on Friday (replaces Dhuhr time) — elevated to first-class, returned separately
 */
export const useOptionalPrayers = (): OptionalPrayerTime[] => {
  const { todayPrayerTimes } = usePrayerTimes();
  const { todayMidnight, userSettings } = useStore();
  const tahajjudEnabled = userSettings?.tahajjudReminders?.enabled ?? false;

  return useMemo(() => {
    if (todayPrayerTimes.length === 0) return [];

    const available = getAvailablePrayers({
      isRamadan: isRamadan(),
      isFriday: isFriday(),
      isEid: isEidDay(),
      includeSunnah: true,
    });

    // Only optional prayers (not fard, not Jumah — Jumah is handled by the hero)
    const optionalDefs = available.filter(p => p.category !== 'fard' && p.key !== 'jumah');
    if (optionalDefs.length === 0) return [];

    const results: OptionalPrayerTime[] = [];

    for (const def of optionalDefs) {
      const time = computeTime(def, todayPrayerTimes, todayMidnight);
      if (!time) continue;

      // Tahajjud: only show when user has enabled Tahajjud reminders
      if (def.key === 'tahajjud' && !tahajjudEnabled) continue;

      results.push({
        name: def.name as OptionalPrayerTime['name'],
        displayName: def.name,
        arabic: def.arabic,
        icon: def.icon,
        time,
        category: def.category as OptionalPrayerTime['category'],
      });
    }

    return results.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [todayPrayerTimes, todayMidnight, tahajjudEnabled]);
};

function computeTime(
  def: PrayerDefinition,
  todayPrayerTimes: { name: string; time: Date }[],
  midnight: Date | null,
): Date | null {
  const { timeSource } = def;

  if (timeSource.type === 'api') {
    // Tahajjud uses Midnight from API
    if (timeSource.apiField === 'Midnight') {
      return midnight ?? null;
    }
    // Other API-based optional prayers (e.g. Jumah uses Dhuhr)
    const match = todayPrayerTimes.find(p => p.name === timeSource.apiField);
    return match?.time ?? null;
  }

  if (timeSource.type === 'relative' && timeSource.relativeTo && timeSource.offsetMinutes != null) {
    const base = todayPrayerTimes.find(p => p.name === timeSource.relativeTo);
    if (!base) return null;
    return new Date(base.time.getTime() + timeSource.offsetMinutes * 60000);
  }

  return null;
}

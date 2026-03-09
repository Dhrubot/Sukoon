// src/providers/PrayerTimesProvider.tsx

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStateChange } from '../hooks/useAppStateChange';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import PrayerTimeService from '../services/PrayerTimeService';
import { PrayerTime, PrayerName, PrayerTimes, Location } from '../types';
import { isValidCoordinates } from '../utils/locationValidation';
import logger from '../utils/logger';
import WidgetService from '../services/WidgetService';
import LiveActivityService from '../services/LiveActivityService';
import StorageService from '../services/StorageService';
import { getLocalDateKey } from '../utils/dateHelpers';
import { ISHA_FALLBACK_DEADLINE_MS } from '../constants/time';

interface PrayerTimesContextType {
  todayPrayerTimes: PrayerTime[];
  nextPrayer: PrayerTime | null;
  tomorrowFajr: PrayerTime | null;
  isLoading: boolean;
  error: string | null;
  hasValidLocation: boolean;
  isOffline: boolean;
  usingHardcodedDefaults: boolean;
  highLatitudeWarning: boolean;
  refreshPrayerTimes: () => Promise<void>;
}

const PrayerTimesContext = createContext<PrayerTimesContextType>({
  todayPrayerTimes: [],
  nextPrayer: null,
  tomorrowFajr: null,
  isLoading: false,
  error: null,
  hasValidLocation: false,
  isOffline: false,
  usingHardcodedDefaults: false,
  highLatitudeWarning: false,
  refreshPrayerTimes: async () => {},
});

export const usePrayerTimes = () => useContext(PrayerTimesContext);

interface PrayerTimesProviderProps {
  children: React.ReactNode;
}

export const PrayerTimesProvider: React.FC<PrayerTimesProviderProps> = ({ children }) => {
  const { 
    location, 
    userSettings, 
    setTodayPrayerTimes, 
    setNextPrayer, 
    todayPrayerTimes, 
    nextPrayer,
    setTodaySunrise,
    setTodaySunset,
    setTodayMidnight,
  } = useStore(useShallow((s) => ({
    location: s.location,
    userSettings: s.userSettings,
    setTodayPrayerTimes: s.setTodayPrayerTimes,
    setNextPrayer: s.setNextPrayer,
    todayPrayerTimes: s.todayPrayerTimes,
    nextPrayer: s.nextPrayer,
    setTodaySunrise: s.setTodaySunrise,
    setTodaySunset: s.setTodaySunset,
    setTodayMidnight: s.setTodayMidnight,
  })));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<PrayerTime | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [usingHardcodedDefaults, setUsingHardcodedDefaults] = useState(false);
  const [highLatitudeWarning, setHighLatitudeWarning] = useState(false);

  const adjustmentsKey = useMemo(() => {
    return JSON.stringify(userSettings?.adjustments ?? {});
  }, [userSettings?.adjustments]);

  const hasValidLocation = isValidCoordinates(location);

  // Centralized prayer times loading
  // P0-G FIX: Enhanced next prayer calculation that considers active prayer windows.
  // A prayer remains the "next" prayer to act on until its fiqh deadline (the start
  // of the following prayer, or sunrise for Fajr), not just until its adhan time.
  // Islamic fiqh windows:
  //   Fajr    → ends at sunrise
  //   Dhuhr   → ends at Asr start
  //   Asr     → ends at Maghrib (sunset)
  //   Maghrib → ends at Isha start
  //   Isha    → ends at tomorrow's Fajr (Islamic midnight is preferred cutoff)
  const calculateNextPrayer = (
    todayPrayers: PrayerTime[],
    tmrwFajr: PrayerTime | null,
    sunrise?: Date | null,
    midnight?: Date | null,
  ): PrayerTime | null => {
    if (todayPrayers.length === 0) return null;

    const now = new Date();
    // First pass: find the first prayer whose TIME hasn't arrived yet (upcoming)
    for (let i = 0; i < todayPrayers.length; i++) {
      if (todayPrayers[i].time > now) {
        // Check if the PREVIOUS prayer is still in its active window
        // (its time has passed but its deadline hasn't)
        if (i > 0) {
          const prev = todayPrayers[i - 1];
          const prevDeadline = prev.name === 'Fajr' && sunrise
            ? sunrise
            : todayPrayers[i].time; // deadline = next prayer's start
          if (now < prevDeadline) {
            logger.log('✅ Active prayer window:', prev.name);
            return { ...prev, isNext: true };
          }
        }
        logger.log('✅ Next prayer today:', todayPrayers[i].name);
        return { ...todayPrayers[i], isNext: true };
      }
    }

    // All prayer times have passed — check if the last prayer (Isha) is still active.
    // Isha's fiqh window extends until tomorrow's Fajr (absolute).
    // Islamic midnight is the preferred cutoff but we still show Isha as active until Fajr.
    const lastPrayer = todayPrayers[todayPrayers.length - 1];
    const ishaAbsoluteDeadline = tmrwFajr
      ? tmrwFajr.time
      : midnight
        ? midnight
        : new Date(lastPrayer.time.getTime() + ISHA_FALLBACK_DEADLINE_MS);
    if (now < ishaAbsoluteDeadline) {
      logger.log('✅ Active prayer window (last):', lastPrayer.name);
      return { ...lastPrayer, isNext: true };
    }

    // If no more prayers today, return tomorrow's Fajr
    if (tmrwFajr) {
      logger.log('✅ Next prayer is tomorrow\'s Fajr');
      return { ...tmrwFajr, isNext: true };
    }

    return null;
  };

  // 🔒 STALE-CLOSURE FIX: This function reads location/userSettings from
  // useStore.getState() at call time — NOT from the render closure. This
  // guarantees fresh values when called from the useAppStateChange callback
  // (day-boundary reload after international travel, timezone change, etc.).
  const loadPrayerTimes = async () => {
    // Read fresh values from store at call time (not from closure)
    const { location: freshLocation, userSettings: freshSettings } = useStore.getState();
    const freshHasValidLocation = isValidCoordinates(freshLocation);

    if (!freshHasValidLocation || !freshSettings) {
      logger.log('⏳ PrayerTimesProvider: Waiting for prerequisites');
      return;
    }

    logger.log('🔄 Loading prayer times...');

    // Stale-while-revalidate: try disk cache for instant render before API call
    const today = new Date();
    const cached = PrayerTimeService.getCachedPrayerTimesFromDisk(
      freshLocation,
      today,
      freshSettings.calculationMethod,
      freshSettings.asrJuristic
    );

    if (cached) {
      logger.log('⚡ Instant render from disk cache');
      const fardNames: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const cachedPrayerTimes: PrayerTime[] = fardNames.map(name => {
        const timeStr = cached.times[name as keyof PrayerTimes];
        const prayerDate = PrayerTimeService.parseTimeToDate(timeStr, today);
        const adj = freshSettings.adjustments?.[name as keyof typeof freshSettings.adjustments] || 0;
        const adjusted = adj ? new Date(prayerDate.getTime() + adj * 60000) : prayerDate;
        return { name, time: adjusted, timestamp: adjusted.getTime(), isNext: false };
      });

      const cachedSunrise = PrayerTimeService.parseTimeToDate(cached.sunrise, today);
      const cachedSunset = PrayerTimeService.parseTimeToDate(cached.sunset, today);
      const cachedMidnight = cached.midnight ? PrayerTimeService.parseTimeToDate(cached.midnight, today) : null;

      setTodayPrayerTimes(cachedPrayerTimes);
      setTodaySunrise(cachedSunrise);
      setTodaySunset(cachedSunset);
      setTodayMidnight(cachedMidnight);

      // Calculate next prayer from cached data
      const cachedNext = calculateNextPrayer(cachedPrayerTimes, null, cachedSunrise, cachedMidnight);
      setNextPrayer(cachedNext);
      if (cachedNext) {
        setTodayPrayerTimes(cachedPrayerTimes.map(p => ({ ...p, isNext: p.name === cachedNext.name })));
      }

      // Don't show loading state — we have data to display
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Load today's prayer times with sunrise/sunset
      const todayResult = await PrayerTimeService.getPrayerTimesList(
        freshLocation,
        today,
        freshSettings.calculationMethod,
        freshSettings.adjustments,
        freshSettings.asrJuristic
      );

      // Always fetch tomorrow's Fajr — needed for Isha's fiqh deadline calculation
      // (Isha's window extends until tomorrow's Fajr, so we need it even before Isha adhan)
      let tomorrowFajrPrayer: PrayerTime | null = null;
      try {
        const tomorrowResult = await PrayerTimeService.getPrayerTimesList(
          freshLocation,
          tomorrow,
          freshSettings.calculationMethod,
          freshSettings.adjustments,
          freshSettings.asrJuristic
        );
        tomorrowFajrPrayer = tomorrowResult.prayerTimes.find(p => p.name === 'Fajr') || null;
      } catch (err) {
        logger.warn('⚠️ Failed to fetch tomorrow\'s Fajr:', err);
      }

      // Update state with prayer times, sun times, and midnight
      setTodayPrayerTimes(todayResult.prayerTimes);
      setTodaySunrise(todayResult.sunrise);
      setTodaySunset(todayResult.sunset);
      setTodayMidnight(todayResult.midnight);
      setTomorrowFajr(tomorrowFajrPrayer);

      // Calculate next prayer (pass sunrise for Fajr deadline, midnight for Isha deadline)
      const nextPrayer = calculateNextPrayer(
        todayResult.prayerTimes,
        tomorrowFajrPrayer,
        todayResult.sunrise,
        todayResult.midnight,
      );
      setNextPrayer(nextPrayer);

      // Sync isNext flags back to the prayer list so PrayerCard components
      // get the correct active state from the provider's fiqh-aware calculation
      if (nextPrayer) {
        const syncedTimes = todayResult.prayerTimes.map(p => ({
          ...p,
          isNext: p.name === nextPrayer.name,
        }));
        setTodayPrayerTimes(syncedTimes);
      }

      setIsOffline(PrayerTimeService.lastFetchWasFallback);
      setUsingHardcodedDefaults(PrayerTimeService.usingHardcodedDefaults);
      setHighLatitudeWarning(PrayerTimeService.highLatitudeWarning);
      lastLoadedDateRef.current = getLocalDateKey();
      logger.log('✅ Prayer times loaded successfully');

      // Push data to iOS widget
      const todayStr = getLocalDateKey();
      const todayRecords = StorageService.getDayPrayerRecords(todayStr);
      const dawam = StorageService.getCurrentDawam();
      WidgetService.updateWidgetData(
        todayResult.prayerTimes,
        todayRecords,
        nextPrayer,
        dawam
      );

      // Update Live Activity (iOS lock screen / Android ongoing notification)
      LiveActivityService.update(todayResult.prayerTimes, todayRecords, nextPrayer);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prayer times';
      logger.error('❌ Error loading prayer times:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load prayer times when location or settings change
  useEffect(() => {
    if (hasValidLocation && userSettings) {
      loadPrayerTimes();
    } else {
      logger.log('⏳ PrayerTimesProvider: Prerequisites not met', {
        hasValidLocation,
        hasSettings: !!userSettings,
      });
    }
  }, [
    hasValidLocation,
    location?.latitude,
    location?.longitude,
    userSettings?.calculationMethod,
    userSettings?.asrJuristic,
    adjustmentsKey,
  ]);

  // Periodic recalculation: re-evaluate nextPrayer every 60 seconds so the
  // hero auto-transitions when prayer time boundaries are crossed.
  // AppState-aware: pauses on background, immediate recalc on foreground.
  const recalcRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runRecalcRef = useRef<() => void>(() => {});
  const lastLoadedDateRef = useRef<string>(getLocalDateKey());

  const runRecalc = () => {
    if (todayPrayerTimes.length === 0) return;

    const { todaySunrise: sunrise, todayMidnight: midnight } = useStore.getState();
    const updated = calculateNextPrayer(todayPrayerTimes, tomorrowFajr, sunrise, midnight);

    // Only update store if the next prayer actually changed
    const currentName = nextPrayer?.name;
    const updatedName = updated?.name;
    if (currentName !== updatedName) {
      logger.log(`🔄 Next prayer changed: ${currentName} → ${updatedName}`);
      setNextPrayer(updated);

      // Sync isNext flags
      if (updated) {
        const syncedTimes = todayPrayerTimes.map(p => ({
          ...p,
          isNext: p.name === updated.name,
        }));
        setTodayPrayerTimes(syncedTimes);
      }
    }

    // Update Live Activity on every tick (progress bar + phase transitions)
    const todayStr = getLocalDateKey();
    const todayRecords = StorageService.getDayPrayerRecords(todayStr);
    LiveActivityService.update(todayPrayerTimes, todayRecords, updated ?? nextPrayer);
  };

  // Keep the ref pointing to the latest runRecalc closure
  runRecalcRef.current = runRecalc;

  const tick = () => {
    // Update shared clock so HomeScreen / useMosqueMode don't need their own intervals
    useStore.getState().setCurrentTime(new Date());
    runRecalcRef.current();
  };

  const startInterval = () => {
    if (recalcRef.current) clearInterval(recalcRef.current);
    recalcRef.current = setInterval(tick, 60_000);
  };

  // Start the 60s recalc interval on mount
  useEffect(() => {
    startInterval();
    return () => {
      if (recalcRef.current) clearInterval(recalcRef.current);
    };
  }, []);

  // Resume/pause via shared AppState listener (single native bridge subscription)
  useAppStateChange((nextState) => {
    if (nextState === 'active') {
      // Day-boundary check: if the date changed while backgrounded,
      // reload prayer times entirely instead of just recalculating
      const currentDateKey = getLocalDateKey();
      if (currentDateKey !== lastLoadedDateRef.current) {
        logger.log(`📅 Day boundary crossed (${lastLoadedDateRef.current} → ${currentDateKey}), reloading prayer times`);
        loadPrayerTimes();
      }
      // Immediately recalculate stale nextPrayer and restart interval
      tick();
      startInterval();
    } else {
      // Pause interval when backgrounded/inactive
      if (recalcRef.current) {
        clearInterval(recalcRef.current);
        recalcRef.current = null;
      }
    }
  });

  const refreshPrayerTimes = async () => {
    await loadPrayerTimes();
  };

  const value: PrayerTimesContextType = {
    todayPrayerTimes, // ✅ Now subscribed to store changes!
    nextPrayer,       // ✅ Now subscribed to store changes!
    tomorrowFajr,
    isLoading,
    error,
    hasValidLocation,
    isOffline,
    usingHardcodedDefaults,
    highLatitudeWarning,
    refreshPrayerTimes,
  };

  return (
    <PrayerTimesContext.Provider value={value}>
      {children}
    </PrayerTimesContext.Provider>
  );
};
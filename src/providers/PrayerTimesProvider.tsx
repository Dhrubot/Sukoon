// src/providers/PrayerTimesProvider.tsx

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import PrayerTimeService from '../services/PrayerTimeService';
import { PrayerTime, Location } from '../types';
import { isValidCoordinates } from '../utils/locationValidation';
import logger from '../utils/logger';
import WidgetService from '../services/WidgetService';
import StorageService from '../services/StorageService';
import { getLocalDateKey } from '../utils/dateHelpers';

interface PrayerTimesContextType {
  todayPrayerTimes: PrayerTime[];
  nextPrayer: PrayerTime | null;
  isLoading: boolean;
  error: string | null;
  hasValidLocation: boolean;
  isOffline: boolean;
  refreshPrayerTimes: () => Promise<void>;
}

const PrayerTimesContext = createContext<PrayerTimesContextType>({
  todayPrayerTimes: [],
  nextPrayer: null,
  isLoading: false,
  error: null,
  hasValidLocation: false,
  isOffline: false,
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
  } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<PrayerTime | null>(null);
  const [isOffline, setIsOffline] = useState(false);

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
        : new Date(lastPrayer.time.getTime() + 4 * 60 * 60 * 1000); // 4h fallback
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

  const loadPrayerTimes = async () => {
    if (!hasValidLocation || !userSettings) {
      logger.log('⏳ PrayerTimesProvider: Waiting for prerequisites');
      return;
    }

    logger.log('🔄 Loading prayer times...');
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Load today's prayer times with sunrise/sunset
      const todayResult = await PrayerTimeService.getPrayerTimesList(
        location,
        today,
        userSettings.calculationMethod,
        userSettings.adjustments,
        userSettings.asrJuristic
      );

      // Always fetch tomorrow's Fajr — needed for Isha's fiqh deadline calculation
      // (Isha's window extends until tomorrow's Fajr, so we need it even before Isha adhan)
      let tomorrowFajrPrayer: PrayerTime | null = null;
      try {
        const tomorrowResult = await PrayerTimeService.getPrayerTimesList(
          location,
          tomorrow,
          userSettings.calculationMethod,
          userSettings.adjustments,
          userSettings.asrJuristic
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
      logger.log('✅ Prayer times loaded successfully');

      // Push data to iOS widget
      const todayStr = getLocalDateKey();
      const todayRecords = StorageService.getDayPrayerRecords(todayStr);
      const streak = StorageService.getCurrentStreak();
      WidgetService.updateWidgetData(
        todayResult.prayerTimes,
        todayRecords,
        nextPrayer,
        streak
      );
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
  const recalcRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (recalcRef.current) clearInterval(recalcRef.current);

    recalcRef.current = setInterval(() => {
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
    }, 60_000);

    return () => {
      if (recalcRef.current) clearInterval(recalcRef.current);
    };
  }, [todayPrayerTimes, tomorrowFajr, nextPrayer?.name]);

  const refreshPrayerTimes = async () => {
    await loadPrayerTimes();
  };

  const value: PrayerTimesContextType = {
    todayPrayerTimes, // ✅ Now subscribed to store changes!
    nextPrayer,       // ✅ Now subscribed to store changes!
    isLoading,
    error,
    hasValidLocation,
    isOffline,
    refreshPrayerTimes,
  };

  return (
    <PrayerTimesContext.Provider value={value}>
      {children}
    </PrayerTimesContext.Provider>
  );
};
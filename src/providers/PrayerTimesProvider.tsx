// src/providers/PrayerTimesProvider.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import PrayerTimeService from '../services/PrayerTimeService';
import { PrayerTime, Location } from '../types';
import { isValidCoordinates } from '../utils/locationValidation';
import logger from '../utils/logger';

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
    setTodaySunset 
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
  // Enhanced next prayer calculation with tomorrow's Fajr
  const calculateNextPrayer = (todayPrayers: PrayerTime[], tomorrowFajr: PrayerTime | null): PrayerTime | null => {
    if (todayPrayers.length === 0) return null;

    const now = new Date();
    logger.log('🔍 Calculating next prayer...');

    // Check today's remaining prayers
    for (const prayer of todayPrayers) {
      if (prayer.time > now) {
        logger.log('✅ Next prayer today:', prayer.name);
        return { ...prayer, isNext: true };
      }
    }

    // If no more prayers today, return tomorrow's Fajr
    if (tomorrowFajr) {
      logger.log('✅ Next prayer is tomorrow\'s Fajr');
      return { ...tomorrowFajr, isNext: true };
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

      // Only fetch tomorrow's Fajr after Isha (last prayer) to avoid unnecessary API calls
      const ishaToday = todayResult.prayerTimes.find(p => p.name === 'Isha');
      const isAfterIsha = ishaToday && today > ishaToday.time;
      let tomorrowFajrPrayer: PrayerTime | null = null;

      if (isAfterIsha) {
        const tomorrowResult = await PrayerTimeService.getPrayerTimesList(
          location,
          tomorrow,
          userSettings.calculationMethod,
          userSettings.adjustments,
          userSettings.asrJuristic
        );
        tomorrowFajrPrayer = tomorrowResult.prayerTimes.find(p => p.name === 'Fajr') || null;
      }

      // Update state with prayer times and sun times
      setTodayPrayerTimes(todayResult.prayerTimes);
      setTodaySunrise(todayResult.sunrise);
      setTodaySunset(todayResult.sunset);
      setTomorrowFajr(tomorrowFajrPrayer);

      // Calculate next prayer
      const nextPrayer = calculateNextPrayer(todayResult.prayerTimes, tomorrowFajrPrayer);
      setNextPrayer(nextPrayer);

      setIsOffline(PrayerTimeService.lastFetchWasFallback);
      logger.log('✅ Prayer times loaded successfully');
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
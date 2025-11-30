// src/providers/PrayerTimesProvider.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import PrayerTimeService from '../services/PrayerTimeService';
import { PrayerTime, Location } from '../types';

interface PrayerTimesContextType {
  todayPrayerTimes: PrayerTime[];
  nextPrayer: PrayerTime | null;
  isLoading: boolean;
  error: string | null;
  hasValidLocation: boolean;
  refreshPrayerTimes: () => Promise<void>;
}

const PrayerTimesContext = createContext<PrayerTimesContextType>({
  todayPrayerTimes: [],
  nextPrayer: null,
  isLoading: false,
  error: null,
  hasValidLocation: false,
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

  // Centralized location validation
  const isValidLocation = (loc: Location | null): loc is Location => {
    if (!loc) return false;
    if (!loc.latitude || !loc.longitude) return false;
    if (loc.latitude === 0 && loc.longitude === 0) return false;
    if (loc.latitude < -90 || loc.latitude > 90) return false;
    if (loc.longitude < -180 || loc.longitude > 180) return false;
    return true;
  };

  const hasValidLocation = isValidLocation(location);

  // Centralized prayer times loading
  // Enhanced next prayer calculation with tomorrow's Fajr
  const calculateNextPrayer = (todayPrayers: PrayerTime[], tomorrowFajr: PrayerTime | null): PrayerTime | null => {
    if (todayPrayers.length === 0) return null;

    const now = new Date();
    console.log('🔍 Calculating next prayer...');

    // Check today's remaining prayers
    for (const prayer of todayPrayers) {
      if (prayer.time > now) {
        console.log('✅ Next prayer today:', prayer.name);
        return { ...prayer, isNext: true };
      }
    }

    // If no more prayers today, return tomorrow's Fajr
    if (tomorrowFajr) {
      console.log('✅ Next prayer is tomorrow\'s Fajr');
      return { ...tomorrowFajr, isNext: true };
    }

    return null;
  };

  const loadPrayerTimes = async () => {
    if (!hasValidLocation || !userSettings) {
      console.log('⏳ PrayerTimesProvider: Waiting for prerequisites');
      return;
    }

    console.log('🔄 Loading prayer times...');
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

      // Load tomorrow's Fajr
      const tomorrowResult = await PrayerTimeService.getPrayerTimesList(
        location,
        tomorrow,
        userSettings.calculationMethod,
        userSettings.adjustments,
        userSettings.asrJuristic
      );

      const tomorrowFajrPrayer = tomorrowResult.prayerTimes.find(p => p.name === 'Fajr') || null;

      // Update state with prayer times and sun times
      setTodayPrayerTimes(todayResult.prayerTimes);
      setTodaySunrise(todayResult.sunrise);
      setTodaySunset(todayResult.sunset);
      setTomorrowFajr(tomorrowFajrPrayer);

      // Calculate next prayer
      const nextPrayer = calculateNextPrayer(todayResult.prayerTimes, tomorrowFajrPrayer);
      setNextPrayer(nextPrayer);

      console.log('✅ Prayer times loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prayer times';
      console.error('❌ Error loading prayer times:', err);
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
      console.log('⏳ PrayerTimesProvider: Prerequisites not met', {
        hasValidLocation,
        hasSettings: !!userSettings,
      });
    }
  }, [hasValidLocation, userSettings?.calculationMethod, userSettings?.asrJuristic]);

  const refreshPrayerTimes = async () => {
    await loadPrayerTimes();
  };

  const value: PrayerTimesContextType = {
    todayPrayerTimes, // ✅ Now subscribed to store changes!
    nextPrayer,       // ✅ Now subscribed to store changes!
    isLoading,
    error,
    hasValidLocation,
    refreshPrayerTimes,
  };

  return (
    <PrayerTimesContext.Provider value={value}>
      {children}
    </PrayerTimesContext.Provider>
  );
};
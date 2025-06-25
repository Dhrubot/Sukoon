import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '../store/useStore';
import PrayerTimeService from '../services/PrayerTimeService';
import NotificationService from '../services/NotificationService';
import { PrayerTime } from '../types';

export const usePrayerTimes = () => {
  const {
    location,
    userSettings,
    todayPrayerTimes,
    setTodayPrayerTimes,
    nextPrayer,
    setNextPrayer,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load prayer times
  const loadPrayerTimes = async () => {
    if (!location || !userSettings) return;

    setIsLoading(true);
    setError(null);

    try {
      const times = await PrayerTimeService.getPrayerTimesList(
        location,
        new Date(),
        userSettings.calculationMethod,
        userSettings.adjustments
      );

      setTodayPrayerTimes(times);
      
      const next = times.find(t => t.isNext);
      setNextPrayer(next || null);

      // Update notifications
      await NotificationService.scheduleAllPrayerNotifications();
    } catch (err) {
      setError('Failed to load prayer times. Please check your connection.');
      console.error('Error loading prayer times:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update next prayer periodically
  useEffect(() => {
    const updateNextPrayer = () => {
      if (todayPrayerTimes.length === 0) return;

      const now = new Date();
      let foundNext = false;

      for (const prayer of todayPrayerTimes) {
        if (prayer.time > now && !foundNext) {
          setNextPrayer(prayer);
          foundNext = true;
          break;
        }
      }

      // If no next prayer today, load tomorrow's Fajr
      if (!foundNext) {
        loadPrayerTimes();
      }
    };

    // Update every minute
    const interval = setInterval(updateNextPrayer, 60000);
    updateNextPrayer(); // Run immediately

    return () => clearInterval(interval);
  }, [todayPrayerTimes]);

  // Reload on app resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadPrayerTimes();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [location, userSettings]);

  // Initial load
  useEffect(() => {
    loadPrayerTimes();
  }, [location, userSettings?.calculationMethod]);

  return {
    prayerTimes: todayPrayerTimes,
    nextPrayer,
    isLoading,
    error,
    refresh: loadPrayerTimes,
  };
};
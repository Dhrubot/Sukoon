// ===== 3. src/hooks/usePrayerTimeRefresh.ts =====
import { useCallback } from 'react';
import StorageService from '../services/StorageService';
import { Location as LocationType } from '../types';
import { getLocalDateKey } from '../utils/dateHelpers';

export const usePrayerTimeRefresh = () => {
  const shouldRefreshPrayerTimes = useCallback(async (
    location: LocationType,
    method: string
  ): Promise<boolean> => {
    try {
      // Get today's date in YYYY-MM-DD format for the cache key
      const today = new Date();
      const dateStr = getLocalDateKey(today);

      // Create a storage key for the prayer times refresh timestamp
      const refreshKey = `lastPrayerRefresh_${location.latitude.toFixed(
        4
      )}_${location.longitude.toFixed(4)}_${dateStr}_${method}`;

      // Check when we last refreshed prayer times
      const lastRefresh = StorageService.getValue(refreshKey);

      if (!lastRefresh) {
        // No refresh timestamp, so we should refresh
        // Save current time as last refresh
        StorageService.setValue(refreshKey, Date.now().toString());
        return true;
      }

      // Check if it's been more than 12 hours since last refresh
      const lastRefreshTime = parseInt(lastRefresh, 10);
      const twelveHoursMs = 12 * 60 * 60 * 1000;

      if (Date.now() - lastRefreshTime > twelveHoursMs) {
        // More than 12 hours, refresh
        StorageService.setValue(refreshKey, Date.now().toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking if prayer times should refresh:", error);
      return true; // Refresh to be safe
    }
  }, []);

  return { shouldRefreshPrayerTimes };
};
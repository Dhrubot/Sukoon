// ===== 3. src/hooks/usePrayerTimeRefresh.ts =====
import { useCallback } from 'react';
import StorageService from '../services/StorageService';
import { Location as LocationType } from '../types';
import { getLocalDateKey } from '../utils/dateHelpers';
import logger from '../utils/logger';

// Single self-overwriting key instead of per-date keys (fixes key leak)
const REFRESH_KEY = 'lastPrayerRefresh';

interface RefreshStamp {
  lat: number;
  lon: number;
  date: string;
  method: string;
  timestamp: number;
}

export const usePrayerTimeRefresh = () => {
  const shouldRefreshPrayerTimes = useCallback(async (
    location: LocationType,
    method: string
  ): Promise<boolean> => {
    try {
      const dateStr = getLocalDateKey(new Date());
      const lat = parseFloat(location.latitude.toFixed(4));
      const lon = parseFloat(location.longitude.toFixed(4));

      const raw = StorageService.getValue(REFRESH_KEY);
      if (raw) {
        try {
          const stamp: RefreshStamp = JSON.parse(raw);

          // Refresh if date, location, or method changed
          const sameContext =
            stamp.date === dateStr &&
            stamp.method === method &&
            Math.abs(stamp.lat - lat) < 0.01 &&
            Math.abs(stamp.lon - lon) < 0.01;

          if (sameContext) {
            // Check if it's been more than 12 hours since last refresh
            const twelveHoursMs = 12 * 60 * 60 * 1000;
            if (Date.now() - stamp.timestamp <= twelveHoursMs) {
              return false;
            }
          }
        } catch { /* malformed stamp, refresh */ }
      }

      // Save new stamp and signal refresh needed
      const newStamp: RefreshStamp = { lat, lon, date: dateStr, method, timestamp: Date.now() };
      StorageService.setValue(REFRESH_KEY, JSON.stringify(newStamp));
      return true;
    } catch (error) {
      logger.error("Error checking if prayer times should refresh:", error);
      return true; // Refresh to be safe
    }
  }, []);

  return { shouldRefreshPrayerTimes };
};
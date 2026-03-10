import { useCallback } from 'react';
import StorageService from '../services/StorageService';
import { CalculationMethod, Location as LocationType } from '../types';
import { getLocalDateKey } from '../utils/dateHelpers';
import logger from '../utils/logger';

const LEGACY_REFRESH_KEY = 'lastPrayerRefresh';
export const REFRESH_ATTEMPT_KEY = 'lastPrayerRefreshAttempt';
export const REFRESH_SUCCESS_KEY = 'lastPrayerRefreshSuccess';
const REFRESH_TTL_MS = 12 * 60 * 60 * 1000;

export interface PrayerRefreshStamp {
  lat: number;
  lon: number;
  date: string;
  method: string;
  asrJuristic: string;
  timezoneOffset: number;
  timestamp: number;
}

function buildPrayerRefreshStamp(
  location: LocationType,
  method: CalculationMethod | string,
  asrJuristic: 'Standard' | 'Hanafi' = 'Standard',
  now: Date = new Date()
): PrayerRefreshStamp {
  return {
    lat: parseFloat(location.latitude.toFixed(4)),
    lon: parseFloat(location.longitude.toFixed(4)),
    date: getLocalDateKey(now),
    method,
    asrJuristic,
    timezoneOffset: now.getTimezoneOffset(),
    timestamp: now.getTime(),
  };
}

function parseRefreshStamp(raw: string | null): PrayerRefreshStamp | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PrayerRefreshStamp>;
    if (
      typeof parsed.lat !== 'number' ||
      typeof parsed.lon !== 'number' ||
      typeof parsed.date !== 'string' ||
      typeof parsed.method !== 'string' ||
      typeof parsed.timestamp !== 'number'
    ) {
      return null;
    }

    return {
      lat: parsed.lat,
      lon: parsed.lon,
      date: parsed.date,
      method: parsed.method,
      asrJuristic: parsed.asrJuristic || 'Standard',
      timezoneOffset:
        typeof parsed.timezoneOffset === 'number'
          ? parsed.timezoneOffset
          : new Date(parsed.timestamp).getTimezoneOffset(),
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

function readLatestSuccessfulRefreshStamp(): PrayerRefreshStamp | null {
  return (
    parseRefreshStamp(StorageService.getValue(REFRESH_SUCCESS_KEY)) ||
    parseRefreshStamp(StorageService.getValue(LEGACY_REFRESH_KEY))
  );
}

function isSameRefreshContext(
  stamp: PrayerRefreshStamp,
  candidate: PrayerRefreshStamp
): boolean {
  return (
    stamp.date === candidate.date &&
    stamp.method === candidate.method &&
    stamp.asrJuristic === candidate.asrJuristic &&
    stamp.timezoneOffset === candidate.timezoneOffset &&
    Math.abs(stamp.lat - candidate.lat) < 0.01 &&
    Math.abs(stamp.lon - candidate.lon) < 0.01
  );
}

export function shouldRefreshPrayerTimesForContext(
  location: LocationType,
  method: CalculationMethod | string,
  asrJuristic: 'Standard' | 'Hanafi' = 'Standard',
  now: Date = new Date()
): boolean {
  try {
    const candidate = buildPrayerRefreshStamp(location, method, asrJuristic, now);
    const lastSuccess = readLatestSuccessfulRefreshStamp();

    if (!lastSuccess) {
      return true;
    }

    if (!isSameRefreshContext(lastSuccess, candidate)) {
      return true;
    }

    return candidate.timestamp - lastSuccess.timestamp > REFRESH_TTL_MS;
  } catch (error) {
    logger.error('Error checking if prayer times should refresh:', error);
    return true;
  }
}

export function recordPrayerRefreshAttempt(
  location: LocationType,
  method: CalculationMethod | string,
  asrJuristic: 'Standard' | 'Hanafi' = 'Standard',
  now: Date = new Date()
): void {
  const stamp = buildPrayerRefreshStamp(location, method, asrJuristic, now);
  StorageService.setValue(REFRESH_ATTEMPT_KEY, JSON.stringify(stamp));
}

export function recordPrayerRefreshSuccess(
  location: LocationType,
  method: CalculationMethod | string,
  asrJuristic: 'Standard' | 'Hanafi' = 'Standard',
  now: Date = new Date()
): void {
  const stamp = buildPrayerRefreshStamp(location, method, asrJuristic, now);
  StorageService.setValue(REFRESH_SUCCESS_KEY, JSON.stringify(stamp));
  StorageService.deleteValue(LEGACY_REFRESH_KEY);
}

export const usePrayerTimeRefresh = () => {
  const shouldRefreshPrayerTimes = useCallback(async (
    location: LocationType,
    method: CalculationMethod | string,
    asrJuristic: 'Standard' | 'Hanafi' = 'Standard'
  ): Promise<boolean> => {
    return shouldRefreshPrayerTimesForContext(location, method, asrJuristic);
  }, []);

  const recordRefreshAttempt = useCallback((
    location: LocationType,
    method: CalculationMethod | string,
    asrJuristic: 'Standard' | 'Hanafi' = 'Standard'
  ) => {
    recordPrayerRefreshAttempt(location, method, asrJuristic);
  }, []);

  const recordRefreshSuccess = useCallback((
    location: LocationType,
    method: CalculationMethod | string,
    asrJuristic: 'Standard' | 'Hanafi' = 'Standard'
  ) => {
    recordPrayerRefreshSuccess(location, method, asrJuristic);
  }, []);

  return {
    shouldRefreshPrayerTimes,
    recordRefreshAttempt,
    recordRefreshSuccess,
  };
};

import { format } from 'date-fns';

import { PRAYER_API_TIMEOUT_MS } from '../../constants/NotificationConstants';
import { getEdgeApiBaseUrl, isEdgeApiEnabled } from '../../config/runtimeConfig';
import {
  CalculationMethod,
  Coordinates,
  Location,
  PrayerTimes,
} from '../../types';
import { fetchWithTimeout } from '../../utils/networkRequest';

const EDGE_API_TIMEOUT_MS = 8000;

interface EdgeEnvelope<T> {
  data: T;
  meta?: {
    cacheStatus?: 'hit' | 'miss' | 'bypass';
    schemaVersion?: string;
    source?: string;
  };
}

export interface EdgeHijriDate {
  day: number;
  month: number;
  monthName: string;
  monthNameAr?: string;
  year: number;
}

export interface EdgePrayerTimesPayload {
  date: string;
  calculationFingerprint: string;
  timings: PrayerTimes;
  hijri?: EdgeHijriDate;
}

interface EdgeLocationResult {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

interface EdgeGeocodePayload {
  results: EdgeLocationResult[];
}

interface EdgeReverseGeocodePayload {
  location: EdgeLocationResult | null;
}

function requireEdgeApiBaseUrl(): string {
  const baseUrl = getEdgeApiBaseUrl();
  if (!baseUrl || !isEdgeApiEnabled()) {
    throw new Error('Edge API is not configured');
  }
  return baseUrl;
}

async function getEdgeJson<T>(
  pathname: string,
  params: Record<string, string | number | undefined>,
  timeoutMs = EDGE_API_TIMEOUT_MS
): Promise<T> {
  const baseUrl = requireEdgeApiBaseUrl();
  const url = new URL(`${baseUrl}${pathname}`);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        Accept: 'application/json',
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`Edge API responded with status: ${response.status}`);
  }

  const payload = (await response.json()) as EdgeEnvelope<T>;
  return payload.data;
}

function toCountryFilter(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  const trimmed = countryCode.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export async function fetchPrayerTimesFromEdge(
  coordinates: Coordinates,
  date: Date,
  method: CalculationMethod,
  asrJuristic: 'Standard' | 'Hanafi'
): Promise<EdgePrayerTimesPayload> {
  return getEdgeJson<EdgePrayerTimesPayload>(
    '/v1/prayer-times',
    {
      date: format(date, 'yyyy-MM-dd'),
      lat: coordinates.latitude,
      lng: coordinates.longitude,
      method,
      school: asrJuristic,
    },
    PRAYER_API_TIMEOUT_MS
  );
}

export async function fetchHijriDateFromEdge(date: Date, coordinates?: Coordinates): Promise<EdgeHijriDate> {
  return getEdgeJson<EdgeHijriDate>('/v1/hijri-date', {
    date: format(date, 'yyyy-MM-dd'),
    lat: coordinates?.latitude,
    lng: coordinates?.longitude,
  });
}

export async function geocodeAddressFromEdge(query: string, countryCode?: string): Promise<Location | null> {
  const payload = await getEdgeJson<EdgeGeocodePayload>('/v1/location/search', {
    q: query,
    country: toCountryFilter(countryCode),
    limit: 1,
  });

  const first = payload.results[0];
  if (!first) return null;

  return {
    latitude: first.latitude,
    longitude: first.longitude,
    city: first.city,
    country: first.country,
    timezone: first.timezone,
  };
}

export async function reverseGeocodeFromEdge(coordinates: Coordinates): Promise<Location | null> {
  const payload = await getEdgeJson<EdgeReverseGeocodePayload>('/v1/location/reverse', {
    lat: coordinates.latitude,
    lng: coordinates.longitude,
  });

  const location = payload.location;
  if (!location) return null;

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city,
    country: location.country,
    timezone: location.timezone,
  };
}


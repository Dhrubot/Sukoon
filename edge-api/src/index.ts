import {
  getCityIndexManifest,
  getSuggestedCitiesForCountry,
  hasCityIndexCoverageForCountry,
  searchCityIndex,
} from './cityIndex';

type CacheStatus = 'hit' | 'miss' | 'bypass';
type TelemetryValue = string | number | boolean | null | undefined;

interface Env {
  CACHE_KV?: KVNamespace;
  HIJRI_OVERRIDES?: KVNamespace;
  ALADHAN_API_BASE?: string;
  NOMINATIM_API_BASE?: string;
  CITY_INDEX_VERSION?: string;
  PRAYER_CACHE_TTL_SECONDS?: string;
  HIJRI_CACHE_TTL_SECONDS?: string;
  GEOCODE_CACHE_TTL_SECONDS?: string;
  SEARCH_CACHE_TTL_SECONDS?: string;
}

interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

interface HijriPayload {
  day: number;
  month: number;
  monthName: string;
  monthNameAr?: string;
  year: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

const RESPONSE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'cache-control': 'public, max-age=60',
} as const;

const SCHEMA_VERSION = '2026-03-10';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405);
      }

      switch (url.pathname) {
        case '/v1/prayer-times':
          return handlePrayerTimes(url, env);
        case '/v1/hijri-date':
          return handleHijriDate(url, env);
        case '/v1/location/reverse':
          return handleReverseGeocode(url, env);
        case '/v1/location/search':
          return handleLocationSearch(url, env);
        case '/health': {
          const cityIndexManifest = await getCityIndexManifest(
            env.CACHE_KV,
            readCityIndexVersion(env)
          );
          return json({
            ok: true,
            schemaVersion: SCHEMA_VERSION,
            cityIndexReady: Boolean(cityIndexManifest),
            cityIndexVersion: cityIndexManifest?.version ?? null,
            indexedCountryCount: cityIndexManifest ? Object.keys(cityIndexManifest.countryCounts).length : 0,
          });
        }
        default:
          return json({ error: 'Not found' }, 404);
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status);
      }
      const message = error instanceof Error ? error.message : 'Internal error';
      return json({ error: message }, 500);
    }
  },
};

async function handlePrayerTimes(url: URL, env: Env): Promise<Response> {
  const date = requireDate(url.searchParams.get('date'));
  const latitude = requireLatitude(url.searchParams.get('lat'));
  const longitude = requireLongitude(url.searchParams.get('lng'));
  const method = requireValue(url.searchParams.get('method'), 'method');
  const school = requireSchool(url.searchParams.get('school'));
  const rounded = roundCoordinates(latitude, longitude, 2);
  const cacheKey = `prayer:${date}:${rounded.latitude}:${rounded.longitude}:${method}:${school}`;
  const ttl = readTtl(env.PRAYER_CACHE_TTL_SECONDS, 86400);

  return serveCachedJson(cacheKey, ttl, env, async () => {
    const directDate = toAladhanDate(date);
    const methodId = calculationMethodToId(method);
    const schoolId = school === 'Hanafi' ? 1 : 0;
    const upstreamBase = env.ALADHAN_API_BASE ?? 'https://api.aladhan.com/v1';
    const upstreamUrl =
      `${upstreamBase}/timings/${directDate}?latitude=${rounded.latitude}` +
      `&longitude=${rounded.longitude}&method=${methodId}&school=${schoolId}`;

    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true,
      },
    });

    if (!upstream.ok) {
      emitEdgeEvent('prayer_provider_error', {
        status: upstream.status,
        method,
        school,
      });
      throw new HttpError(502, `Prayer provider failed with status ${upstream.status}`);
    }

    const payload = await upstream.json() as {
      data?: {
        timings?: Partial<PrayerTimings>;
        date?: {
          hijri?: {
            day: string;
            year: string;
            month: {
              number: number;
              en: string;
              ar?: string;
            };
          };
        };
      };
    };

    const timings = normalizeTimings(payload.data?.timings);
    const hijri = payload.data?.date?.hijri
      ? {
          day: parseInt(payload.data.date.hijri.day, 10),
          month: payload.data.date.hijri.month.number,
          monthName: payload.data.date.hijri.month.en,
          monthNameAr: payload.data.date.hijri.month.ar,
          year: parseInt(payload.data.date.hijri.year, 10),
        }
      : undefined;

    return {
      date,
      calculationFingerprint: `${date}:${rounded.latitude}:${rounded.longitude}:${method}:${school}`,
      timings,
      hijri,
    };
  }, {
    eventName: 'prayer_times_resolved',
    eventFields: (payload, cacheStatus) => ({
      cacheStatus,
      method,
      school,
      hasHijri: Boolean(payload.hijri),
    }),
  });
}

async function handleHijriDate(url: URL, env: Env): Promise<Response> {
  const date = requireDate(url.searchParams.get('date'));
  const latitude = optionalNumber(url.searchParams.get('lat'));
  const longitude = optionalNumber(url.searchParams.get('lng'));
  const rounded =
    latitude !== null && longitude !== null
      ? roundCoordinates(latitude, longitude, 2)
      : null;
  const ttl = readTtl(env.HIJRI_CACHE_TTL_SECONDS, 86400);
  const cacheKey = rounded
    ? `hijri:${date}:${rounded.latitude}:${rounded.longitude}`
    : `hijri:${date}:global`;

  return serveCachedJson(cacheKey, ttl, env, async () => {
    const override = await env.HIJRI_OVERRIDES?.get(date, 'json') as HijriPayload | null;
    if (override) {
      return override;
    }

    const upstreamBase = env.ALADHAN_API_BASE ?? 'https://api.aladhan.com/v1';
    const upstreamUrl = `${upstreamBase}/gToH/${toAladhanDate(date)}`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true,
      },
    });

    if (!upstream.ok) {
      emitEdgeEvent('hijri_provider_error', {
        status: upstream.status,
      });
      throw new HttpError(502, `Hijri provider failed with status ${upstream.status}`);
    }

    const payload = await upstream.json() as {
      data?: {
        hijri?: {
          day: string;
          year: string;
          month: {
            number: number;
            en: string;
            ar?: string;
          };
        };
      };
    };

    const hijri = payload.data?.hijri;
    if (!hijri) {
      throw new HttpError(502, 'Hijri provider returned no data');
    }

    return {
      day: parseInt(hijri.day, 10),
      month: hijri.month.number,
      monthName: hijri.month.en,
      monthNameAr: hijri.month.ar,
      year: parseInt(hijri.year, 10),
    };
  }, {
    eventName: 'hijri_resolved',
  });
}

async function handleReverseGeocode(url: URL, env: Env): Promise<Response> {
  const latitude = requireLatitude(url.searchParams.get('lat'));
  const longitude = requireLongitude(url.searchParams.get('lng'));
  const rounded = roundCoordinates(latitude, longitude, 3);
  const ttl = readTtl(env.GEOCODE_CACHE_TTL_SECONDS, 604800);
  const cacheKey = `reverse:${rounded.latitude}:${rounded.longitude}`;

  return serveCachedJson(cacheKey, ttl, env, async () => {
    const upstreamBase = env.NOMINATIM_API_BASE ?? 'https://nominatim.openstreetmap.org';
    const upstreamUrl =
      `${upstreamBase}/reverse?lat=${rounded.latitude}&lon=${rounded.longitude}` +
      '&format=json&addressdetails=1';

    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SukoonEdge/1.0 (+https://sukoon.app)',
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true,
      },
    });

    if (!upstream.ok) {
      emitEdgeEvent('reverse_geocode_provider_error', {
        status: upstream.status,
      });
      throw new HttpError(502, `Reverse geocode provider failed with status ${upstream.status}`);
    }

    const payload = await upstream.json() as NominatimResponse;

    return {
      location: {
        latitude,
        longitude,
        city: extractCity(payload.address),
        country: payload.address?.country ?? 'Unknown',
      },
    };
  }, {
    eventName: 'reverse_geocode_resolved',
  });
}

async function handleLocationSearch(url: URL, env: Env): Promise<Response> {
  const query = requireValue(url.searchParams.get('q'), 'q').trim();
  const country = (url.searchParams.get('country') ?? '').trim();
  const normalizedCountry = country.toLowerCase();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '5') || 5, 5);
  const ttl = readTtl(env.SEARCH_CACHE_TTL_SECONDS, 604800);
  const cityIndexVersion = readCityIndexVersion(env);
  const cacheKey = `search:${cityIndexVersion}:${query.toLowerCase()}:${normalizedCountry}:${limit}`;
  const hasCountryCoverage = await hasCityIndexCoverageForCountry(env.CACHE_KV, cityIndexVersion, country);
  const queryPrefix = normalizeQueryPrefix(query);

  return serveCachedJson(cacheKey, ttl, env, async () => {
    const indexedResults = await searchCityIndex(env.CACHE_KV, cityIndexVersion, query, country, limit);
    if (indexedResults.length > 0) {
      return {
        results: indexedResults,
        searchSource: 'city_index',
        hasCountryCoverage,
        suggestedResults: [],
      };
    }

    const suggestedResults = hasCountryCoverage
      ? await getSuggestedCitiesForCountry(env.CACHE_KV, cityIndexVersion, country, 3)
      : [];

    return {
      results: [],
      searchSource: 'city_index_miss',
      hasCountryCoverage,
      suggestedResults,
    };
  }, {
    eventName: 'city_search_resolved',
    eventFields: (payload) => ({
      searchSource: payload.searchSource,
      resultCount: payload.results.length,
      suggestedCount: payload.suggestedResults?.length ?? 0,
      country: normalizedCountry || 'unknown',
      queryPrefix,
      hasCountryCoverage,
      cityIndexVersion,
    }),
  });
}

function readCityIndexVersion(env: Env): string {
  const version = env.CITY_INDEX_VERSION?.trim();
  return version || 'v1';
}

async function serveCachedJson<T>(
  cacheKey: string,
  ttlSeconds: number,
  env: Env,
  producer: () => Promise<T>,
  options?: {
    eventName?: string;
    eventFields?: (payload: T, cacheStatus: CacheStatus) => Record<string, TelemetryValue>;
  }
): Promise<Response> {
  const cacheRequest = new Request(`https://sukoon-edge-cache/${cacheKey}`);
  const cached = await safeCacheMatch(cacheRequest);
  if (cached) {
    if (options?.eventName) {
      const cachedEnvelope = await parseCachedEnvelope<T>(cached);
      emitEdgeEvent(
        options.eventName,
        cachedEnvelope && options.eventFields
          ? options.eventFields(cachedEnvelope, 'hit')
          : { cacheStatus: 'hit' }
      );
    }
    return cached;
  }

  const stored = await env.CACHE_KV?.get(cacheKey, 'json') as T | null;
  if (stored) {
    if (options?.eventName) {
      emitEdgeEvent(options.eventName, options.eventFields?.(stored, 'hit') ?? { cacheStatus: 'hit' });
    }
    const response = jsonEnvelope(stored, 'hit');
    await safeCachePut(cacheRequest, response.clone());
    return response;
  }

  const payload = await producer();
  if (options?.eventName) {
    emitEdgeEvent(options.eventName, options.eventFields?.(payload, 'miss') ?? { cacheStatus: 'miss' });
  }
  const response = jsonEnvelope(payload, 'miss');
  await safeCachePut(cacheRequest, response.clone());
  await env.CACHE_KV?.put(cacheKey, JSON.stringify(payload), {
    expirationTtl: ttlSeconds,
  });
  return response;
}

function jsonEnvelope<T>(data: T, cacheStatus: CacheStatus): Response {
  return new Response(
    JSON.stringify({
      data,
      meta: {
        cacheStatus,
        schemaVersion: SCHEMA_VERSION,
        source: 'sukoon-edge',
      },
    }),
    {
      status: 200,
      headers: RESPONSE_HEADERS,
    }
  );
}

async function safeCacheMatch(request: Request): Promise<Response | null> {
  try {
    return (await getDefaultCache().match(request)) ?? null;
  } catch {
    return null;
  }
}

async function safeCachePut(request: Request, response: Response): Promise<void> {
  try {
    await getDefaultCache().put(request, response);
  } catch {
    // Cache failure must never take the endpoint down.
  }
}

function getDefaultCache(): Cache {
  return (caches as CacheStorage & { readonly default: Cache }).default;
}

async function parseCachedEnvelope<T>(response: Response): Promise<T | null> {
  try {
    const payload = await response.clone().json() as { data?: T };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

function emitEdgeEvent(event: string, fields: Record<string, TelemetryValue>): void {
  const sanitizedFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
  console.log(JSON.stringify({
    event,
    ...sanitizedFields,
  }));
}

function normalizeQueryPrefix(query: string): string {
  return query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3) || 'none';
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function normalizeTimings(timings?: Partial<PrayerTimings>): PrayerTimings {
  if (!timings?.Fajr || !timings?.Dhuhr || !timings?.Asr || !timings?.Maghrib || !timings?.Isha) {
    throw new HttpError(502, 'Prayer provider returned incomplete timings');
  }

  return {
    Fajr: timings.Fajr,
    Sunrise: timings.Sunrise ?? '',
    Dhuhr: timings.Dhuhr,
    Asr: timings.Asr,
    Sunset: timings.Sunset ?? timings.Maghrib,
    Maghrib: timings.Maghrib,
    Isha: timings.Isha,
    Midnight: timings.Midnight ?? '',
  };
}

function extractCity(address?: NominatimAddress): string {
  return (
    address?.city ??
    address?.town ??
    address?.village ??
    address?.municipality ??
    address?.suburb ??
    address?.state ??
    'Unknown'
  );
}

function toAladhanDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

function calculationMethodToId(method: string): number {
  switch (method) {
    case 'Jafari':
      return 0;
    case 'Karachi':
      return 1;
    case 'ISNA':
      return 2;
    case 'MWL':
      return 3;
    case 'Makkah':
      return 4;
    case 'Egypt':
      return 5;
    case 'Tehran':
      return 7;
    default:
      throw new HttpError(
        400,
        `Unsupported calculation method: ${method}. Use one of MWL, ISNA, Egypt, Makkah, Karachi, Tehran, or Jafari.`
      );
  }
}

function requireValue(value: string | null, name: string): string {
  if (!value || !value.trim()) {
    throw new HttpError(400, `Missing required query parameter: ${name}`);
  }
  return value;
}

function requireDate(value: string | null): string {
  const date = requireValue(value, 'date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, 'date must be YYYY-MM-DD');
  }
  return date;
}

function requireLatitude(value: string | null): number {
  const latitude = Number(requireValue(value, 'lat'));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, 'lat must be between -90 and 90');
  }
  return latitude;
}

function requireLongitude(value: string | null): number {
  const longitude = Number(requireValue(value, 'lng'));
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, 'lng must be between -180 and 180');
  }
  return longitude;
}

function requireSchool(value: string | null): 'Standard' | 'Hanafi' {
  const school = (value ?? 'Standard').trim();
  if (school === 'Standard' || school === 'Hanafi') {
    return school;
  }
  throw new HttpError(400, 'school must be Standard or Hanafi');
}

function optionalNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readTtl(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundCoordinates(latitude: number, longitude: number, decimals: number) {
  return {
    latitude: Number(latitude.toFixed(decimals)),
    longitude: Number(longitude.toFixed(decimals)),
  };
}

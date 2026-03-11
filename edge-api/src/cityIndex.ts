export interface CityIndexEntry {
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  population: number;
  normalizedName: string;
  normalizedCountry: string;
  normalizedAdmin1: string;
  normalizedAliases: string[];
}

export interface CitySearchResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  admin1?: string;
}

interface CityIndexManifest {
  version: string;
  countryCounts: Record<string, number>;
  countryTopCities?: Record<
    string,
    Array<{
      city: string;
      country: string;
      admin1?: string;
      latitude: number;
      longitude: number;
    }>
  >;
}

const CITY_INDEX_KEY_PREFIX = 'city-index';
const FALLBACK_COUNTRY_CODE = '*';
const SHARD_CACHE_LIMIT = 64;

let manifestPromise: Promise<CityIndexManifest | null> | null = null;
const shardCache = new Map<string, CityIndexEntry[]>();

export async function searchCityIndex(
  kv: KVNamespace | undefined,
  version: string,
  query: string,
  countryHint?: string,
  limit = 5
): Promise<CitySearchResult[]> {
  const parsed = parseSearchInput(query, countryHint);
  if (!parsed.cityQuery || !kv) return [];

  const effectiveLimit = Math.max(1, Math.min(limit, 10));
  const candidates = await getCandidates(kv, version, parsed.cityQuery, parsed.countryHint);
  if (candidates.length === 0) return [];

  const scored = candidates
    .map((entry) => ({ entry, score: scoreEntry(entry, parsed.cityQuery, parsed.countryHint) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.entry.population !== left.entry.population) return right.entry.population - left.entry.population;
      return left.entry.name.localeCompare(right.entry.name);
    });

  const seen = new Set<string>();
  const results: CitySearchResult[] = [];

  for (const { entry } of scored) {
    const dedupeKey = `${entry.name}:${entry.countryCode}:${entry.admin1 || ''}`;
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    results.push({
      latitude: entry.latitude,
      longitude: entry.longitude,
      city: entry.name,
      country: entry.country,
      admin1: entry.admin1,
    });

    if (results.length >= effectiveLimit) break;
  }

  return results;
}

export async function hasCityIndexCoverageForCountry(
  kv: KVNamespace | undefined,
  version: string,
  countryHint?: string
): Promise<boolean> {
  if (!countryHint || !kv) return false;

  const normalized = countryHint.trim().toUpperCase();
  if (normalized.length !== 2) return false;

  const manifest = await getCityIndexManifest(kv, version);
  return Boolean(manifest?.countryCounts[normalized]);
}

export async function getCityIndexManifest(
  kv: KVNamespace | undefined,
  version: string
): Promise<CityIndexManifest | null> {
  if (!kv) return null;

  if (!manifestPromise) {
    manifestPromise = kv.get(buildManifestKey(version), 'json') as Promise<CityIndexManifest | null>;
  }

  try {
    return await manifestPromise;
  } catch {
    manifestPromise = null;
    return null;
  }
}

export async function getSuggestedCitiesForCountry(
  kv: KVNamespace | undefined,
  version: string,
  countryHint?: string,
  limit = 3
): Promise<CitySearchResult[]> {
  if (!countryHint || !kv) return [];

  const normalized = countryHint.trim().toUpperCase();
  if (normalized.length !== 2) return [];

  const manifest = await getCityIndexManifest(kv, version);
  const suggested = manifest?.countryTopCities?.[normalized] ?? [];

  return suggested.slice(0, Math.max(1, Math.min(limit, 5))).map((city) => ({
    latitude: city.latitude,
    longitude: city.longitude,
    city: city.city,
    country: city.country,
    admin1: city.admin1,
  }));
}

function parseSearchInput(query: string, countryHint?: string): { cityQuery: string; countryHint: string } {
  const parts = query
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const cityQuery = normalizeText(parts[0] || query);
  const explicitCountry = normalizeText(countryHint || '');
  const queryCountry = normalizeText(parts.length > 1 ? parts[parts.length - 1] : '');

  return {
    cityQuery,
    countryHint: explicitCountry || queryCountry,
  };
}

async function getCandidates(
  kv: KVNamespace,
  version: string,
  cityQuery: string,
  countryHint: string
): Promise<CityIndexEntry[]> {
  const prefix = cityQuery.slice(0, Math.min(2, cityQuery.length));
  if (!prefix) return [];

  const maybeCountryCode = countryHint.length === 2 ? countryHint.toLowerCase() : null;
  const shardKeys = maybeCountryCode
    ? [buildShardKey(version, maybeCountryCode, prefix)]
    : [buildShardKey(version, FALLBACK_COUNTRY_CODE, prefix)];

  const candidates: CityIndexEntry[] = [];
  const seen = new Set<string>();

  for (const key of shardKeys) {
    const entries = await getShard(kv, key);
    for (const entry of entries) {
      const dedupeKey = `${entry.name}:${entry.countryCode}:${entry.admin1 || ''}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      candidates.push(entry);
    }
  }

  return candidates;
}

async function getShard(kv: KVNamespace, key: string): Promise<CityIndexEntry[]> {
  if (shardCache.has(key)) {
    const entries = shardCache.get(key)!;
    shardCache.delete(key);
    shardCache.set(key, entries);
    return entries;
  }

  const entries = ((await kv.get(key, 'json')) as CityIndexEntry[] | null) ?? [];
  shardCache.set(key, entries);

  if (shardCache.size > SHARD_CACHE_LIMIT) {
    const oldestKey = shardCache.keys().next().value;
    if (oldestKey) {
      shardCache.delete(oldestKey);
    }
  }

  return entries;
}

function scoreEntry(entry: CityIndexEntry, cityQuery: string, countryHint: string): number {
  let score = 0;
  const names = [entry.normalizedName, ...entry.normalizedAliases];

  for (const candidate of names) {
    if (candidate === cityQuery) {
      score = Math.max(score, 160);
      continue;
    }
    if (candidate.startsWith(cityQuery)) {
      score = Math.max(score, 130);
      continue;
    }
    if (candidate.includes(cityQuery)) {
      score = Math.max(score, 90);
    }
  }

  if (entry.normalizedAdmin1 && entry.normalizedAdmin1.startsWith(cityQuery)) {
    score = Math.max(score, 70);
  }

  if (countryHint) {
    const normalizedCountryHint = countryHint.toLowerCase();
    if (
      entry.countryCode.toLowerCase() === normalizedCountryHint ||
      entry.normalizedCountry === normalizedCountryHint ||
      entry.normalizedCountry.includes(normalizedCountryHint)
    ) {
      score += 40;
    } else if (normalizedCountryHint.length > 2) {
      return 0;
    }
  }

  const populationBoost = Math.min(25, Math.round(Math.log10(Math.max(entry.population, 1)) * 3));
  return score + populationBoost;
}

function buildManifestKey(version: string): string {
  return `${CITY_INDEX_KEY_PREFIX}:${version}:manifest`;
}

function buildShardKey(version: string, countryCode: string, prefix: string): string {
  return `${CITY_INDEX_KEY_PREFIX}:${version}:shard:${countryCode}:${prefix}`;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/cityIndex.ts
var CITY_INDEX_KEY_PREFIX = "city-index";
var FALLBACK_COUNTRY_CODE = "*";
var SHARD_CACHE_LIMIT = 64;
var manifestPromise = null;
var shardCache = /* @__PURE__ */ new Map();
async function searchCityIndex(kv, version, query, countryHint, limit = 5) {
  const parsed = parseSearchInput(query, countryHint);
  if (!parsed.cityQuery || !kv) return [];
  const effectiveLimit = Math.max(1, Math.min(limit, 10));
  const candidates = await getCandidates(kv, version, parsed.cityQuery, parsed.countryHint);
  if (candidates.length === 0) return [];
  const scored = candidates.map((entry) => ({ entry, score: scoreEntry(entry, parsed.cityQuery, parsed.countryHint) })).filter((item) => item.score > 0).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.entry.population !== left.entry.population) return right.entry.population - left.entry.population;
    return left.entry.name.localeCompare(right.entry.name);
  });
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const { entry } of scored) {
    const dedupeKey = `${entry.name}:${entry.countryCode}:${entry.admin1 || ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    results.push({
      latitude: entry.latitude,
      longitude: entry.longitude,
      city: entry.name,
      country: entry.country,
      admin1: entry.admin1
    });
    if (results.length >= effectiveLimit) break;
  }
  return results;
}
__name(searchCityIndex, "searchCityIndex");
async function hasCityIndexCoverageForCountry(kv, version, countryHint) {
  if (!countryHint || !kv) return false;
  const normalized = countryHint.trim().toUpperCase();
  if (normalized.length !== 2) return false;
  const manifest = await getCityIndexManifest(kv, version);
  return Boolean(manifest?.countryCounts[normalized]);
}
__name(hasCityIndexCoverageForCountry, "hasCityIndexCoverageForCountry");
async function getCityIndexManifest(kv, version) {
  if (!kv) return null;
  if (!manifestPromise) {
    manifestPromise = kv.get(buildManifestKey(version), "json");
  }
  try {
    return await manifestPromise;
  } catch {
    manifestPromise = null;
    return null;
  }
}
__name(getCityIndexManifest, "getCityIndexManifest");
function parseSearchInput(query, countryHint) {
  const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
  const cityQuery = normalizeText(parts[0] || query);
  const explicitCountry = normalizeText(countryHint || "");
  const queryCountry = normalizeText(parts.length > 1 ? parts[parts.length - 1] : "");
  return {
    cityQuery,
    countryHint: explicitCountry || queryCountry
  };
}
__name(parseSearchInput, "parseSearchInput");
async function getCandidates(kv, version, cityQuery, countryHint) {
  const prefix = cityQuery.slice(0, Math.min(2, cityQuery.length));
  if (!prefix) return [];
  const maybeCountryCode = countryHint.length === 2 ? countryHint.toLowerCase() : null;
  const shardKeys = maybeCountryCode ? [buildShardKey(version, maybeCountryCode, prefix), buildShardKey(version, FALLBACK_COUNTRY_CODE, prefix)] : [buildShardKey(version, FALLBACK_COUNTRY_CODE, prefix)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const key of shardKeys) {
    const entries = await getShard(kv, key);
    for (const entry of entries) {
      const dedupeKey = `${entry.name}:${entry.countryCode}:${entry.admin1 || ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      candidates.push(entry);
    }
  }
  return candidates;
}
__name(getCandidates, "getCandidates");
async function getShard(kv, key) {
  if (shardCache.has(key)) {
    const entries2 = shardCache.get(key);
    shardCache.delete(key);
    shardCache.set(key, entries2);
    return entries2;
  }
  const entries = await kv.get(key, "json") ?? [];
  shardCache.set(key, entries);
  if (shardCache.size > SHARD_CACHE_LIMIT) {
    const oldestKey = shardCache.keys().next().value;
    if (oldestKey) {
      shardCache.delete(oldestKey);
    }
  }
  return entries;
}
__name(getShard, "getShard");
function scoreEntry(entry, cityQuery, countryHint) {
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
    if (entry.countryCode.toLowerCase() === normalizedCountryHint || entry.normalizedCountry === normalizedCountryHint || entry.normalizedCountry.includes(normalizedCountryHint)) {
      score += 40;
    } else if (normalizedCountryHint.length > 2) {
      return 0;
    }
  }
  const populationBoost = Math.min(25, Math.round(Math.log10(Math.max(entry.population, 1)) * 3));
  return score + populationBoost;
}
__name(scoreEntry, "scoreEntry");
function buildManifestKey(version) {
  return `${CITY_INDEX_KEY_PREFIX}:${version}:manifest`;
}
__name(buildManifestKey, "buildManifestKey");
function buildShardKey(version, countryCode, prefix) {
  return `${CITY_INDEX_KEY_PREFIX}:${version}:shard:${countryCode}:${prefix}`;
}
__name(buildShardKey, "buildShardKey");
function normalizeText(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase().replace(/\s+/g, " ").trim();
}
__name(normalizeText, "normalizeText");

// src/index.ts
var RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "cache-control": "public, max-age=60"
};
var SCHEMA_VERSION = "2026-03-10";
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var index_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }
      switch (url.pathname) {
        case "/v1/prayer-times":
          return handlePrayerTimes(url, env);
        case "/v1/hijri-date":
          return handleHijriDate(url, env);
        case "/v1/location/reverse":
          return handleReverseGeocode(url, env);
        case "/v1/location/search":
          return handleLocationSearch(url, env);
        case "/health": {
          const cityIndexManifest = await getCityIndexManifest(
            env.CACHE_KV,
            readCityIndexVersion(env)
          );
          return json({
            ok: true,
            schemaVersion: SCHEMA_VERSION,
            cityIndexReady: Boolean(cityIndexManifest),
            cityIndexVersion: cityIndexManifest?.version ?? null,
            indexedCountryCount: cityIndexManifest ? Object.keys(cityIndexManifest.countryCounts).length : 0
          });
        }
        default:
          return json({ error: "Not found" }, 404);
      }
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status);
      }
      const message = error instanceof Error ? error.message : "Internal error";
      return json({ error: message }, 500);
    }
  }
};
async function handlePrayerTimes(url, env) {
  const date = requireDate(url.searchParams.get("date"));
  const latitude = requireLatitude(url.searchParams.get("lat"));
  const longitude = requireLongitude(url.searchParams.get("lng"));
  const method = requireValue(url.searchParams.get("method"), "method");
  const school = requireSchool(url.searchParams.get("school"));
  const rounded = roundCoordinates(latitude, longitude, 2);
  const cacheKey = `prayer:${date}:${rounded.latitude}:${rounded.longitude}:${method}:${school}`;
  const ttl = readTtl(env.PRAYER_CACHE_TTL_SECONDS, 86400);
  return serveCachedJson(cacheKey, ttl, env, async () => {
    const directDate = toAladhanDate(date);
    const methodId = calculationMethodToId(method);
    const schoolId = school === "Hanafi" ? 1 : 0;
    const upstreamBase = env.ALADHAN_API_BASE ?? "https://api.aladhan.com/v1";
    const upstreamUrl = `${upstreamBase}/timings/${directDate}?latitude=${rounded.latitude}&longitude=${rounded.longitude}&method=${methodId}&school=${schoolId}`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json"
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true
      }
    });
    if (!upstream.ok) {
      emitEdgeEvent("prayer_provider_error", {
        status: upstream.status,
        method,
        school
      });
      throw new HttpError(502, `Prayer provider failed with status ${upstream.status}`);
    }
    const payload = await upstream.json();
    const timings = normalizeTimings(payload.data?.timings);
    const hijri = payload.data?.date?.hijri ? {
      day: parseInt(payload.data.date.hijri.day, 10),
      month: payload.data.date.hijri.month.number,
      monthName: payload.data.date.hijri.month.en,
      monthNameAr: payload.data.date.hijri.month.ar,
      year: parseInt(payload.data.date.hijri.year, 10)
    } : void 0;
    return {
      date,
      calculationFingerprint: `${date}:${rounded.latitude}:${rounded.longitude}:${method}:${school}`,
      timings,
      hijri
    };
  }, {
    eventName: "prayer_times_resolved",
    eventFields: /* @__PURE__ */ __name((payload, cacheStatus) => ({
      cacheStatus,
      method,
      school,
      hasHijri: Boolean(payload.hijri)
    }), "eventFields")
  });
}
__name(handlePrayerTimes, "handlePrayerTimes");
async function handleHijriDate(url, env) {
  const date = requireDate(url.searchParams.get("date"));
  const latitude = optionalNumber(url.searchParams.get("lat"));
  const longitude = optionalNumber(url.searchParams.get("lng"));
  const rounded = latitude !== null && longitude !== null ? roundCoordinates(latitude, longitude, 2) : null;
  const ttl = readTtl(env.HIJRI_CACHE_TTL_SECONDS, 86400);
  const cacheKey = rounded ? `hijri:${date}:${rounded.latitude}:${rounded.longitude}` : `hijri:${date}:global`;
  return serveCachedJson(cacheKey, ttl, env, async () => {
    const override = await env.HIJRI_OVERRIDES?.get(date, "json");
    if (override) {
      return override;
    }
    const upstreamBase = env.ALADHAN_API_BASE ?? "https://api.aladhan.com/v1";
    const upstreamUrl = `${upstreamBase}/gToH/${toAladhanDate(date)}`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json"
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true
      }
    });
    if (!upstream.ok) {
      emitEdgeEvent("hijri_provider_error", {
        status: upstream.status
      });
      throw new HttpError(502, `Hijri provider failed with status ${upstream.status}`);
    }
    const payload = await upstream.json();
    const hijri = payload.data?.hijri;
    if (!hijri) {
      throw new HttpError(502, "Hijri provider returned no data");
    }
    return {
      day: parseInt(hijri.day, 10),
      month: hijri.month.number,
      monthName: hijri.month.en,
      monthNameAr: hijri.month.ar,
      year: parseInt(hijri.year, 10)
    };
  }, {
    eventName: "hijri_resolved"
  });
}
__name(handleHijriDate, "handleHijriDate");
async function handleReverseGeocode(url, env) {
  const latitude = requireLatitude(url.searchParams.get("lat"));
  const longitude = requireLongitude(url.searchParams.get("lng"));
  const rounded = roundCoordinates(latitude, longitude, 3);
  const ttl = readTtl(env.GEOCODE_CACHE_TTL_SECONDS, 604800);
  const cacheKey = `reverse:${rounded.latitude}:${rounded.longitude}`;
  return serveCachedJson(cacheKey, ttl, env, async () => {
    const upstreamBase = env.NOMINATIM_API_BASE ?? "https://nominatim.openstreetmap.org";
    const upstreamUrl = `${upstreamBase}/reverse?lat=${rounded.latitude}&lon=${rounded.longitude}&format=json&addressdetails=1`;
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SukoonEdge/1.0 (+https://sukoon.app)"
      },
      cf: {
        cacheTtl: ttl,
        cacheEverything: true
      }
    });
    if (!upstream.ok) {
      emitEdgeEvent("reverse_geocode_provider_error", {
        status: upstream.status
      });
      throw new HttpError(502, `Reverse geocode provider failed with status ${upstream.status}`);
    }
    const payload = await upstream.json();
    return {
      location: {
        latitude,
        longitude,
        city: extractCity(payload.address),
        country: payload.address?.country ?? "Unknown"
      }
    };
  }, {
    eventName: "reverse_geocode_resolved"
  });
}
__name(handleReverseGeocode, "handleReverseGeocode");
async function handleLocationSearch(url, env) {
  const query = requireValue(url.searchParams.get("q"), "q").trim();
  const country = (url.searchParams.get("country") ?? "").trim();
  const normalizedCountry = country.toLowerCase();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "5") || 5, 5);
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
        searchSource: "city_index",
        hasCountryCoverage
      };
    }
    return {
      results: [],
      searchSource: "city_index_miss",
      hasCountryCoverage
    };
  }, {
    eventName: "city_search_resolved",
    eventFields: /* @__PURE__ */ __name((payload) => ({
      searchSource: payload.searchSource,
      resultCount: payload.results.length,
      country: normalizedCountry || "unknown",
      queryPrefix,
      hasCountryCoverage,
      cityIndexVersion
    }), "eventFields")
  });
}
__name(handleLocationSearch, "handleLocationSearch");
function readCityIndexVersion(env) {
  const version = env.CITY_INDEX_VERSION?.trim();
  return version || "v1";
}
__name(readCityIndexVersion, "readCityIndexVersion");
async function serveCachedJson(cacheKey, ttlSeconds, env, producer, options) {
  const cacheRequest = new Request(`https://sukoon-edge-cache/${cacheKey}`);
  const cached = await safeCacheMatch(cacheRequest);
  if (cached) {
    if (options?.eventName) {
      const cachedEnvelope = await parseCachedEnvelope(cached);
      emitEdgeEvent(
        options.eventName,
        cachedEnvelope && options.eventFields ? options.eventFields(cachedEnvelope, "hit") : { cacheStatus: "hit" }
      );
    }
    return cached;
  }
  const stored = await env.CACHE_KV?.get(cacheKey, "json");
  if (stored) {
    if (options?.eventName) {
      emitEdgeEvent(options.eventName, options.eventFields?.(stored, "hit") ?? { cacheStatus: "hit" });
    }
    const response2 = jsonEnvelope(stored, "hit");
    await safeCachePut(cacheRequest, response2.clone());
    return response2;
  }
  const payload = await producer();
  if (options?.eventName) {
    emitEdgeEvent(options.eventName, options.eventFields?.(payload, "miss") ?? { cacheStatus: "miss" });
  }
  const response = jsonEnvelope(payload, "miss");
  await safeCachePut(cacheRequest, response.clone());
  await env.CACHE_KV?.put(cacheKey, JSON.stringify(payload), {
    expirationTtl: ttlSeconds
  });
  return response;
}
__name(serveCachedJson, "serveCachedJson");
function jsonEnvelope(data, cacheStatus) {
  return new Response(
    JSON.stringify({
      data,
      meta: {
        cacheStatus,
        schemaVersion: SCHEMA_VERSION,
        source: "sukoon-edge"
      }
    }),
    {
      status: 200,
      headers: RESPONSE_HEADERS
    }
  );
}
__name(jsonEnvelope, "jsonEnvelope");
async function safeCacheMatch(request) {
  try {
    return await getDefaultCache().match(request) ?? null;
  } catch {
    return null;
  }
}
__name(safeCacheMatch, "safeCacheMatch");
async function safeCachePut(request, response) {
  try {
    await getDefaultCache().put(request, response);
  } catch {
  }
}
__name(safeCachePut, "safeCachePut");
function getDefaultCache() {
  return caches.default;
}
__name(getDefaultCache, "getDefaultCache");
async function parseCachedEnvelope(response) {
  try {
    const payload = await response.clone().json();
    return payload.data ?? null;
  } catch {
    return null;
  }
}
__name(parseCachedEnvelope, "parseCachedEnvelope");
function emitEdgeEvent(event, fields) {
  const sanitizedFields = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== void 0)
  );
  console.log(JSON.stringify({
    event,
    ...sanitizedFields
  }));
}
__name(emitEdgeEvent, "emitEdgeEvent");
function normalizeQueryPrefix(query) {
  return query.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 3) || "none";
}
__name(normalizeQueryPrefix, "normalizeQueryPrefix");
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: RESPONSE_HEADERS
  });
}
__name(json, "json");
function normalizeTimings(timings) {
  if (!timings?.Fajr || !timings?.Dhuhr || !timings?.Asr || !timings?.Maghrib || !timings?.Isha) {
    throw new HttpError(502, "Prayer provider returned incomplete timings");
  }
  return {
    Fajr: timings.Fajr,
    Sunrise: timings.Sunrise ?? "",
    Dhuhr: timings.Dhuhr,
    Asr: timings.Asr,
    Sunset: timings.Sunset ?? timings.Maghrib,
    Maghrib: timings.Maghrib,
    Isha: timings.Isha,
    Midnight: timings.Midnight ?? ""
  };
}
__name(normalizeTimings, "normalizeTimings");
function extractCity(address) {
  return address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.suburb ?? address?.state ?? "Unknown";
}
__name(extractCity, "extractCity");
function toAladhanDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}
__name(toAladhanDate, "toAladhanDate");
function calculationMethodToId(method) {
  switch (method) {
    case "Jafari":
      return 0;
    case "Karachi":
      return 1;
    case "ISNA":
      return 2;
    case "MWL":
      return 3;
    case "Makkah":
      return 4;
    case "Egypt":
      return 5;
    case "Tehran":
      return 7;
    default:
      throw new HttpError(
        400,
        `Unsupported calculation method: ${method}. Use one of MWL, ISNA, Egypt, Makkah, Karachi, Tehran, or Jafari.`
      );
  }
}
__name(calculationMethodToId, "calculationMethodToId");
function requireValue(value, name) {
  if (!value || !value.trim()) {
    throw new HttpError(400, `Missing required query parameter: ${name}`);
  }
  return value;
}
__name(requireValue, "requireValue");
function requireDate(value) {
  const date = requireValue(value, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, "date must be YYYY-MM-DD");
  }
  return date;
}
__name(requireDate, "requireDate");
function requireLatitude(value) {
  const latitude = Number(requireValue(value, "lat"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, "lat must be between -90 and 90");
  }
  return latitude;
}
__name(requireLatitude, "requireLatitude");
function requireLongitude(value) {
  const longitude = Number(requireValue(value, "lng"));
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, "lng must be between -180 and 180");
  }
  return longitude;
}
__name(requireLongitude, "requireLongitude");
function requireSchool(value) {
  const school = (value ?? "Standard").trim();
  if (school === "Standard" || school === "Hanafi") {
    return school;
  }
  throw new HttpError(400, "school must be Standard or Hanafi");
}
__name(requireSchool, "requireSchool");
function optionalNumber(value) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
__name(optionalNumber, "optionalNumber");
function readTtl(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
__name(readTtl, "readTtl");
function roundCoordinates(latitude, longitude, decimals) {
  return {
    latitude: Number(latitude.toFixed(decimals)),
    longitude: Number(longitude.toFixed(decimals))
  };
}
__name(roundCoordinates, "roundCoordinates");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map

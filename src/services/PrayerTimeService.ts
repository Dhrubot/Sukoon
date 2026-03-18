import {
  format,
  isAfter,
  addDays,
} from "date-fns";
import { isFriday } from "../utils/ramadan";
import {
  PrayerTimes,
  PrayerTime,
  PrayerName,
  Coordinates,
  CalculationMethod,
  AladhanResponse,
} from "../types";
import { isValidCoordinates } from "../utils/locationValidation";
import { FARD_PRAYER_NAMES_LIST } from "../constants/prayerRegistry";
import { cacheHijriDate } from "../utils/ramadan";
import logger from "../utils/logger";
import StorageService from "./StorageService";
import { getLocalDateKey } from "../utils/dateHelpers";
import { PRAYER_API_TIMEOUT_MS } from "../constants/NotificationConstants";
import { fetchWithTimeout, describeNetworkError } from '../utils/networkRequest';
import { fetchPrayerTimesFromEdge } from './api/EdgeApiClient';

interface CachedPrayerTimesData {
  date: string;           // YYYY-MM-DD
  lat: number;
  lon: number;
  method: string;
  asrJuristic: string;
  timezoneOffset?: number; // minutes, from Date.getTimezoneOffset()
  times: PrayerTimes;
  sunrise: string;
  sunset: string;
  midnight: string | null;
  cachedAt: string;       // ISO timestamp
}

const ALADHAN_API_BASE = "https://api.aladhan.com/v1";

const CALCULATION_METHOD_MAP: Record<CalculationMethod, number> = {
  MWL: 3,
  ISNA: 2,
  Egypt: 5,
  Makkah: 4,
  Karachi: 1,
  Tehran: 7,
  Jafari: 0,
};

const MAX_CACHE_SIZE = 30;

interface PrayerApiResult {
  times: PrayerTimes;
  hijri?: {
    day: string;
    month: { number: number; en: string; ar: string };
    year: string;
  };
}

export class PrayerTimeService {
  private static instance: PrayerTimeService;
  private cachedTimes: Map<string, PrayerTimes> = new Map();
  private cachedLocations: Map<string, Coordinates> = new Map();
  private inFlightFetches: Map<string, Promise<PrayerTimes>> = new Map();
  private _lastFetchWasFallback: boolean = false;
  private _usingHardcodedDefaults: boolean = false;
  private _highLatitudeWarning: boolean = false;
  private _lastProviderSource: 'edge' | 'direct' | 'memory_cache' | 'calculated_fallback' | 'disk_cache' | 'hardcoded_defaults' | null = null;

  get lastFetchWasFallback(): boolean {
    return this._lastFetchWasFallback;
  }

  get usingHardcodedDefaults(): boolean {
    return this._usingHardcodedDefaults;
  }

  get highLatitudeWarning(): boolean {
    return this._highLatitudeWarning;
  }

  get lastProviderSource(): string | null {
    return this._lastProviderSource;
  }

  static getInstance(): PrayerTimeService {
    if (!PrayerTimeService.instance) {
      PrayerTimeService.instance = new PrayerTimeService();
    }
    return PrayerTimeService.instance;
  }

  private evictCacheIfNeeded(): void {
    if (this.cachedTimes.size > MAX_CACHE_SIZE) {
      const keysToDelete = Array.from(this.cachedTimes.keys()).slice(
        0,
        this.cachedTimes.size - MAX_CACHE_SIZE
      );
      for (const key of keysToDelete) {
        this.cachedTimes.delete(key);
      }
    }
  }

  private getFetchCacheKey(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: "Standard" | "Hanafi"
  ): string {
    const dateStr = format(date, "dd-MM-yyyy");
    const tzOffset = new Date().getTimezoneOffset();
    return `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}-${asrJuristic}-${tzOffset}`;
  }

  hasInFlightPrayerTimesFetch(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod = "MWL",
    asrJuristic: "Standard" | "Hanafi" = "Standard"
  ): boolean {
    if (!isValidCoordinates(coordinates)) return false;
    const cacheKey = this.getFetchCacheKey(coordinates, date, method, asrJuristic);
    return this.inFlightFetches.has(cacheKey);
  }

  /**
   * Fetch prayer times from Aladhan API
   */
  async fetchPrayerTimes(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod = "MWL",
    asrJuristic: "Standard" | "Hanafi" = "Standard"
  ): Promise<PrayerTimes> {
    // Use central validation
    if (!isValidCoordinates(coordinates)) {
      logger.log("🛑 fetchPrayerTimes: Invalid coordinates, using fallback");
      return this.calculatePrayerTimes(
        coordinates || { latitude: 0, longitude: 0 },
        date,
        method
      );
    }

    const dateStr = format(date, "dd-MM-yyyy");
    const cacheKey = this.getFetchCacheKey(coordinates, date, method, asrJuristic);

    // Check cache first
    if (this.cachedTimes.has(cacheKey)) {
      this._lastProviderSource = 'memory_cache';
      return this.cachedTimes.get(cacheKey)!;
    }

    const inFlight = this.inFlightFetches.get(cacheKey);
    if (inFlight) {
      logger.log(`♻️ Reusing in-flight prayer times for ${dateStr} with ${method}/${asrJuristic}`);
      return inFlight;
    }

    const fetchPromise = (async () => {
      logger.log(`Fetching prayer times for ${dateStr} with ${method}/${asrJuristic}`);
      try {
        const apiResult = await this.fetchPrayerTimesFromProvider(
          coordinates,
          date,
          method,
          asrJuristic
        );

        const times = apiResult.times;

        const requiredTimes = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        const missingTimes = requiredTimes.filter(
          (time) => !times[time as keyof typeof times]
        );

        if (missingTimes.length > 0) {
          logger.warn(
            `Missing prayer times after normalization: ${missingTimes.join(", ")}`
          );
        }

        this._lastFetchWasFallback = false;
        this._usingHardcodedDefaults = false;
        this._highLatitudeWarning = false;
        this.cachedTimes.set(cacheKey, times);
        this.evictCacheIfNeeded();

        if (apiResult.hijri) {
          cacheHijriDate(apiResult.hijri, date);
        }

        this.cachePrayerTimesToDisk(coordinates, date, method, asrJuristic, times);

        const now = new Date();
        const asrTime = this.parseTimeToDate(times.Asr, date);
        if (getLocalDateKey(now) === getLocalDateKey(date) && isAfter(now, asrTime)) {
          this.fetchPrayerTimes(
            coordinates,
            addDays(date, 1),
            method,
            asrJuristic
          ).catch((err) =>
            logger.warn("Failed to pre-cache tomorrow prayer times:", err)
          );
        }

        return times;
      } catch (error) {
        logger.error("Error fetching prayer times:", describeNetworkError(error));
        // Return calculated times as fallback
        this._lastFetchWasFallback = true;
        this._lastProviderSource = 'calculated_fallback';
        return this.calculatePrayerTimes(coordinates, date, method);
      } finally {
        this.inFlightFetches.delete(cacheKey);
      }
    })();

    this.inFlightFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async fetchPrayerTimesFromProvider(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: "Standard" | "Hanafi"
  ): Promise<PrayerApiResult> {
    try {
      const edgePayload = await fetchPrayerTimesFromEdge(
        coordinates,
        date,
        method,
        asrJuristic
      );
      this._lastProviderSource = 'edge';
      logger.log('🌐 Prayer times source: edge');

      return {
        times: edgePayload.timings,
        hijri: edgePayload.hijri
          ? {
              day: String(edgePayload.hijri.day),
              month: {
                number: edgePayload.hijri.month,
                en: edgePayload.hijri.monthName,
                ar: edgePayload.hijri.monthNameAr ?? '',
              },
              year: String(edgePayload.hijri.year),
            }
          : undefined,
      };
    } catch (edgeError) {
      logger.warn(
        "Edge prayer time fetch unavailable, falling back to direct provider:",
        describeNetworkError(edgeError)
      );
      return this.fetchPrayerTimesFromAladhan(coordinates, date, method, asrJuristic);
    }
  }

  private async fetchPrayerTimesFromAladhan(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: "Standard" | "Hanafi"
  ): Promise<PrayerApiResult> {
    const dateStr = format(date, "dd-MM-yyyy");
    const methodId = CALCULATION_METHOD_MAP[method];
    const school = asrJuristic === "Hanafi" ? 1 : 0;
    const url = `${ALADHAN_API_BASE}/timings/${dateStr}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&method=${methodId}&school=${school}`;

    const response = await fetchWithTimeout(url, undefined, PRAYER_API_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data: AladhanResponse = await response.json();

    if (!(data.code === 200 && data.data && data.data.timings)) {
      logger.error("Invalid API response format:", data);
      throw new Error("Invalid API response format");
    }

    const apiTimes = data.data.timings;
    this._lastProviderSource = 'direct';
    logger.log('🌐 Prayer times source: direct_fallback');

    return {
      times: {
        Fajr: apiTimes.Fajr || "",
        Sunrise: apiTimes.Sunrise || "",
        Dhuhr: apiTimes.Dhuhr || "",
        Asr: apiTimes.Asr || "",
        Sunset: apiTimes.Sunset || "",
        Maghrib: apiTimes.Maghrib || "",
        Isha: apiTimes.Isha || "",
        Midnight: apiTimes.Midnight || "",
      },
      hijri: data.data.date?.hijri
        ? {
            day: data.data.date.hijri.day,
            month: {
              number: data.data.date.hijri.month.number,
              en: data.data.date.hijri.month.en,
              ar: data.data.date.hijri.month.ar,
            },
            year: data.data.date.hijri.year,
          }
        : undefined,
    };
  }

  /**
   * Get prayer times as array with next prayer marked
   */
  async getPrayerTimesList(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod = "MWL",
    adjustments?: Record<PrayerName, number>,
    asrJuristic: "Standard" | "Hanafi" = "Standard"
  ): Promise<{ prayerTimes: PrayerTime[]; sunrise: Date; sunset: Date; midnight: Date | null }> {
    // CENTRAL GUARD - Stop invalid calls immediately
    if (!isValidCoordinates(coordinates)) {
      logger.log(
        "🛑 BLOCKED: Invalid coordinates, returning empty prayer times"
      );
      return { prayerTimes: [], sunrise: new Date(), sunset: new Date(), midnight: null };
    }

    try {
      const times = await this.fetchPrayerTimes(coordinates, date, method, asrJuristic);
      const now = new Date();

      // Parse sunrise, sunset, and midnight
      const sunrise = this.parseTimeToDate(times.Sunrise, date);
      const sunset = this.parseTimeToDate(times.Sunset, date);
      const midnight = times.Midnight ? this.parseTimeToDate(times.Midnight, date) : null;

      const prayerNames = FARD_PRAYER_NAMES_LIST as unknown as PrayerName[];
      const prayerTimesList: PrayerTime[] = [];
      let nextPrayerFound = false;

      for (const name of prayerNames) {
        const timeStr = times[name];
        let prayerDate = this.parseTimeToDate(timeStr, date);

        // Apply adjustments if provided
        if (adjustments && adjustments[name]) {
          prayerDate = new Date(
            prayerDate.getTime() + adjustments[name] * 60000
          );
        }

        const previousPrayer = prayerTimesList[prayerTimesList.length - 1];
        if (previousPrayer && prayerDate.getTime() <= previousPrayer.time.getTime()) {
          prayerDate = addDays(prayerDate, 1);
        }

        const isNext = !nextPrayerFound && isAfter(prayerDate, now);
        if (isNext) nextPrayerFound = true;

        prayerTimesList.push({
          name,
          time: prayerDate,
          timestamp: prayerDate.getTime(),
          isNext,
        });
      }

      // NOTE: The provider (PrayerTimesProvider) is the single source of truth
      // for determining the "next prayer" including fiqh-aware active windows.
      // The service returns clean today-only data without mutating the array.

      logger.log(
        "✅ Prayer list created successfully:",
        prayerTimesList.length,
        "prayers"
      );
      logger.log("🌅 Sunrise:", sunrise.toISOString());
      logger.log("🌇 Sunset:", sunset.toISOString());
      
      return {
        prayerTimes: prayerTimesList,
        sunrise,
        sunset,
        midnight,
      };
    } catch (error) {
      logger.error("❌ Error in getPrayerTimesList:", error);
      return { prayerTimes: [], sunrise: new Date(), sunset: new Date(), midnight: null };
    }
  }

  /**
   * Get the next prayer
   */
  async getNextPrayer(
    coordinates: Coordinates,
    method: CalculationMethod = "MWL"
  ): Promise<PrayerTime | null> {
    const { prayerTimes } = await this.getPrayerTimesList(
      coordinates,
      new Date(),
      method
    );
    return prayerTimes.find((p: PrayerTime) => p.isNext) || null;
  }

  /**
   * Parse time string to Date object
   */
  parseTimeToDate(timeStr: string | undefined, date: Date): Date {
    // Handle undefined or invalid time strings
    if (!timeStr) {
      logger.warn("Received undefined time string in parseTimeToDate");
      return new Date(date); // Return the date with default time (midnight)
    }

    const [hours, minutes] = timeStr.split(":").map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Calculate prayer times as fallback when API fails
   * Uses astronomical calculations to approximate prayer times
   */
  private calculatePrayerTimes(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: "Standard" | "Hanafi" = "Standard"
  ): PrayerTimes {
    try {
      logger.log("Using fallback prayer time calculation");
      const { latitude, longitude } = coordinates;

      // Flag high-latitude locations where astronomical calculations may be inaccurate
      this._highLatitudeWarning = Math.abs(latitude) > 48;

      // Convert date to Julian date
      const julian = this.getJulianDate(date);

      // Get sun declination and equation of time
      const sunPosition = this.getSunPosition(julian);
      const declination = sunPosition.declination;
      const equationOfTime = sunPosition.equationOfTime;

      // Get timezone offset (in hours)
      const timeZoneOffset = (date.getTimezoneOffset() / 60) * -1;

      // Method parameters (angles) for different calculation methods
      const methodParams = {
        MWL: { fajrAngle: 18, ishaAngle: 17, ishaIntervalMinutes: null }, // Muslim World League
        ISNA: { fajrAngle: 15, ishaAngle: 15, ishaIntervalMinutes: null }, // Islamic Society of North America
        Egypt: { fajrAngle: 19.5, ishaAngle: 17.5, ishaIntervalMinutes: null }, // Egyptian General Authority of Survey
        Makkah: { fajrAngle: 18.5, ishaAngle: null, ishaIntervalMinutes: 90 }, // Umm al-Qura, Makkah
        Karachi: { fajrAngle: 18, ishaAngle: 18, ishaIntervalMinutes: null }, // University of Islamic Sciences, Karachi
        Tehran: { fajrAngle: 17.7, ishaAngle: 14, ishaIntervalMinutes: null }, // Institute of Geophysics, Tehran
        Jafari: { fajrAngle: 16, ishaAngle: 14, ishaIntervalMinutes: null }, // Shia Ithna Ashari, Leva Research Institute
      };

      // Select method parameters (default to MWL if method not found)
      const params = methodParams[method] || methodParams.MWL;

      // Calculate prayer times using formulas

      // Zuhr time (local noon)
      const midDay = 12 + timeZoneOffset - longitude / 15 - equationOfTime / 60;

      const directSunriseTime = this.getTimeByAngleOrNull(
        0.833,
        declination,
        latitude,
        midDay,
        true
      );
      const directMaghribTime = this.getTimeByAngleOrNull(
        0.833,
        declination,
        latitude,
        midDay,
        false
      );

      // When sunrise/sunset are astronomically unavailable, fall back to a 12h day
      // centered on solar noon so downstream prayer times stay coherent.
      const sunriseTime = directSunriseTime ?? midDay - 6;
      const maghribTime = directMaghribTime ?? midDay + 6;

      // Dhuhr time (adjust midDay slightly)
      const dhuhrTime = midDay + 2 / 60; // Add 2 minutes

      // Asr time (using Standard method - shadow length = object height + shadow length at noon)
      const asrFactor = asrJuristic === "Hanafi" ? 2 : 1; // Standard Shafi'i (use 2 for Hanafi)
      const asrAngle =
        (Math.atan(
          1 /
            (asrFactor +
              Math.tan((Math.abs(latitude - declination) * Math.PI) / 180))
        ) *
          180) /
        Math.PI;
      const asrTime = this.getTimeByAngle(
        asrAngle,
        declination,
        latitude,
        midDay,
        false
      );

      // Midnight (for Tahajjud) - calculated as middle point between Maghrib and Fajr
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextJulian = this.getJulianDate(nextDay);
      const nextSunPosition = this.getSunPosition(nextJulian);
      const nextMidDay =
        12 +
        timeZoneOffset -
        longitude / 15 -
        nextSunPosition.equationOfTime / 60;
      const nextSunriseTime =
        this.getTimeByAngleOrNull(
          0.833,
          nextSunPosition.declination,
          latitude,
          nextMidDay,
          true
        ) ?? nextMidDay - 6;

      const nightDuration = this.getNightDurationHours(maghribTime, nextSunriseTime);
      const directFajrTime = this.getTimeByAngleOrNull(
        params.fajrAngle,
        declination,
        latitude,
        midDay,
        true
      );
      const fajrTime =
        directFajrTime ??
        this.normalizeTime(sunriseTime - nightDuration * this.getNightPortion(params.fajrAngle));

      const directIshaTime =
        params.ishaAngle === null
          ? null
          : this.getTimeByAngleOrNull(
              params.ishaAngle,
              declination,
              latitude,
              midDay,
              false
            );
      const ishaTime =
        params.ishaIntervalMinutes !== null
          ? this.normalizeTime(maghribTime + params.ishaIntervalMinutes / 60)
          : directIshaTime ??
            this.normalizeTime(maghribTime + nightDuration * this.getNightPortion(params.ishaAngle!));

      const nextDirectFajrTime = this.getTimeByAngleOrNull(
        params.fajrAngle,
        nextSunPosition.declination,
        latitude,
        nextMidDay,
        true
      );
      const nextFajrTime =
        nextDirectFajrTime ??
        this.normalizeTime(nextSunriseTime - nightDuration * this.getNightPortion(params.fajrAngle));

      // Adjust nextFajrTime if needed
      const adjustedNextFajr = this.normalizeTime(nextFajrTime);
      const midnightTime = (maghribTime + adjustedNextFajr) / 2;
      const normalizedMidnight = this.normalizeTime(midnightTime);

      // Format times as strings
      return {
        Fajr: this.formatTime(fajrTime),
        Sunrise: this.formatTime(sunriseTime),
        Dhuhr: this.formatTime(dhuhrTime),
        Asr: this.formatTime(asrTime),
        Sunset: this.formatTime(maghribTime), // Sunset is same as Maghrib start
        Maghrib: this.formatTime(maghribTime),
        Isha: this.formatTime(ishaTime),
        Midnight: this.formatTime(normalizedMidnight),
      };
    } catch (error) {
      logger.error("Error in fallback prayer time calculation:", error);

      // Try last-known-good cached times from MMKV before using hardcoded defaults
      try {
        const raw = StorageService.getValue('cached_prayer_times');
        if (raw) {
          const cached: CachedPrayerTimesData = JSON.parse(raw);
          if (cached.times) {
            logger.warn("Using last-known-good cached prayer times as fallback");
            this._lastFetchWasFallback = true;
            this._usingHardcodedDefaults = false;
            this._lastProviderSource = 'disk_cache';
            return cached.times;
          }
        }
      } catch (cacheError) {
        logger.warn("Failed to read cached prayer times:", cacheError);
      }

      // Absolute last resort: hardcoded defaults
      logger.error("No cached times available — using hardcoded defaults");
      this._usingHardcodedDefaults = true;
      this._lastProviderSource = 'hardcoded_defaults';
      return {
        Fajr: "05:00",
        Sunrise: "06:30",
        Dhuhr: "12:30",
        Asr: "15:45",
        Sunset: "18:30",
        Maghrib: "18:30",
        Isha: "20:00",
        Midnight: "00:00",
      };
    }
  }

  /**
   * Get Julian date from Gregorian date
   */
  private getJulianDate(date: Date): number {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();

    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);

    if (month <= 2) {
      year--;
      month += 12;
    }

    const julianDay =
      Math.floor(365.25 * (year + 4716)) +
      Math.floor(30.6001 * (month + 1)) +
      day +
      B -
      1524.5;
    return julianDay;
  }

  /**
   * Get sun position (declination and equation of time)
   */
  private getSunPosition(jd: number): {
    declination: number;
    equationOfTime: number;
  } {
    // Julian centuries since J2000.0
    const T = (jd - 2451545.0) / 36525.0;

    // Mean longitude of the sun
    let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    L0 = this.normalizeAngle(L0);

    // Mean anomaly of the sun
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    M = this.normalizeAngle(M);

    // Eccentricity of Earth's orbit
    const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

    // Sun's equation of the center
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) *
      Math.sin((M * Math.PI) / 180);
    const C2 = (0.019993 - 0.000101 * T) * Math.sin((2 * M * Math.PI) / 180);
    const C3 = 0.000289 * Math.sin((3 * M * Math.PI) / 180);

    // Sun's true longitude
    const theta = L0 + C + C2 + C3;

    // Sun's apparent longitude (deg)
    const omega = 125.04 - 1934.136 * T;
    const lambda =
      theta - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);

    // Obliquity of the ecliptic (deg)
    const epsilon =
      23.43929111 - 0.0130042 * T - 1.63e-7 * T * T + 5.04e-7 * T * T * T;

    // Sun's declination (deg)
    const declination =
      (Math.asin(
        Math.sin((epsilon * Math.PI) / 180) * Math.sin((lambda * Math.PI) / 180)
      ) *
        180) /
      Math.PI;

    // Equation of time (minutes)
    const y =
      Math.tan(((epsilon / 2) * Math.PI) / 180) *
      Math.tan(((epsilon / 2) * Math.PI) / 180);
    const equationOfTime =
      (4 *
        (y * Math.sin((2 * L0 * Math.PI) / 180) -
          2 * e * Math.sin((M * Math.PI) / 180) +
          4 *
            e *
            y *
            Math.sin((M * Math.PI) / 180) *
            Math.cos((2 * L0 * Math.PI) / 180) -
          0.5 * y * y * Math.sin((4 * L0 * Math.PI) / 180) -
          1.25 * e * e * Math.sin((2 * M * Math.PI) / 180)) *
        180) /
      Math.PI;

    return { declination, equationOfTime };
  }

  /**
   * Get time by angle
   */
  private getTimeByAngle(
    angle: number,
    declination: number,
    latitude: number,
    midDay: number,
    isBefore: boolean
  ): number {
    const latRad = (latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;
    const angleRad = (angle * Math.PI) / 180;

    const num = Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad);
    const den = Math.cos(latRad) * Math.cos(decRad);

    let cosAng = num / den;

    // Ensure cosine is within valid range [-1, 1]
    if (cosAng > 1) cosAng = 1;
    if (cosAng < -1) cosAng = -1;

    let time = (Math.acos(cosAng) * 180) / Math.PI / 15;

    // Before midday or after midday
    time = isBefore ? midDay - time : midDay + time;

    return time;
  }

  private getTimeByAngleOrNull(
    angle: number,
    declination: number,
    latitude: number,
    midDay: number,
    isBefore: boolean
  ): number | null {
    const latRad = (latitude * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;
    const angleRad = (angle * Math.PI) / 180;

    const num = Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad);
    const den = Math.cos(latRad) * Math.cos(decRad);
    const cosAng = num / den;

    if (!Number.isFinite(cosAng) || cosAng > 1 || cosAng < -1) {
      return null;
    }

    const time = (Math.acos(cosAng) * 180) / Math.PI / 15;
    return isBefore ? midDay - time : midDay + time;
  }

  private getNightPortion(angle: number): number {
    return angle / 60;
  }

  private getNightDurationHours(maghribTime: number, nextSunriseTime: number): number {
    const normalizedMaghrib = this.normalizeTime(maghribTime);
    const normalizedNextSunrise = this.normalizeTime(nextSunriseTime);
    const duration = normalizedNextSunrise - normalizedMaghrib;
    return duration > 0 ? duration : duration + 24;
  }

  private normalizeTime(time: number): number {
    let normalized = time;
    while (normalized < 0) normalized += 24;
    while (normalized >= 24) normalized -= 24;
    return normalized;
  }

  /**
   * Normalize angle between 0-360 degrees
   */
  private normalizeAngle(angle: number): number {
    return angle - Math.floor(angle / 360) * 360;
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(time: number): string {
    if (isNaN(time)) {
      logger.warn("Invalid time value in formatTime:", time);
      return "00:00";
    }

    time = this.normalizeTime(time);

    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);

    // Handle minute overflow
    let adjustedHours = hours;
    let adjustedMinutes = minutes;

    if (adjustedMinutes >= 60) {
      adjustedHours += Math.floor(adjustedMinutes / 60);
      adjustedMinutes %= 60;

      // Normalize hours again if needed
      if (adjustedHours >= 24) {
        adjustedHours %= 24;
      }
    }

    const hoursStr = adjustedHours.toString().padStart(2, "0");
    const minutesStr = adjustedMinutes.toString().padStart(2, "0");

    return `${hoursStr}:${minutesStr}`;
  }

  /**
   * Check if it's time for prayer
   */
  isPrayerTime(prayerTime: Date, threshold: number = 5): boolean {
    const now = new Date();
    const diffMinutes = Math.abs(now.getTime() - prayerTime.getTime()) / 60000;
    return diffMinutes <= threshold;
  }

  /**
   * Get time until next prayer in minutes
   */
  getTimeUntilNextPrayer(nextPrayerTime: Date): number {
    const now = new Date();
    const diff = nextPrayerTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 60000));
  }

  /**
   * Format time for display
   */
  formatPrayerTime(date: Date, use24Hour: boolean = false): string {
    return format(date, use24Hour ? "HH:mm" : "h:mm a");
  }

  /**
   * Get prayer name in different languages
   */
  getPrayerDisplayName(
    prayer: PrayerName,
    language: "en" | "ar" = "en"
  ): string {
    // On Fridays, Jumu'ah replaces Dhuhr
    if (prayer === "Dhuhr" && isFriday()) {
      return language === "ar" ? "الجمعة" : "Jumu'ah";
    }

    const names = {
      en: {
        Fajr: "Fajr",
        Dhuhr: "Dhuhr",
        Asr: "Asr",
        Maghrib: "Maghrib",
        Isha: "Isha",
      },
      ar: {
        Fajr: "الفجر",
        Dhuhr: "الظهر",
        Asr: "العصر",
        Maghrib: "المغرب",
        Isha: "العشاء",
      },
    };

    return names[language][prayer];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedTimes.clear();
    this.inFlightFetches.clear();
  }

  /**
   * Check if we already have cached prayer times for a specific date and location
   */
  hasCachedPrayerTimes(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod = "MWL"
  ): boolean {
    const dateStr = format(date, "dd-MM-yyyy");
    const tzOffset = new Date().getTimezoneOffset();
    const cacheKey = `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}-${tzOffset}`;
    return this.cachedTimes.has(cacheKey);
  }

  /**
   * Cache coordinates for a city/country combination to avoid repeated geocoding
   */
  cacheLocationCoordinates(
    cityCountry: string,
    coordinates: Coordinates
  ): void {
    this.cachedLocations.set(cityCountry.toLowerCase(), coordinates);
  }

  /**
   * Check if we have cached coordinates for a city/country combination
   */
  getCachedLocationCoordinates(cityCountry: string): Coordinates | null {
    const coords = this.cachedLocations.get(cityCountry.toLowerCase());
    return coords || null;
  }

  /**
   * Persist prayer times to MMKV for instant display on next cold boot.
   * Single self-overwriting key — no stale data pileup.
   */
  private cachePrayerTimesToDisk(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: string,
    times: PrayerTimes
  ): void {
    try {
      const cached: CachedPrayerTimesData = {
        date: getLocalDateKey(date),
        lat: parseFloat(coordinates.latitude.toFixed(4)),
        lon: parseFloat(coordinates.longitude.toFixed(4)),
        method,
        asrJuristic,
        timezoneOffset: new Date().getTimezoneOffset(),
        times,
        sunrise: times.Sunrise,
        sunset: times.Sunset,
        midnight: times.Midnight || null,
        cachedAt: new Date().toISOString(),
      };
      StorageService.setValue('cached_prayer_times', JSON.stringify(cached));
    } catch (err) {
      logger.warn('Failed to cache prayer times to disk:', err);
    }
  }

  /**
   * Synchronous read of cached prayer times from MMKV.
   * Returns parsed data if date + location + method match, null otherwise.
   */
  getCachedPrayerTimesFromDisk(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod,
    asrJuristic: string = 'Standard'
  ): CachedPrayerTimesData | null {
    try {
      const raw = StorageService.getValue('cached_prayer_times');
      if (!raw) return null;

      const cached: CachedPrayerTimesData = JSON.parse(raw);
      const dateStr = getLocalDateKey(date);
      const lat = parseFloat(coordinates.latitude.toFixed(4));
      const lon = parseFloat(coordinates.longitude.toFixed(4));

      // Must match date, method, asr juristic, timezone offset, and be within ~1km
      const currentOffset = new Date().getTimezoneOffset();
      if (
        cached.date === dateStr &&
        cached.method === method &&
        cached.asrJuristic === asrJuristic &&
        (cached.timezoneOffset === undefined || cached.timezoneOffset === currentOffset) &&
        Math.abs(cached.lat - lat) < 0.01 &&
        Math.abs(cached.lon - lon) < 0.01
      ) {
        return cached;
      }

      return null;
    } catch {
      return null;
    }
  }

  // Validation delegated to shared utils/locationValidation.ts
}

export default PrayerTimeService.getInstance();

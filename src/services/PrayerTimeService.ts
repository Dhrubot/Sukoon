import {
  format,
  parse,
  isAfter,
  isBefore,
  addDays,
  startOfDay,
} from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import {
  PrayerTimes,
  PrayerTime,
  PrayerName,
  Coordinates,
  CalculationMethod,
  AladhanResponse,
} from "../types";

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

export class PrayerTimeService {
  private static instance: PrayerTimeService;
  private cachedTimes: Map<string, PrayerTimes> = new Map();
  private cachedLocations: Map<string, Coordinates> = new Map();

  static getInstance(): PrayerTimeService {
    if (!PrayerTimeService.instance) {
      PrayerTimeService.instance = new PrayerTimeService();
    }
    return PrayerTimeService.instance;
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
    if (!PrayerTimeService.isValidCoordinates(coordinates)) {
      console.log("🛑 fetchPrayerTimes: Invalid coordinates, using fallback");
      return this.calculatePrayerTimes(
        coordinates || { latitude: 0, longitude: 0 },
        date,
        method
      );
    }

    const dateStr = format(date, "dd-MM-yyyy");
    const cacheKey = `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}-${asrJuristic}`;

    // Check cache first
    if (this.cachedTimes.has(cacheKey)) {
      return this.cachedTimes.get(cacheKey)!;
    }

    // Validate coordinates - if invalid, use fallback
    if (
      !coordinates ||
      (coordinates.latitude === 0 && coordinates.longitude === 0)
    ) {
      console.warn(
        "Invalid coordinates provided to fetchPrayerTimes, using fallback calculation"
      );
      return this.calculatePrayerTimes(
        coordinates || { latitude: 0, longitude: 0 },
        date,
        method
      );
    }

    try {
      const methodId = CALCULATION_METHOD_MAP[method];
      const school = asrJuristic === "Hanafi" ? 1 : 0;

      const url = `${ALADHAN_API_BASE}/timings/${dateStr}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&method=${methodId}&school=${school}`;

      console.log(`Fetching prayer times from: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data: AladhanResponse = await response.json();

      if (data.code === 200 && data.data && data.data.timings) {
        const apiTimes = data.data.timings;
        console.log("Prayer times received:", apiTimes);

        // Create normalized version with lowercase keys to match our internal format
        const times: PrayerTimes = {
          Fajr: apiTimes.Fajr || "",
          Sunrise: apiTimes.Sunrise || "",
          Dhuhr: apiTimes.Dhuhr || "",
          Asr: apiTimes.Asr || "",
          Sunset: apiTimes.Sunset || "",
          Maghrib: apiTimes.Maghrib || "",
          Isha: apiTimes.Isha || "",
          Midnight: apiTimes.Midnight || "",
        };

        // Check for any missing times
        const requiredTimes = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
        const missingTimes = requiredTimes.filter(
          (time) => !times[time as keyof typeof times]
        );

        if (missingTimes.length > 0) {
          console.warn(
            `Missing prayer times after normalization: ${missingTimes.join(
              ", "
            )}`
          );
        }

        this.cachedTimes.set(cacheKey, times);

        // Cache for tomorrow as well if it's after Asr
        const now = new Date();
        const asrTime = this.parseTimeToDate(times.Asr, date);
        if (isAfter(now, asrTime)) {
          this.fetchPrayerTimes(
            coordinates,
            addDays(date, 1),
            method,
            asrJuristic
          ).catch((err) =>
            console.warn("Failed to pre-cache tomorrow prayer times:", err)
          );
        }

        return times;
      } else {
        console.error("Invalid API response format:", data);
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      // Return calculated times as fallback
      return this.calculatePrayerTimes(coordinates, date, method);
    }
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
  ): Promise<{ prayerTimes: PrayerTime[]; sunrise: Date; sunset: Date }> {
    // CENTRAL GUARD - Stop invalid calls immediately
    if (!PrayerTimeService.isValidCoordinates(coordinates)) {
      console.log(
        "🛑 BLOCKED: Invalid coordinates, returning empty prayer times"
      );
      return { prayerTimes: [], sunrise: new Date(), sunset: new Date() };
    }

    try {
      const times = await this.fetchPrayerTimes(coordinates, date, method, asrJuristic);
      const now = new Date();

      // Parse sunrise and sunset
      const sunrise = this.parseTimeToDate(times.Sunrise, date);
      const sunset = this.parseTimeToDate(times.Sunset, date);

      const prayerNames: PrayerName[] = [
        "Fajr",
        "Dhuhr",
        "Asr",
        "Maghrib",
        "Isha",
      ];
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

        const isNext = !nextPrayerFound && isAfter(prayerDate, now);
        if (isNext) nextPrayerFound = true;

        prayerTimesList.push({
          name,
          time: prayerDate,
          timestamp: prayerDate.getTime(),
          isNext,
        });
      }

      // If no next prayer found today, mark Fajr as next
      if (!nextPrayerFound && prayerTimesList.length > 0) {
        try {
          // Get tomorrow's Fajr
          const tomorrowTimes = await this.fetchPrayerTimes(
            coordinates,
            addDays(date, 1),
            method,
            asrJuristic
          );
          const tomorrowFajr = this.parseTimeToDate(
            tomorrowTimes.Fajr,
            addDays(date, 1)
          );

          prayerTimesList[0] = {
            ...prayerTimesList[0],
            time: tomorrowFajr,
            timestamp: tomorrowFajr.getTime(),
            isNext: true,
          };
        } catch (error) {
          console.error("❌ Error fetching tomorrow's Fajr:", error);
        }
      }

      console.log(
        "✅ Prayer list created successfully:",
        prayerTimesList.length,
        "prayers"
      );
      console.log("🌅 Sunrise:", sunrise.toISOString());
      console.log("🌇 Sunset:", sunset.toISOString());
      
      return {
        prayerTimes: prayerTimesList,
        sunrise,
        sunset,
      };
    } catch (error) {
      console.error("❌ Error in getPrayerTimesList:", error);
      return { prayerTimes: [], sunrise: new Date(), sunset: new Date() };
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
  private parseTimeToDate(timeStr: string | undefined, date: Date): Date {
    // Handle undefined or invalid time strings
    if (!timeStr) {
      console.warn("Received undefined time string in parseTimeToDate");
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
      console.log("Using fallback prayer time calculation");
      const { latitude, longitude } = coordinates;

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
        MWL: { fajrAngle: 18, ishaAngle: 17 }, // Muslim World League
        ISNA: { fajrAngle: 15, ishaAngle: 15 }, // Islamic Society of North America
        Egypt: { fajrAngle: 19.5, ishaAngle: 17.5 }, // Egyptian General Authority of Survey
        Makkah: { fajrAngle: 18.5, ishaAngle: 90 }, // Umm al-Qura, Makkah
        Karachi: { fajrAngle: 18, ishaAngle: 18 }, // University of Islamic Sciences, Karachi
        Tehran: { fajrAngle: 17.7, ishaAngle: 14 }, // Institute of Geophysics, Tehran
        Jafari: { fajrAngle: 16, ishaAngle: 14 }, // Shia Ithna Ashari, Leva Research Institute
      };

      // Select method parameters (default to MWL if method not found)
      const params = methodParams[method] || methodParams.MWL;

      // Calculate prayer times using formulas

      // Zuhr time (local noon)
      const midDay = 12 + timeZoneOffset - longitude / 15 - equationOfTime / 60;

      // Fajr time using angle
      const fajrTime = this.getTimeByAngle(
        params.fajrAngle,
        declination,
        latitude,
        midDay,
        true
      );

      // Sunrise time (angle = 0.833 degrees)
      const sunriseTime = this.getTimeByAngle(
        0.833,
        declination,
        latitude,
        midDay,
        true
      );

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

      // Maghrib time (sunset, angle = 0.833 degrees)
      const maghribTime = this.getTimeByAngle(
        0.833,
        declination,
        latitude,
        midDay,
        false
      );

      // Isha time using angle
      const ishaTime = this.getTimeByAngle(
        params.ishaAngle,
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
      const nextFajrTime = this.getTimeByAngle(
        params.fajrAngle,
        nextSunPosition.declination,
        latitude,
        12 +
          timeZoneOffset -
          longitude / 15 -
          nextSunPosition.equationOfTime / 60,
        true
      );

      // Adjust nextFajrTime if needed
      const adjustedNextFajr =
        nextFajrTime < 0 ? nextFajrTime + 24 : nextFajrTime;
      const midnightTime = (maghribTime + adjustedNextFajr) / 2;
      const normalizedMidnight =
        midnightTime >= 24 ? midnightTime - 24 : midnightTime;

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
      console.error("Error in fallback prayer time calculation:", error);

      // Return default times if calculation fails
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

    let A = Math.floor(year / 100);
    let B = 2 - A + Math.floor(A / 4);

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

    let num = Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad);
    let den = Math.cos(latRad) * Math.cos(decRad);

    let cosAng = num / den;

    // Ensure cosine is within valid range [-1, 1]
    if (cosAng > 1) cosAng = 1;
    if (cosAng < -1) cosAng = -1;

    let time = (Math.acos(cosAng) * 180) / Math.PI / 15;

    // Before midday or after midday
    time = isBefore ? midDay - time : midDay + time;

    return time;
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
      console.warn("Invalid time value in formatTime:", time);
      return "00:00";
    }

    // Normalize time to 0-24 range
    while (time < 0) time += 24;
    while (time >= 24) time -= 24;

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
    const cacheKey = `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}`;
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

  // Central validation method
  private static isValidCoordinates(
    coordinates: any
  ): coordinates is Coordinates {
    if (!coordinates) {
      console.log("❌ Coordinate validation: null/undefined");
      return false;
    }
    if (typeof coordinates !== "object") {
      console.log("❌ Coordinate validation: not an object");
      return false;
    }
    if (!("latitude" in coordinates) || !("longitude" in coordinates)) {
      console.log("❌ Coordinate validation: missing lat/lng properties");
      return false;
    }
    if (
      typeof coordinates.latitude !== "number" ||
      typeof coordinates.longitude !== "number"
    ) {
      console.log("❌ Coordinate validation: lat/lng not numbers");
      return false;
    }
    if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
      console.log("❌ Coordinate validation: lat/lng are NaN");
      return false;
    }
    if (coordinates.latitude === 0 && coordinates.longitude === 0) {
      console.log("❌ Coordinate validation: 0,0 coordinates");
      return false;
    }
    if (coordinates.latitude < -90 || coordinates.latitude > 90) {
      console.log("❌ Coordinate validation: invalid latitude range");
      return false;
    }
    if (coordinates.longitude < -180 || coordinates.longitude > 180) {
      console.log("❌ Coordinate validation: invalid longitude range");
      return false;
    }
    return true;
  }
}

export default PrayerTimeService.getInstance();

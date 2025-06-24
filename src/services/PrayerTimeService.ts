import { format, parse, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { 
  PrayerTimes, 
  PrayerTime, 
  PrayerName, 
  Coordinates, 
  CalculationMethod,
  AladhanResponse 
} from '../types';

const ALADHAN_API_BASE = 'https://api.aladhan.com/v1';

const CALCULATION_METHOD_MAP: Record<CalculationMethod, number> = {
  'MWL': 3,
  'ISNA': 2,
  'Egypt': 5,
  'Makkah': 4,
  'Karachi': 1,
  'Tehran': 7,
  'Jafari': 0,
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
    method: CalculationMethod = 'MWL',
    asrJuristic: 'Standard' | 'Hanafi' = 'Standard'
  ): Promise<PrayerTimes> {
    const dateStr = format(date, 'dd-MM-yyyy');
    const cacheKey = `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}`;
    
    // Check cache first
    if (this.cachedTimes.has(cacheKey)) {
      return this.cachedTimes.get(cacheKey)!;
    }

    try {
      const methodId = CALCULATION_METHOD_MAP[method];
      const school = asrJuristic === 'Hanafi' ? 1 : 0;
      
      const url = `${ALADHAN_API_BASE}/timings/${dateStr}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&method=${methodId}&school=${school}`;
      
      const response = await fetch(url);
      const data: AladhanResponse = await response.json();
      
      if (data.code === 200 && data.data) {
        const times = data.data.timings;
        this.cachedTimes.set(cacheKey, times);
        
        // Cache for tomorrow as well if it's after Asr
        const now = new Date();
        const asrTime = this.parseTimeToDate(times.asr, date);
        if (isAfter(now, asrTime)) {
          this.fetchPrayerTimes(coordinates, addDays(date, 1), method, asrJuristic);
        }
        
        return times;
      } else {
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error);
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
    method: CalculationMethod = 'MWL',
    adjustments?: Record<PrayerName, number>
  ): Promise<PrayerTime[]> {
    const times = await this.fetchPrayerTimes(coordinates, date, method);
    const now = new Date();
    
    const prayerNames: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerTimesList: PrayerTime[] = [];
    let nextPrayerFound = false;

    for (const name of prayerNames) {
      const timeStr = times[name];
      let prayerDate = this.parseTimeToDate(timeStr, date);
      
      // Apply adjustments if provided
      if (adjustments && adjustments[name]) {
        prayerDate = new Date(prayerDate.getTime() + adjustments[name] * 60000);
      }

      const isNext = !nextPrayerFound && isAfter(prayerDate, now);
      if (isNext) nextPrayerFound = true;

      prayerTimesList.push({
        name,
        time: prayerDate,
        timestamp: prayerDate.getTime(),
        isNext
      });
    }

    // If no next prayer found today, mark Fajr as next
    if (!nextPrayerFound && prayerTimesList.length > 0) {
      // Get tomorrow's Fajr
      const tomorrowTimes = await this.fetchPrayerTimes(
        coordinates, 
        addDays(date, 1), 
        method
      );
      const tomorrowFajr = this.parseTimeToDate(tomorrowTimes.fajr, addDays(date, 1));
      
      prayerTimesList[0] = {
        ...prayerTimesList[0],
        time: tomorrowFajr,
        timestamp: tomorrowFajr.getTime(),
        isNext: true
      };
    }

    return prayerTimesList;
  }

  /**
   * Get the next prayer
   */
  async getNextPrayer(
    coordinates: Coordinates,
    method: CalculationMethod = 'MWL'
  ): Promise<PrayerTime | null> {
    const prayers = await this.getPrayerTimesList(coordinates, new Date(), method);
    return prayers.find(p => p.isNext) || null;
  }

  /**
   * Parse time string to Date object
   */
  private parseTimeToDate(timeStr: string, date: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Simple prayer time calculation as fallback
   * This is a simplified version - in production, use proper calculation
   */
  private calculatePrayerTimes(
    coordinates: Coordinates,
    date: Date,
    method: CalculationMethod
  ): PrayerTimes {
    // This is a placeholder - implement proper calculation
    // For MVP, we'll rely on API and show error if offline
    return {
      fajr: "05:00",
      sunrise: "06:30",
      dhuhr: "12:30",
      asr: "15:45",
      maghrib: "18:30",
      isha: "20:00",
      midnight: "00:00"
    };
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
    return format(date, use24Hour ? 'HH:mm' : 'h:mm a');
  }

  /**
   * Get prayer name in different languages
   */
  getPrayerDisplayName(
    prayer: PrayerName, 
    language: 'en' | 'ar' = 'en'
  ): string {
    const names = {
      en: {
        fajr: 'Fajr',
        dhuhr: 'Dhuhr',
        asr: 'Asr',
        maghrib: 'Maghrib',
        isha: 'Isha'
      },
      ar: {
        fajr: 'الفجر',
        dhuhr: 'الظهر',
        asr: 'العصر',
        maghrib: 'المغرب',
        isha: 'العشاء'
      }
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
    method: CalculationMethod = 'MWL'
  ): boolean {
    const dateStr = format(date, 'dd-MM-yyyy');
    const cacheKey = `${coordinates.latitude}-${coordinates.longitude}-${dateStr}-${method}`;
    return this.cachedTimes.has(cacheKey);
  }

  /**
   * Cache coordinates for a city/country combination to avoid repeated geocoding
   */
  cacheLocationCoordinates(cityCountry: string, coordinates: Coordinates): void {
    this.cachedLocations.set(cityCountry.toLowerCase(), coordinates);
  }

  /**
   * Check if we have cached coordinates for a city/country combination
   */
  getCachedLocationCoordinates(cityCountry: string): Coordinates | null {
    const coords = this.cachedLocations.get(cityCountry.toLowerCase());
    return coords || null;
  }
}

export default PrayerTimeService.getInstance();
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';
import { Location } from '../types';
import GeocodingService from './GeocodingService';
import StorageService from './StorageService';
import PrayerTimeService from './PrayerTimeService';

class LocationService {
  private static instance: LocationService;
  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions and get the current location
   */
  async getCurrentLocation(): Promise<Location | null> {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return null;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      // Reverse geocode to get city/country
      return this.reverseGeocodeCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Set location using city name and country
   */
  async setLocationByAddress(city: string, country: string): Promise<Location | null> {
    try {
      if (!city || !country) {
        console.warn('City and country are required');
        return null;
      }

      const locationQuery = `${city}, ${country}`;
      const location = await GeocodingService.geocodeAddress(locationQuery, country);
      
      if (location) {
        // Save to storage
        await this.saveLocation(location);
        return location;
      }
      
      console.warn(`Could not find location for: ${locationQuery}`);
      return null;
    } catch (error) {
      console.error('Error setting location by address:', error);
      return null;
    }
  }

  /**
   * Set location using postal/zip code
   */
  async setLocationByPostalCode(postalCode: string, countryCode: string): Promise<Location | null> {
    try {
      if (!postalCode || !countryCode) {
        console.warn('Postal code and country code are required');
        return null;
      }

      const location = await GeocodingService.geocodePostalCode(postalCode, countryCode);
      
      if (location) {
        // Save to storage
        await this.saveLocation(location);
        return location;
      }
      
      console.warn(`Could not find location for postal code: ${postalCode}`);
      return null;
    } catch (error) {
      console.error('Error setting location by postal code:', error);
      return null;
    }
  }

  /**
   * Get city and country from coordinates
   */
  async reverseGeocodeCoordinates(coordinates: { latitude: number, longitude: number }): Promise<Location | null> {
    // First try using GeocodingService
    try {
      const location = await GeocodingService.reverseGeocode(coordinates);
      
      if (location) {
        return location;
      }
    } catch (error) {
      console.warn('Nominatim reverse geocoding failed, falling back to Expo:', error);
    }
    
    // Fall back to Expo's reverse geocoding if Nominatim fails
    try {
      const geocode = await ExpoLocation.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      const place = geocode[0];
      
      if (place) {
        return {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          city: place.city || place.subregion || place.region || 'Unknown',
          country: place.country || 'Unknown',
          timezone: place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
    } catch (error) {
      console.error('Error with Expo reverse geocoding:', error);
    }
    
    // If all methods fail, return coordinates with unknown city/country
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: 'Unknown',
      country: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  /**
   * Save location to storage and refresh prayer times
   */
  async saveLocation(location: Location): Promise<void> {
    try {
      // Update settings with the new location
      const settings = StorageService.getUserSettings() || StorageService.getDefaultSettings();
      settings.location = location;
      StorageService.setUserSettings(settings);
      
      // Force refresh prayer times when location is changed
      await PrayerTimeService.clearCache(); // Clear the cached prayer times
      
      // Prefetch prayer times with the new location
      await PrayerTimeService.getPrayerTimesList(
        location,
        new Date(),
        settings.calculationMethod
      );
      
      console.log('Location updated and prayer times refreshed');
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }
  
  /**
   * Check if the app has a valid saved location
   */
  hasSavedLocation(): boolean {
    const settings = StorageService.getUserSettings();
    if (!settings || !settings.location) return false;
    
    const { latitude, longitude } = settings.location;
    return Boolean(latitude && longitude && (latitude !== 0 || longitude !== 0));
  }
}

export default LocationService.getInstance();

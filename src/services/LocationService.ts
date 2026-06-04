// src/services/LocationService.ts (FINAL ENHANCED VERSION)
import * as ExpoLocation from 'expo-location';
import { Location } from '../types';
import GeocodingService from './GeocodingService';
import StorageService from './StorageService';
import { useStore } from '../store/useStore';
import logger from '../utils/logger';
import { applyRegionalCalculationMethod } from '../utils/calculationMethodByRegion';

interface LocationUpdateCallback {
  onLocationUpdate: (location: Location) => Promise<void>;
}

class LocationService {
  private static instance: LocationService;
  
  // 🎯 Callback system for location updates (integrates with your architecture)
  private updateCallbacks: LocationUpdateCallback[] = [];
  
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // 🎯 Register callback for location updates (used by useServiceInitialization)
  registerLocationUpdateCallback(callback: LocationUpdateCallback) {
    if (!this.updateCallbacks.includes(callback)) {
      this.updateCallbacks.push(callback);
      logger.log('✅ Location update callback registered');
    } else {
      logger.log('⚠️ Location update callback already registered');
    }
  }

  unregisterLocationUpdateCallback(callback: LocationUpdateCallback) {
    if (this.updateCallbacks.includes(callback)) {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
      logger.log('🧹 Location update callback unregistered');
    } else {
      logger.log('⚠️ Location update callback not registered');
    }
  }

  // 🎯 Trigger all registered callbacks (automatic prayer time refresh)
  private async notifyLocationUpdate(location: Location) {
    logger.log('📡 Notifying location update to', this.updateCallbacks.length, 'callbacks');
    
    const promises = this.updateCallbacks.map(callback => 
      callback.onLocationUpdate(location).catch(error => {
        logger.error('❌ Location update callback failed:', error);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * 🎯 ENHANCED: Initialize location service
   */
  async initialize(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        logger.log('✅ Location permission already granted');
        return true;
      }
      
      logger.log('📍 Location service initialized');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize location service:', error);
      return false;
    }
  }

  /**
   * 🎯 ENHANCED: Get current location with better error handling
   */
  async getCurrentLocation(options?: { requestPermission?: boolean }): Promise<Location | null> {
    try {
      const shouldRequestPermission = options?.requestPermission !== false;

      if (shouldRequestPermission) {
        logger.log('📍 Requesting location permission...');
      }

      const permission = shouldRequestPermission
        ? await ExpoLocation.requestForegroundPermissionsAsync()
        : await ExpoLocation.getForegroundPermissionsAsync();

      const { status } = permission;
      if (status !== 'granted') {
        logger.log('❌ Location permission denied');
        return null;
      }

      logger.log('✅ Location permission granted, getting position...');
      
      // 🎯 ENHANCED: Better location options
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 100, // 100 meters
      });

      logger.log('📍 Got coordinates:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy
      });

      // Reverse geocode to get city/country
      const enrichedLocation = await this.reverseGeocodeCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (enrichedLocation) {
        logger.log('✅ Location enriched with city/country:', {
          city: enrichedLocation.city,
          country: enrichedLocation.country
        });
      }

      return enrichedLocation;
    } catch (error) {
      logger.error('❌ Error getting current location:', error);

      // 🎯 ENHANCED: Specific error messages
      const errorCode = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : null;

      if (errorCode === 'E_LOCATION_SERVICES_DISABLED') {
        throw new Error('Location services are disabled. Please enable them in your device settings.');
      } else if (errorCode === 'E_LOCATION_TIMEOUT') {
        throw new Error('Location request timed out. Please try again.');
      } else if (errorCode === 'E_LOCATION_UNAVAILABLE') {
        throw new Error('Location is currently unavailable. Please try again later.');
      }
      
      throw new Error('Failed to get your location. Please check your location settings.');
    }
  }

  /**
   * 🎯 ENHANCED: Set location by address with better validation
   */
  async setLocationByAddress(city: string, country: string): Promise<Location | null> {
    try {
      if (!city || !country) {
        logger.warn('❌ City and country are required');
        return null;
      }

      logger.log('🔍 Geocoding address provided by user');
      
      const locationQuery = `${city}, ${country}`;
      const location = await GeocodingService.geocodeAddress(locationQuery, country);
      
      if (location) {
        logger.log(`✅ Address geocoded successfully to ${location.city || 'Unknown city'}, ${location.country || 'Unknown country'}`);
        
        // 🎯 Save and notify (automatic prayer time refresh)
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      logger.warn('❌ Could not find location for the provided address');
      return null;
    } catch (error) {
      logger.error('❌ Error setting location by address:', error);
      throw new Error('Failed to find that location. Please check the spelling or choose the nearest major city.');
    }
  }

  /**
   * 🎯 NEW: Set location using postal/zip code
   */
  async setLocationByPostalCode(postalCode: string, countryCode: string): Promise<Location | null> {
    try {
      if (!postalCode || !countryCode) {
        logger.warn('❌ Postal code and country code are required');
        return null;
      }

      logger.log('🔍 Geocoding postal code provided by user');

      const location = await GeocodingService.geocodePostalCode(postalCode, countryCode);
      
      if (location) {
        logger.log(`✅ Postal code geocoded successfully to ${location.city || 'Unknown city'}, ${location.country || 'Unknown country'}`);
        
        // 🎯 Save and notify (automatic prayer time refresh)
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      logger.warn('❌ Could not find location for the provided postal code');
      return null;
    } catch (error) {
      logger.error('❌ Error setting location by postal code:', error);
      throw new Error('Failed to find that postal code. Please check the code or choose the nearest major city.');
    }
  }

  /**
   * 🎯 ENHANCED: Reverse geocoding with fallbacks
   */
  async reverseGeocodeCoordinates(coordinates: { latitude: number, longitude: number }): Promise<Location | null> {
    logger.log('🔄 Reverse geocoding coordinates:', coordinates);
    
      // First try using GeocodingService (edge API or direct fallback)
      try {
        const location = await GeocodingService.reverseGeocode(coordinates);
      
      if (location) {
        logger.log('✅ Reverse geocoding successful:', {
          city: location.city,
          country: location.country,
          source: GeocodingService.getLastSource(),
        });
        return location;
      }
    } catch (error) {
      logger.warn('⚠️ Nominatim reverse geocoding failed, falling back to Expo:', error);
    }
    
    // 🎯 SMART FALLBACK: Expo's reverse geocoding
    try {
      const geocode = await ExpoLocation.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      const place = geocode[0];
      
      if (place) {
        const location = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          city: place.city || place.subregion || place.region || 'Unknown',
          country: place.country || 'Unknown',
          // Expo returns ISO 3166-1 alpha-2 (e.g. "BD") — already uppercased.
          // Keeps the new region-based calc-method resolution working even
          // when the edge API path failed.
          countryCode: place.isoCountryCode ?? undefined,
          timezone: place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        logger.log('✅ Expo reverse geocoding successful:', {
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
        });

        return location;
      }
    } catch (error) {
      logger.error('❌ Error with Expo reverse geocoding:', error);
    }
    
    // 🎯 GRACEFUL DEGRADATION: Unknown location
    logger.warn('⚠️ All reverse geocoding methods failed, using unknown city/country');
    
    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: 'Unknown',
      country: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  // 🎯 CLEAN ARCHITECTURE: Save and notify through callback system
  private async saveLocationAndNotify(location: Location): Promise<void> {
    try {
      logger.log('💾 Saving location and notifying callbacks...');
      
      // Update settings with the new location
      const settings = StorageService.getUserSettings() || StorageService.getDefaultSettings();
      const { settings: updatedSettings } = applyRegionalCalculationMethod(settings, location);
      useStore.getState().setUserSettings(updatedSettings);
      
      logger.log('✅ Location saved to storage');
      
      // 🎯 AUTOMATIC UPDATES: Notify callbacks (triggers prayer time refresh)
      await this.notifyLocationUpdate(location);
      
      logger.log('✅ Location update notifications sent');
    } catch (error) {
      logger.error('❌ Error saving location:', error);
      throw error;
    }
  }

  // 🎯 BACKWARD COMPATIBILITY: Keep existing method
  async saveLocation(location: Location): Promise<void> {
    await this.saveLocationAndNotify(location);
  }
  
  /**
   * 🎯 VALIDATION: Check if app has valid saved location
   */
  hasSavedLocation(): boolean {
    const settings = StorageService.getUserSettings();
    if (!settings || !settings.location) return false;
    
    const { latitude, longitude } = settings.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
    if (latitude === 0 && longitude === 0) return false;
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    return true;
  }

  // 🎯 NEW: Get current saved location
  getCurrentSavedLocation(): Location | null {
    const settings = StorageService.getUserSettings();
    if (!settings || !settings.location) return null;
    
    const { latitude, longitude } = settings.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return null;
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    if (latitude === 0 && longitude === 0) {
      return null;
    }
    if (latitude < -90 || latitude > 90) return null;
    if (longitude < -180 || longitude > 180) return null;
    
    return settings.location;
  }

  // 🎯 NEW: Validate location coordinates
  isValidLocation(location: Location | null): boolean {
    if (!location) return false;
    
    const { latitude, longitude } = location;
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    if (latitude < -90 || latitude > 90) return false;
    if (longitude < -180 || longitude > 180) return false;
    if (latitude === 0 && longitude === 0) return false;
    
    return true;
  }

  // 🎯 NEW: Get location service status
  async getLocationAccuracy(): Promise<{ hasPermission: boolean; servicesEnabled: boolean }> {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      const servicesEnabled = await ExpoLocation.hasServicesEnabledAsync();
      
      return {
        hasPermission: status === 'granted',
        servicesEnabled,
      };
    } catch (error) {
      logger.error('❌ Error checking location accuracy:', error);
      return { hasPermission: false, servicesEnabled: false };
    }
  }

  // 🎯 NEW: Force refresh current location
  async refreshCurrentLocation(): Promise<Location | null> {
    try {
      logger.log('🔄 Force refreshing current location...');
      
      const location = await this.getCurrentLocation();
      
      if (location) {
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Error refreshing current location:', error);
      throw error;
    }
  }

  // 🎯 CLEANUP
  cleanup() {
    this.updateCallbacks = [];
    logger.log('🧹 LocationService cleaned up');
  }
}

export default LocationService.getInstance();

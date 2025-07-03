// src/services/LocationService.ts (FINAL ENHANCED VERSION)
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';
import { Location } from '../types';
import GeocodingService from './GeocodingService';
import StorageService from './StorageService';

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
      console.log('✅ Location update callback registered');
    } else {
      console.log('⚠️ Location update callback already registered');
    }
  }

  unregisterLocationUpdateCallback(callback: LocationUpdateCallback) {
    if (this.updateCallbacks.includes(callback)) {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
      console.log('🧹 Location update callback unregistered');
    } else {
      console.log('⚠️ Location update callback not registered');
    }
  }

  // 🎯 Trigger all registered callbacks (automatic prayer time refresh)
  private async notifyLocationUpdate(location: Location) {
    console.log('📡 Notifying location update to', this.updateCallbacks.length, 'callbacks');
    
    const promises = this.updateCallbacks.map(callback => 
      callback.onLocationUpdate(location).catch(error => {
        console.error('❌ Location update callback failed:', error);
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
        console.log('✅ Location permission already granted');
        return true;
      }
      
      console.log('📍 Location service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize location service:', error);
      return false;
    }
  }

  /**
   * 🎯 ENHANCED: Get current location with better error handling
   */
  async getCurrentLocation(): Promise<Location | null> {
    try {
      console.log('📍 Requesting location permission...');
      
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        return null;
      }

      console.log('✅ Location permission granted, getting position...');
      
      // 🎯 ENHANCED: Better location options
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 100, // 100 meters
      });

      console.log('📍 Got coordinates:', {
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
        console.log('✅ Location enriched with city/country:', {
          city: enrichedLocation.city,
          country: enrichedLocation.country
        });
      }

      return enrichedLocation;
    } catch (error: any) {
      console.error('❌ Error getting current location:', error);
      
      // 🎯 ENHANCED: Specific error messages
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        throw new Error('Location services are disabled. Please enable them in your device settings.');
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        throw new Error('Location request timed out. Please try again.');
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
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
        console.warn('❌ City and country are required');
        return null;
      }

      console.log('🔍 Geocoding address:', { city, country });
      
      const locationQuery = `${city}, ${country}`;
      const location = await GeocodingService.geocodeAddress(locationQuery, country);
      
      if (location) {
        console.log('✅ Address geocoded successfully:', {
          query: locationQuery,
          result: { lat: location.latitude, lng: location.longitude }
        });
        
        // 🎯 Save and notify (automatic prayer time refresh)
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      console.warn('❌ Could not find location for:', locationQuery);
      return null;
    } catch (error) {
      console.error('❌ Error setting location by address:', error);
      throw new Error(`Failed to find location for "${city}, ${country}". Please check your spelling or try a different format.`);
    }
  }

  /**
   * 🎯 NEW: Set location using postal/zip code
   */
  async setLocationByPostalCode(postalCode: string, countryCode: string): Promise<Location | null> {
    try {
      if (!postalCode || !countryCode) {
        console.warn('❌ Postal code and country code are required');
        return null;
      }

      console.log('🔍 Geocoding postal code:', { postalCode, countryCode });

      const location = await GeocodingService.geocodePostalCode(postalCode, countryCode);
      
      if (location) {
        console.log('✅ Postal code geocoded successfully:', {
          postalCode,
          result: { lat: location.latitude, lng: location.longitude }
        });
        
        // 🎯 Save and notify (automatic prayer time refresh)
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      console.warn('❌ Could not find location for postal code:', postalCode);
      return null;
    } catch (error) {
      console.error('❌ Error setting location by postal code:', error);
      throw new Error(`Failed to find location for postal code "${postalCode}". Please check the code and country.`);
    }
  }

  /**
   * 🎯 ENHANCED: Reverse geocoding with fallbacks
   */
  async reverseGeocodeCoordinates(coordinates: { latitude: number, longitude: number }): Promise<Location | null> {
    console.log('🔄 Reverse geocoding coordinates:', coordinates);
    
    // First try using GeocodingService (Nominatim)
    try {
      const location = await GeocodingService.reverseGeocode(coordinates);
      
      if (location) {
        console.log('✅ Nominatim reverse geocoding successful:', {
          city: location.city,
          country: location.country
        });
        return location;
      }
    } catch (error) {
      console.warn('⚠️ Nominatim reverse geocoding failed, falling back to Expo:', error);
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
          timezone: place.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        
        console.log('✅ Expo reverse geocoding successful:', {
          city: location.city,
          country: location.country
        });
        
        return location;
      }
    } catch (error) {
      console.error('❌ Error with Expo reverse geocoding:', error);
    }
    
    // 🎯 GRACEFUL DEGRADATION: Unknown location
    console.warn('⚠️ All reverse geocoding methods failed, using unknown city/country');
    
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
      console.log('💾 Saving location and notifying callbacks...');
      
      // Update settings with the new location
      const settings = StorageService.getUserSettings() || StorageService.getDefaultSettings();
      settings.location = location;
      StorageService.setUserSettings(settings);
      
      console.log('✅ Location saved to storage');
      
      // 🎯 AUTOMATIC UPDATES: Notify callbacks (triggers prayer time refresh)
      await this.notifyLocationUpdate(location);
      
      console.log('✅ Location update notifications sent');
    } catch (error) {
      console.error('❌ Error saving location:', error);
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
    return Boolean(latitude && longitude && (latitude !== 0 || longitude !== 0));
  }

  // 🎯 NEW: Get current saved location
  getCurrentSavedLocation(): Location | null {
    const settings = StorageService.getUserSettings();
    if (!settings || !settings.location) return null;
    
    const { latitude, longitude } = settings.location;
    if (!latitude || !longitude || (latitude === 0 && longitude === 0)) {
      return null;
    }
    
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
      console.error('❌ Error checking location accuracy:', error);
      return { hasPermission: false, servicesEnabled: false };
    }
  }

  // 🎯 NEW: Force refresh current location
  async refreshCurrentLocation(): Promise<Location | null> {
    try {
      console.log('🔄 Force refreshing current location...');
      
      const location = await this.getCurrentLocation();
      
      if (location) {
        await this.saveLocationAndNotify(location);
        return location;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error refreshing current location:', error);
      throw error;
    }
  }

  // 🎯 CLEANUP
  cleanup() {
    this.updateCallbacks = [];
    console.log('🧹 LocationService cleaned up');
  }
}

export default LocationService.getInstance();
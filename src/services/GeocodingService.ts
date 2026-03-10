import { Coordinates, Location } from '../types';
import logger from '../utils/logger';
import { fetchWithTimeout, describeNetworkError } from '../utils/networkRequest';
import { geocodeAddressFromEdge, reverseGeocodeFromEdge } from './api/EdgeApiClient';

const NOMINATIM_API_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Sukoon'; // Nominatim requires a user agent
const GEOCODING_TIMEOUT_MS = 8000;

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

class GeocodingService {
  private static instance: GeocodingService;
  private cachedLocations: Map<string, Location> = new Map();
  
  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Geocode an address or location name to coordinates
   * @param query Address, city name, postal code, or any location identifier
   * @param countryCode Optional ISO 3166-1alpha2 country code to limit search
   */
  async geocodeAddress(query: string, countryCode?: string): Promise<Location | null> {
    try {
      // Check cache first
      const cacheKey = `${query}-${countryCode || ''}`.toLowerCase();
      if (this.cachedLocations.has(cacheKey)) {
        logger.log('Returning cached location for geocoding request');
        return this.cachedLocations.get(cacheKey)!;
      }

      try {
        const edgeLocation = await geocodeAddressFromEdge(query, countryCode);
        if (edgeLocation) {
          this.cachedLocations.set(cacheKey, edgeLocation);
          return edgeLocation;
        }
      } catch (edgeError) {
        logger.warn('Edge geocoding unavailable, falling back to direct provider:', describeNetworkError(edgeError));
      }

      // Prepare query parameters
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        addressdetails: '1',
      });

      // Add country code if provided
      if (countryCode && countryCode.trim().length === 2) {
        params.append('countrycodes', countryCode);
      }

      // Call Nominatim API
      logger.log('Geocoding location query via Nominatim');
      const url = `${NOMINATIM_API_BASE}/search?${params.toString()}`;
      
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }, GEOCODING_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Nominatim API responded with status: ${response.status}`);
      }

      const data = await response.json() as NominatimResponse[];
      
      if (!data || data.length === 0) {
        logger.warn('No location found for geocoding query');
        return null;
      }

      const result = data[0];
      
      // Extract city and country from address
      const city = result.address.city || 
                  result.address.town || 
                  result.address.village || 
                  result.address.municipality || 
                  result.address.suburb ||
                  '';
                  
      const country = result.address.country || '';
      
      // Create location object
      const location: Location = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        city,
        country
      };
      
      // Cache the result
      this.cachedLocations.set(cacheKey, location);
      
      logger.log(`Geocoded location to ${city || 'Unknown city'}, ${country || 'Unknown country'}`);
      return location;
    } catch (error) {
      logger.error('Error geocoding address:', describeNetworkError(error));
      return null;
    }
  }

  /**
   * Geocode by postal/zip code
   * @param postalCode Postal or zip code
   * @param countryCode ISO 3166-1alpha2 country code
   */
  async geocodePostalCode(postalCode: string, countryCode: string): Promise<Location | null> {
    // For postal codes, we should specify the country code for better results
    return this.geocodeAddress(`${postalCode}, ${countryCode}`, countryCode);
  }
  
  /**
   * Reverse geocode coordinates to address
   * @param coordinates Latitude and longitude
   */
  async reverseGeocode(coordinates: Coordinates): Promise<Location | null> {
    try {
      const { latitude, longitude } = coordinates;
      
      // Check cache first
      const cacheKey = `${latitude}-${longitude}`.toLowerCase();
      if (this.cachedLocations.has(cacheKey)) {
        return this.cachedLocations.get(cacheKey)!;
      }

      try {
        const edgeLocation = await reverseGeocodeFromEdge(coordinates);
        if (edgeLocation) {
          this.cachedLocations.set(cacheKey, edgeLocation);
          return edgeLocation;
        }
      } catch (edgeError) {
        logger.warn('Edge reverse geocoding unavailable, falling back to direct provider:', describeNetworkError(edgeError));
      }

      // Call Nominatim API for reverse geocoding
      logger.log('Reverse geocoding device coordinates');
      const url = `${NOMINATIM_API_BASE}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
      
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }, GEOCODING_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`Nominatim API responded with status: ${response.status}`);
      }

      const result = await response.json() as NominatimResponse;
      
      if (!result) {
        logger.warn('No address found for reverse geocoding request');
        return null;
      }

      // Extract city and country from address
      const city = result.address.city || 
                  result.address.town || 
                  result.address.village || 
                  result.address.municipality || 
                  result.address.suburb ||
                  '';
                  
      const country = result.address.country || '';
      
      // Create location object
      const location: Location = {
        latitude,
        longitude,
        city,
        country
      };
      
      // Cache the result
      this.cachedLocations.set(cacheKey, location);
      
      return location;
    } catch (error) {
      logger.error('Error reverse geocoding:', describeNetworkError(error));
      return null;
    }
  }

  /**
   * Clear all cached locations
   */
  clearCache(): void {
    this.cachedLocations.clear();
  }
}

export default GeocodingService.getInstance();

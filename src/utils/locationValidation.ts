import { Coordinates } from '../types';

/**
 * Central coordinate validation utility.
 * Returns true if the coordinates object is valid and usable for prayer time calculations.
 */
export function isValidCoordinates(
  coordinates: unknown
): coordinates is Coordinates {
  if (!coordinates) return false;
  if (typeof coordinates !== 'object') return false;
  if (!('latitude' in coordinates) || !('longitude' in coordinates)) return false;
  if (
    typeof coordinates.latitude !== 'number' ||
    typeof coordinates.longitude !== 'number'
  ) return false;
  if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) return false;
  if (coordinates.latitude === 0 && coordinates.longitude === 0) return false;
  if (coordinates.latitude < -90 || coordinates.latitude > 90) return false;
  if (coordinates.longitude < -180 || coordinates.longitude > 180) return false;
  return true;
}

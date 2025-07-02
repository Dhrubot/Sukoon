import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Location } from '../types';

export const useValidLocation = (): Location | null => {
  const { location } = useStore();
  
  return useMemo(() => {
    if (!location) {
      console.log('⏳ useValidLocation: No location in store');
      return null;
    }
    
    if (!location.latitude || !location.longitude) {
      console.log('⏳ useValidLocation: Missing latitude/longitude');
      return null;
    }
    
    if (location.latitude === 0 && location.longitude === 0) {
      console.log('⏳ useValidLocation: Invalid 0,0 coordinates');
      return null;
    }
    
    if (location.latitude < -90 || location.latitude > 90) {
      console.log('⏳ useValidLocation: Invalid latitude range');
      return null;
    }
    
    if (location.longitude < -180 || location.longitude > 180) {
      console.log('⏳ useValidLocation: Invalid longitude range');
      return null;
    }
    
    console.log('✅ useValidLocation: Valid location available');
    return location;
  }, [location]);
};
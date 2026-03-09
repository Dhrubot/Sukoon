import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Location } from '../types';
import logger from '../utils/logger';

export const useValidLocation = (): Location | null => {
  const { location } = useStore();
  
  return useMemo(() => {
    if (!location) {
      logger.log('⏳ useValidLocation: No location in store');
      return null;
    }
    
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      logger.log('⏳ useValidLocation: Missing latitude/longitude');
      return null;
    }

    if (Number.isNaN(location.latitude) || Number.isNaN(location.longitude)) {
      logger.log('⏳ useValidLocation: Missing latitude/longitude');
      return null;
    }
    
    if (location.latitude === 0 && location.longitude === 0) {
      logger.log('⏳ useValidLocation: Invalid 0,0 coordinates');
      return null;
    }
    
    if (location.latitude < -90 || location.latitude > 90) {
      logger.log('⏳ useValidLocation: Invalid latitude range');
      return null;
    }
    
    if (location.longitude < -180 || location.longitude > 180) {
      logger.log('⏳ useValidLocation: Invalid longitude range');
      return null;
    }
    
    logger.log('✅ useValidLocation: Valid location available');
    return location;
  }, [location]);
};
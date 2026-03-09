// src/hooks/useReflectionGarden.ts
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ReflectionGardenService from '../services/ReflectionGardenService';
import { GardenData } from '../types/garden';
import logger from '../utils/logger';

const EMPTY_GARDEN: GardenData = {
  plants: [],
  weekSummary: [],
  recentReflections: [],
  totalPlants: 0,
  newBlooms: 0,
  isEmpty: true,
};

export const useReflectionGarden = (days: number = 28) => {
  const [gardenData, setGardenData] = useState<GardenData>(EMPTY_GARDEN);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      try {
        const data = ReflectionGardenService.getGardenData(days);
        setGardenData(data);
      } catch (error) {
        logger.error('Error loading garden data:', error);
      } finally {
        setIsLoading(false);
      }
    }, [days])
  );

  return {
    ...gardenData,
    isLoading,
  };
};

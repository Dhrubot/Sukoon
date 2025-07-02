// src/hooks/useLocationSetup.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import LocationService from '../services/LocationService';
import { useStore } from '../store/useStore';
import StorageService from '../services/StorageService';

export const useLocationSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    city: '',
    country: '',
    postalCode: '',
  });
  const [error, setError] = useState('');

  const { userSettings, setUserSettings, setLocation } = useStore();

  const handleManualLocation = async () => {
    const { city, country, postalCode } = formData;

    if (!city && !postalCode) {
      setError('Please enter either a city name or postal code');
      return;
    }

    if (!country) {
      setError('Please enter a country');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use location service to geocode based on what the user provided
      const { city, country, postalCode } = formData;
      let locationData;

      if (city) {
        locationData = await LocationService.setLocationByAddress(city, country);
      } else {
        locationData = await LocationService.setLocationByPostalCode(postalCode, country);
      }

      if (locationData && userSettings) {
        const newLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city || city,
          country: locationData.country || country,
        };

        const updatedSettings = {
          ...userSettings,
          location: newLocation,
        };

        StorageService.setUserSettings(updatedSettings);
        setUserSettings(updatedSettings);
        setLocation(newLocation);

        Alert.alert('Success', 'Location has been set successfully!');
        return true;
      } else {
        setError('Could not find location. Please check your input.');
        return false;
      }
    } catch (error) {
      console.error('Manual location error:', error);
      setError('Failed to set location. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user types
  };

  const resetForm = () => {
    setFormData({ city: '', country: '', postalCode: '' });
    setError('');
    setIsLoading(false);
  };

  return {
    formData,
    error,
    isLoading,
    handleManualLocation,
    updateFormData,
    resetForm,
  };
};
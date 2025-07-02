// src/screens/Settings/components/LocationSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { UserSettings } from '../../../types';

interface LocationSectionProps {
  userSettings: UserSettings;
  isUpdatingLocation: boolean;
  onUpdateLocation: () => void;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  userSettings,
  isUpdatingLocation,
  onUpdateLocation,
}) => (
  <SettingSection title="Location">
    <View style={styles.locationInfo}>
      <Text style={styles.locationText}>
        {userSettings.location.city || 'Unknown City'}, {userSettings.location.country || 'Unknown Country'}
      </Text>
      <Text style={styles.coordinatesText}>
        {userSettings.location.latitude.toFixed(4)}°, {userSettings.location.longitude.toFixed(4)}°
      </Text>
    </View>

    <TouchableOpacity 
      style={[styles.button, isUpdatingLocation && styles.buttonDisabled]}
      onPress={onUpdateLocation}
      disabled={isUpdatingLocation}
    >
      <Text style={styles.buttonText}>
        {isUpdatingLocation ? 'Updating...' : 'Update Location'}
      </Text>
    </TouchableOpacity>
  </SettingSection>
);

const styles = StyleSheet.create({
  locationInfo: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: '#212121',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#757575',
  },
  button: {
    backgroundColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
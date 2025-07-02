// src/screens/Settings/components/LocationSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { UserSettings } from '../../../types';

interface LocationSectionProps {
  userSettings: UserSettings;
  isUpdatingLocation: boolean;
  onUpdateLocation: () => Promise<void>;
  onSelectManually?: () => void;
  hasValidLocation?: boolean;
}

export const LocationSection: React.FC<LocationSectionProps> = ({
  userSettings,
  isUpdatingLocation,
  onUpdateLocation,
  onSelectManually,
  hasValidLocation = true,
}) => (
  <SettingSection title="Location">
    <View style={styles.locationInfo}>
      <Text style={styles.locationText}>
        {userSettings.location.city || 'Unknown City'}, {userSettings.location.country || 'Unknown Country'}
      </Text>
      <Text style={[styles.coordinatesText, !hasValidLocation && styles.invalidText]}>
        {userSettings.location.latitude.toFixed(4)}°, {userSettings.location.longitude.toFixed(4)}°
        {!hasValidLocation && ' (Invalid location)'}
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

    {onSelectManually && (
      <TouchableOpacity 
        style={[styles.manualButton, isUpdatingLocation && styles.buttonDisabled]}
        onPress={onSelectManually}
        disabled={isUpdatingLocation}
      >
        <Text style={styles.manualButtonText}>Select Location Manually</Text>
      </TouchableOpacity>
    )}
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
  invalidText: {
    color: '#DC3545',
  },
  button: {
    backgroundColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manualButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E3F',
  }
});
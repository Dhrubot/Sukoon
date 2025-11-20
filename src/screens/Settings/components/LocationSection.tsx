// src/screens/Settings/components/LocationSection.tsx - FIXED VERSION
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
}) => {
  // 🔧 FIX: Check if location is actually valid
  const isLocationSet = hasValidLocation && 
    userSettings.location.latitude !== 0 && 
    userSettings.location.longitude !== 0;

  return (
    <SettingSection title="Location">
      <View style={styles.locationInfo}>
        {isLocationSet ? (
          <>
            <Text style={styles.locationText}>
              {userSettings.location.city || 'Unknown City'}, {userSettings.location.country || 'Unknown Country'}
            </Text>
            <Text style={styles.coordinatesText}>
              {userSettings.location.latitude.toFixed(4)}°, {userSettings.location.longitude.toFixed(4)}°
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.locationText}>
              📍 Location Not Set
            </Text>
            <Text style={styles.invalidText}>
              Please set your location to calculate accurate prayer times
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, isUpdatingLocation && styles.buttonDisabled]}
        onPress={onUpdateLocation}
        disabled={isUpdatingLocation}
      >
        <Text style={styles.buttonText}>
          {isUpdatingLocation ? '⏳ Updating...' : isLocationSet ? '🔄 Update Location' : '📍 Set Location'}
        </Text>
      </TouchableOpacity>

      {onSelectManually && (
        <TouchableOpacity 
          style={[styles.manualButton, isUpdatingLocation && styles.buttonDisabled]}
          onPress={onSelectManually}
          disabled={isUpdatingLocation}
        >
          <Text style={styles.manualButtonText}>
            🗺️ Select Location Manually
          </Text>
        </TouchableOpacity>
      )}

      {/* 🆕 NEW: Location status indicator */}
      {!isLocationSet && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Prayer times cannot be calculated without a valid location
          </Text>
        </View>
      )}
    </SettingSection>
  );
};

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
    fontWeight: '500',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#757575',
  },
  invalidText: {
    fontSize: 14,
    color: '#DC3545',
    fontStyle: 'italic',
    marginTop: 4,
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
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 18,
  },
});
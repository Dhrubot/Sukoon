// src/screens/Settings/components/LocationSection.tsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { UserSettings } from '../../../types';
import LocationService from '../../../services/LocationService';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

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
  const styles = useThemedStyles(createStyles);
  const [locationStatus, setLocationStatus] = useState<{ hasPermission: boolean; servicesEnabled: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    LocationService.getLocationAccuracy().then((status) => {
      if (mounted) setLocationStatus(status);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
      return;
    }
    Linking.openSettings();
  };

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

      {!!locationStatus && (!locationStatus.hasPermission || !locationStatus.servicesEnabled) && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {!locationStatus.hasPermission
              ? '⚠️ Location permission is blocked in system settings'
              : '⚠️ Location services are disabled on your device'}
          </Text>
          <TouchableOpacity style={styles.settingsLink} onPress={openAppSettings}>
            <Text style={styles.settingsLinkText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SettingSection>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  locationInfo: {
    backgroundColor: theme.colors.settings.optionBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.settings.labelPrimary,
    fontWeight: '500',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    color: theme.colors.settings.labelSecondary,
  },
  invalidText: {
    fontSize: 14,
    color: theme.colors.status.error,
    fontStyle: 'italic',
    marginTop: 4,
  },
  button: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
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
    color: theme.colors.settings.buttonPrimaryText,
  },
  manualButton: {
    backgroundColor: theme.colors.settings.sectionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.buttonSecondaryBorder,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.buttonSecondaryText,
  },
  warningBox: {
    backgroundColor: theme.colors.settings.warningBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.settings.warningBorder,
  },
  warningText: {
    fontSize: 13,
    color: theme.colors.settings.warningText,
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  settingsLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
});
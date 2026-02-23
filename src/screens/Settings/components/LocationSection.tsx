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
          {isUpdatingLocation ? '⏳ Updating...' : isLocationSet ? 'Update Location' : '📍 Set Location'}
        </Text>
      </TouchableOpacity>

      {onSelectManually && (
        <TouchableOpacity 
          style={[styles.manualButton, isUpdatingLocation && styles.buttonDisabled]}
          onPress={onSelectManually}
          disabled={isUpdatingLocation}
        >
          <Text style={styles.manualButtonText}>
            Select Location Manually
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
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.lg,
  },
  locationText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.settings.labelPrimary,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    marginBottom: theme.spacing.xs,
  },
  coordinatesText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.labelSecondary,
  },
  invalidText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.status.error,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  button: {
    backgroundColor: theme.colors.settings.buttonPrimaryBg,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.buttonPrimaryText,
  },
  manualButton: {
    backgroundColor: theme.colors.settings.sectionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.buttonSecondaryBorder,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.settings.buttonSecondaryText,
  },
  warningBox: {
    backgroundColor: theme.colors.settings.warningBg,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.settings.warningBorder,
  },
  warningText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.warningText,
    textAlign: 'center',
    lineHeight: 18,
  },
  settingsLink: {
    marginTop: theme.spacing.md - 2,
    alignItems: 'center',
  },
  settingsLinkText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
  },
});
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import AnalyticsService from '../../services/AnalyticsService';
import StorageService from '../../services/StorageService';
import { useStore } from '../../store/useStore';
import logger from '../../utils/logger';
import LocationService from '../../services/LocationService';
import NotificationService from '../../services/NotificationService';
import type { NotificationReadiness } from '../../services/NotificationService';
import { normalizeNotificationSettings } from '../../services/notifications/notificationSettingsState';
import { Location as AppLocation } from '../../types';
import { LocationModal } from '../../components/LocationModal';
import { applyRegionalCalculationMethod } from '../../utils/calculationMethodByRegion';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OnboardingWelcomeStep } from '../../components/onboarding/OnboardingWelcomeStep';
import { OnboardingLocationStep } from '../../components/onboarding/OnboardingLocationStep';
import { OnboardingNotificationStep } from '../../components/onboarding/OnboardingNotificationStep';
import { OnboardingReadyStep } from '../../components/onboarding/OnboardingReadyStep';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'location' | 'notifications' | 'done';
type LocationFailureReason = 'none' | 'permission_denied' | 'permission_blocked' | 'gps_failed';

const STEP_ORDER: OnboardingStep[] = ['welcome', 'location', 'notifications', 'done'];
const MOSQUE_MODE_TIP_SEEN_KEY = 'mosque_mode_tip_seen';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [locationData, setLocationData] = useState<AppLocation | null>(null);
  const [wantsPrayerReminders, setWantsPrayerReminders] = useState(false);
  const [notificationReadiness, setNotificationReadiness] = useState<NotificationReadiness>({
    permissionStatus: 'undetermined' as NotificationReadiness['permissionStatus'],
    exactAlarmStatus: 'not_applicable',
    isReady: false,
    coreNotificationReady: false,
    exactAlarmReady: true,
    fullAdhanReady: true,
    blockedReason: null,
  });
  const [isRequestingNotifications, setIsRequestingNotifications] = useState(false);
  const [asrJuristic, setAsrJuristic] = useState<'Standard' | 'Hanafi'>('Standard');
  const [displayName, setDisplayName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [locationFailureReason, setLocationFailureReason] = useState<LocationFailureReason>('none');
  const [showManualLocationSheet, setShowManualLocationSheet] = useState(false);

  const { setUserSettings } = useStore();

  const getProgress = () => (STEP_ORDER.indexOf(currentStep) + 1) / STEP_ORDER.length;
  const buildOnboardingSettings = () => {
    const baseSettings = StorageService.getDefaultSettings();
    return {
      ...baseSettings,
      notifications: {
        ...baseSettings.notifications,
        enabled: true,
      },
      location: locationData ?? baseSettings.location,
    };
  };

  useEffect(() => {
    if (currentStep !== 'notifications') return;

    let cancelled = false;
    void (async () => {
      const readiness = await NotificationService.getNotificationReadiness(buildOnboardingSettings());
      if (cancelled) return;
      setNotificationReadiness(readiness);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStep, locationData]);

  const requestLocationPermission = async () => {
    setIsLocating(true);
    setLocationFailed(false);
    setLocationFailureReason('none');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationFailed(true);
        setLocationFailureReason(permission.canAskAgain ? 'permission_denied' : 'permission_blocked');
        return;
      }

      const location = await LocationService.getCurrentLocation({ requestPermission: false });
      if (!location) {
        setLocationFailed(true);
        setLocationFailureReason('gps_failed');
        return;
      }

      setLocationData(location);
      setCurrentStep('notifications');
    } catch (error) {
      logger.log('Onboarding location error:', error);
      setLocationFailed(true);
      setLocationFailureReason('gps_failed');
    } finally {
      setIsLocating(false);
    }
  };

  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      logger.warn('Unable to open app settings:', error);
    }
  };

  const requestNotificationPermission = async () => {
    setIsRequestingNotifications(true);
    try {
      await NotificationService.requestNotificationAccessFromUser();
      const readiness = await NotificationService.getNotificationReadiness(buildOnboardingSettings());
      setNotificationReadiness(readiness);
      const granted = readiness.permissionStatus === 'granted';
      setWantsPrayerReminders(granted);
      if (granted && readiness.coreNotificationReady) {
        setCurrentStep('done');
      }
    } catch (error) {
      logger.log('Error requesting notification permissions:', error);
      setWantsPrayerReminders(false);
    } finally {
      setIsRequestingNotifications(false);
    }
  };

  const completeOnboarding = async () => {
    const settings = StorageService.getDefaultSettings();
    settings.calculationMethodManuallySelected = false;
    settings.notifications = normalizeNotificationSettings({
      ...settings.notifications,
      enabled: wantsPrayerReminders,
      adhanEnabled: wantsPrayerReminders ? settings.notifications.adhanEnabled : false,
      fullAdhanEnabled: wantsPrayerReminders
        ? settings.notifications.fullAdhanEnabled
        : false,
    });
    settings.name = displayName.trim();
    settings.asrJuristic = asrJuristic;

    if (locationData) {
      settings.location = locationData;
    }

    const { settings: resolvedSettings } = applyRegionalCalculationMethod(settings, locationData);

    setUserSettings(resolvedSettings);
    StorageService.setValue(MOSQUE_MODE_TIP_SEEN_KEY, '');

    AnalyticsService.logOnboardingCompleted();
    onComplete();
  };

  return (
    <LinearGradient
      colors={theme.colors.onboarding.gradient as unknown as [string, string, string]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {currentStep === 'welcome' ? (
            <OnboardingWelcomeStep
              progress={getProgress()}
              onContinue={() => setCurrentStep('location')}
            />
          ) : null}

          {currentStep === 'location' ? (
            <OnboardingLocationStep
              progress={getProgress()}
              isLocating={isLocating}
              locationFailed={locationFailed}
              locationFailureReason={locationFailureReason}
              onAllowLocation={requestLocationPermission}
              onOpenSettings={openAppSettings}
              onChooseManual={() => setShowManualLocationSheet(true)}
              onSkip={() => setCurrentStep('notifications')}
            />
          ) : null}

          {currentStep === 'notifications' ? (
            <OnboardingNotificationStep
              progress={getProgress()}
              onEnable={requestNotificationPermission}
              onSkip={() => {
                setWantsPrayerReminders(false);
                setCurrentStep('done');
              }}
              onOpenSettings={openAppSettings}
              permissionStatus={notificationReadiness.permissionStatus}
              blockedReason={notificationReadiness.blockedReason}
              isRequesting={isRequestingNotifications}
            />
          ) : null}

          {currentStep === 'done' ? (
            <OnboardingReadyStep
              progress={getProgress()}
              locationData={locationData}
              notificationsEnabled={wantsPrayerReminders}
              asrJuristic={asrJuristic}
              displayName={displayName}
              onAsrJuristicChange={setAsrJuristic}
              onDisplayNameChange={setDisplayName}
              onContinue={completeOnboarding}
            />
          ) : null}
        </KeyboardAvoidingView>

        <LocationModal
          visible={showManualLocationSheet}
          onClose={() => setShowManualLocationSheet(false)}
          title="Choose Your City"
          subtitle="Search for your country, then pick your city from the list."
          submitLabel="Use This Location"
          dismissLabel="Not now"
          onLocationResolved={(location) => {
            setLocationData(location);
            setLocationFailed(false);
            setLocationFailureReason('none');
            setShowManualLocationSheet(false);
            setCurrentStep('notifications');
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const createStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    keyboardAvoid: {
      flex: 1,
    },
  });

export default OnboardingScreen;

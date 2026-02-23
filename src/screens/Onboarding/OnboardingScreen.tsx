import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AnalyticsService from '../../services/AnalyticsService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import StorageService from '../../services/StorageService';
import { useStore } from '../../store/useStore';
import { CalculationMethod, CALCULATION_METHODS } from '../../types';
import LocationService from '../../services/LocationService';
import RingerControlService from '../../services/RingerControlService';
import { Location as AppLocation } from '../../types'
import { Switch } from 'react-native';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type NotificationIntensity = 'gentle' | 'balanced' | 'persistent';
type OnboardingStep = 'welcome' | 'name' | 'location' | 'notifications' | 'mosque' | 'method';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<CalculationMethod>('MWL');
  const [locationData, setLocationData] = useState<AppLocation | null>(null);
  const [enableAdhan, setEnableAdhan] = useState(true);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  // Phase 1: Location UX
  const [isLocating, setIsLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [manualLocationError, setManualLocationError] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Phase 2: Notification intensity
  const [notificationIntensity, setNotificationIntensity] = useState<NotificationIntensity>('balanced');

  // Phase 3: Mosque mode
  const [enableMosqueModeOnboarding, setEnableMosqueModeOnboarding] = useState(false);
  const pendingDndGrant = useRef(false);

  const { setUserSettings } = useStore();

  // Listen for app returning from Android DND settings during onboarding
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && pendingDndGrant.current) {
        pendingDndGrant.current = false;
        const canModify = await RingerControlService.canModify();
        if (canModify) {
          setEnableMosqueModeOnboarding(true);
        } else {
          // User didn't grant — keep toggle off
          setEnableMosqueModeOnboarding(false);
          Alert.alert(
            'Permission Not Granted',
            'Mosque Mode needs Do Not Disturb access to silence your phone. You can enable it later from the menu.',
            [{ text: 'OK' }]
          );
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const handleMosqueModeToggle = async (value: boolean) => {
    if (!value) {
      setEnableMosqueModeOnboarding(false);
      return;
    }

    if (Platform.OS === 'android') {
      const nativeAvailable = RingerControlService.isAvailable();
      if (!nativeAvailable) {
        Alert.alert('Feature Unavailable', 'Ringer control module is not available. Please rebuild the app.');
        return;
      }

      const canModify = await RingerControlService.canModify();
      if (!canModify) {
        Alert.alert(
          'Permission Required',
          'To auto-silence your phone at iqamah time, Sukoon needs Do Not Disturb access.\n\nYou\'ll be taken to Android settings. Find "Sukoon" and toggle it ON, then come back.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Grant Access',
              onPress: async () => {
                pendingDndGrant.current = true;
                await RingerControlService.openNotificationPolicyAccessSettings();
              },
            },
          ]
        );
        return;
      }
    }

    // iOS or Android with permission already granted
    setEnableMosqueModeOnboarding(true);
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('name');
        break;
      case 'name':
        setCurrentStep('location');
        break;
      case 'location':
        setCurrentStep('notifications');
        break;
      case 'notifications':
        setCurrentStep('mosque');
        break;
      case 'mosque':
        setCurrentStep('method');
        break;
      case 'method':
        completeOnboarding();
        break;
    }
  };

  const requestLocationPermission = async () => {
    setIsLocating(true);
    setLocationFailed(false);
    setManualLocationError('');
    try {
      const location = await LocationService.getCurrentLocation();

      if (location) {
        setLocationData(location);
        setIsLocating(false);
        handleNext();
      } else {
        setIsLocating(false);
        setLocationFailed(true);
      }
    } catch (error) {
      console.log('Onboarding location error:', error);
      setIsLocating(false);
      setLocationFailed(true);
    }
  };

  const handleManualLocationSubmit = async () => {
    if (!manualCity.trim()) {
      setManualLocationError('Please enter a city name');
      return;
    }
    if (!manualCountry.trim()) {
      setManualLocationError('Please enter a country name');
      return;
    }

    setIsSubmittingManual(true);
    setManualLocationError('');
    try {
      const location = await LocationService.setLocationByAddress(manualCity.trim(), manualCountry.trim());
      if (location) {
        setLocationData(location);
        setIsSubmittingManual(false);
        handleNext();
      } else {
        setManualLocationError('Could not find that location. Please check your spelling.');
        setIsSubmittingManual(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to set location';
      setManualLocationError(msg);
      setIsSubmittingManual(false);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      // 2. Ask for permission and capture the result
      const { status } = await Notifications.requestPermissionsAsync();
      
      // 3. Only set to true if they ACTUALLY granted it
      if (status === 'granted') {
        setIsNotificationEnabled(true);
      } else {
        setIsNotificationEnabled(false);
      }
    } catch (error) {
      console.log('Error requesting notification permissions:', error);
      setIsNotificationEnabled(false);
    } finally {
      // Move to next step regardless of outcome
      handleNext(); 
    }
  };

  const completeOnboarding = async () => {
    const settings = StorageService.getDefaultSettings();
    settings.name = name;
    settings.calculationMethod = selectedMethod;

    settings.notifications.enabled = isNotificationEnabled;
    settings.notifications.adhanEnabled = enableAdhan;

    if (locationData) {
      settings.location = locationData;
    }

    // Apply notification intensity preset to habitBuilder
    switch (notificationIntensity) {
      case 'gentle':
        settings.habitBuilder.enabled = false;
        break;
      case 'balanced':
        settings.habitBuilder.enabled = true;
        settings.habitBuilder.persistentReminders.enabled = true;
        settings.habitBuilder.persistentReminders.maxReminders = 1;
        settings.habitBuilder.persistentReminders.firstCheckDelay = 20;
        settings.habitBuilder.gracePeriodWarning.enabled = false;
        break;
      case 'persistent':
        settings.habitBuilder.enabled = true;
        settings.habitBuilder.persistentReminders.enabled = true;
        settings.habitBuilder.persistentReminders.maxReminders = 3;
        settings.habitBuilder.persistentReminders.firstCheckDelay = 15;
        settings.habitBuilder.persistentReminders.interval = 15;
        settings.habitBuilder.gracePeriodWarning.enabled = true;
        settings.habitBuilder.gracePeriodWarning.minutesBeforeNext = 15;
        break;
    }

    // Apply mosque mode toggle
    if (enableMosqueModeOnboarding) {
      settings.mosqueMode.enabled = true;
    }

    StorageService.setUserSettings(settings);
    setUserSettings(settings);

    AnalyticsService.logOnboardingCompleted();
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            {/* <Text style={styles.emoji}>🕌</Text> */}
            <Text style={styles.title}>Welcome to Sukoon</Text>
            <Text style={styles.subtitle}>
              Your companion for mindful prayer and spiritual growth
            </Text>
            <Text style={styles.description}>
              Let's set up your prayer times and help you build a consistent prayer habit
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        );

      case 'name':
        return (
          <View style={styles.stepContainer}>
            {/* <Text style={styles.emoji}>👋</Text> */}
            <Text style={styles.title}>As Salamu Alaikum!</Text>
            <Text style={styles.subtitle}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={theme.colors.onboarding.placeholder}
              selectionColor={theme.colors.primary.DEFAULT}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <TouchableOpacity
              style={[styles.button, !name && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!name}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        );

      case 'location':
        return (
          <ScrollView
            contentContainerStyle={[styles.stepContainer, { flex: 0, flexGrow: 1, paddingVertical: 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Prayer Times</Text>
            <Text style={styles.subtitle}>
              We need your location to calculate accurate prayer times
            </Text>
            <Text style={styles.description}>
              Your location data stays on your device and is never shared
            </Text>

            {isLocating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Finding your location...</Text>
              </View>
            ) : locationFailed ? (
              <View style={styles.manualLocationContainer}>
                <Text style={styles.manualLocationHint}>
                  We couldn't detect your location automatically.{'\n'}Enter it manually below.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="City (e.g. London)"
                  placeholderTextColor={theme.colors.onboarding.placeholder}
                  selectionColor={theme.colors.primary.DEFAULT}
                  value={manualCity}
                  onChangeText={setManualCity}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Country (e.g. United Kingdom)"
                  placeholderTextColor={theme.colors.onboarding.placeholder}
                  selectionColor={theme.colors.primary.DEFAULT}
                  value={manualCountry}
                  onChangeText={setManualCountry}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleManualLocationSubmit}
                />
                {manualLocationError ? (
                  <Text style={styles.errorText}>{manualLocationError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.button, isSubmittingManual && styles.buttonDisabled]}
                  onPress={handleManualLocationSubmit}
                  disabled={isSubmittingManual}
                >
                  <Text style={styles.buttonText}>
                    {isSubmittingManual ? 'Setting Location...' : 'Set Location'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setLocationFailed(false); }}>
                  <Text style={styles.skipText}>Try GPS again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
                  <Text style={styles.buttonText}>Allow Location Access</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext}>
                  <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        );

      case 'notifications':
        return (
          <ScrollView
            contentContainerStyle={[styles.stepContainer, { flex: 0, flexGrow: 1, paddingVertical: 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Prayer Reminders</Text>
            <Text style={styles.subtitle}>
              Get gentle reminders for each prayer time
            </Text>
            <Text style={styles.description}>
              We'll notify you before each prayer so you can prepare
            </Text>
            {/* Adhan Toggle */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Play Adhan Sound</Text>
                <Switch
                  value={enableAdhan}
                  onValueChange={setEnableAdhan}
                  trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                  thumbColor={theme.colors.switch.thumb}
                />
              </View>
              <Text style={styles.toggleDescription}>
                Hear the beautiful call to prayer when it's time.
              </Text>
            </View>
            {/* Notification Intensity Presets */}
            <Text style={styles.intensityLabel}>
              How should Sukoon follow up after prayer time?
            </Text>
            <View style={styles.intensityOptions}>
              <TouchableOpacity
                style={[
                  styles.intensityOption,
                  notificationIntensity === 'gentle' && styles.intensityOptionSelected,
                ]}
                onPress={() => setNotificationIntensity('gentle')}
              >
                <Text style={[
                  styles.intensityTitle,
                  notificationIntensity === 'gentle' && styles.intensityTitleSelected,
                ]}>Gentle</Text>
                <Text style={styles.intensityDesc}>Just let me know when it's time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.intensityOption,
                  notificationIntensity === 'balanced' && styles.intensityOptionSelected,
                ]}
                onPress={() => setNotificationIntensity('balanced')}
              >
                <Text style={[
                  styles.intensityTitle,
                  notificationIntensity === 'balanced' && styles.intensityTitleSelected,
                ]}>Balanced</Text>
                <Text style={styles.intensityDesc}>A reminder if I haven't prayed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.intensityOption,
                  notificationIntensity === 'persistent' && styles.intensityOptionSelected,
                ]}
                onPress={() => setNotificationIntensity('persistent')}
              >
                <Text style={[
                  styles.intensityTitle,
                  notificationIntensity === 'persistent' && styles.intensityTitleSelected,
                ]}>Persistent</Text>
                <Text style={styles.intensityDesc}>Help me build consistency</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={requestNotificationPermission}>
              <Text style={styles.buttonText}>Enable Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'mosque':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Mosque Mode</Text>
            <Text style={styles.subtitle}>
              {Platform.OS === 'android'
                ? 'Your phone silences itself at iqamah time'
                : 'Get reminded to silence your phone before prayer'}
            </Text>
            <Text style={styles.description}>
              {Platform.OS === 'android'
                ? 'Sukoon will automatically put your phone on silent before the prayer starts and restore it after.'
                : 'Since iPhone does not allow apps to control Do Not Disturb directly, Sukoon will send you a reminder before each iqamah so you can silence your phone.'}
            </Text>
            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Enable Mosque Mode</Text>
                <Switch
                  value={enableMosqueModeOnboarding}
                  onValueChange={handleMosqueModeToggle}
                  trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
                  thumbColor={theme.colors.switch.thumb}
                />
              </View>
              <Text style={styles.toggleDescription}>
                Default iqamah times are pre-set. You can customize them anytime from the menu.
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 'method':
        return (
          <ScrollView contentContainerStyle={[styles.stepContainer, { flex: 0, flexGrow: 1, paddingVertical: 20 }]}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Calculation Method</Text>
            <Text style={styles.subtitle}>
              Choose your preferred prayer time calculation method
            </Text>
            <View style={styles.methodList}>
              {CALCULATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.methodOption,
                    selectedMethod === method.value && styles.methodOptionSelected,
                  ]}
                  onPress={() => setSelectedMethod(method.value)}
                >
                  <Text style={[
                    styles.methodText,
                    selectedMethod === method.value && styles.methodTextSelected,
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Complete Setup</Text>
            </TouchableOpacity>
          </ScrollView>
        );
    }
  };

  const getProgress = () => {
    const steps = ['welcome', 'name', 'location', 'notifications', 'mosque', 'method'];
    return (steps.indexOf(currentStep) + 1) / steps.length;
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
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${getProgress() * 100}%` }]}
              />
            </View>
          </View>

          {renderStep()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing['4xl'],
    paddingTop: theme.spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.onboarding.progressBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing['4xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: theme.spacing['3xl'],
  },
  title: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textSubtle,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 26,
  },
  description: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing['4xl'],
    lineHeight: 24,
  },
  input: {
    backgroundColor: theme.colors.onboarding.inputBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text.primary,
    width: '100%',
    marginBottom: theme.spacing['3xl'],
    borderWidth: 1,
    borderColor: theme.colors.onboarding.inputBorder,
  },
  button: {
    backgroundColor: theme.colors.onboarding.buttonBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: 48,
    borderWidth: 1,
    borderColor: theme.colors.onboarding.buttonBorder,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  skipText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textHint,
    marginTop: theme.spacing.xl,
  },
  methodList: {
    width: '100%',
    marginBottom: theme.spacing['3xl'],
  },
  methodOption: {
    backgroundColor: theme.colors.onboarding.optionBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.onboarding.optionBorder,
  },
  methodOptionSelected: {
    backgroundColor: theme.colors.onboarding.optionActiveBg,
    borderColor: theme.colors.primary.DEFAULT,
  },
  methodText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textBody,
  },
  methodTextSelected: {
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  toggleContainer: {
    width: '100%',
    backgroundColor: theme.colors.onboarding.toggleBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing['2xl'],
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  toggleLabel: {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  toggleDescription: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textMuted,
  },
  // Phase 1: Location UX styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing['4xl'],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textSubtle,
    marginTop: theme.spacing.lg,
  },
  manualLocationContainer: {
    width: '100%',
    alignItems: 'center',
  },
  manualLocationHint: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    lineHeight: 22,
  },
  errorText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.status.error,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  // Phase 2: Notification intensity styles
  intensityLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  intensityOptions: {
    width: '100%',
    marginBottom: theme.spacing['2xl'],
  },
  intensityOption: {
    backgroundColor: theme.colors.onboarding.optionBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.onboarding.optionBorder,
  },
  intensityOptionSelected: {
    backgroundColor: theme.colors.onboarding.optionActiveBg,
    borderColor: theme.colors.primary.DEFAULT,
  },
  intensityTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.onboarding.textBody,
    marginBottom: theme.spacing.xs,
  },
  intensityTitleSelected: {
    color: theme.colors.primary.DEFAULT,
  },
  intensityDesc: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onboarding.textMuted,
  },
});

export default OnboardingScreen;
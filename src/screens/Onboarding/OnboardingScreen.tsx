import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

import StorageService from '../../services/StorageService';
import { useStore } from '../../store/useStore';
import { CalculationMethod, CALCULATION_METHODS } from '../../types';
import LocationService from '../../services/LocationService';
import { Location as AppLocation } from '../../types'
import { Switch } from 'react-native';

interface OnboardingScreenProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'name' | 'location' | 'notifications' | 'method';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const styles = useThemedStyles(createStyles);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<CalculationMethod>('MWL');
  const [locationData, setLocationData] = useState<AppLocation | null>(null);
  const [enableAdhan, setEnableAdhan] = useState(true);
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  const { setUserSettings } = useStore();

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
        setCurrentStep('method');
        break;
      case 'method':
        completeOnboarding();
        break;
    }
  };

  const requestLocationPermission = async () => {
    try {
      // Use LocationService instead of raw Expo calls to get city/country logic
      const location = await LocationService.getCurrentLocation();

      if (location) {
        setLocationData(location); // Store it for completeOnboarding
        handleNext();
      } else {
        // Permission denied or fetch failed, move next anyway but warn?
        Alert.alert('Location Skipped', 'We could not fetch your location automatically. You can set it manually later.');
        handleNext();
      }
    } catch (error) {
      console.log('Onboarding location error:', error);
      handleNext();
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

    StorageService.setUserSettings(settings);
    setUserSettings(settings);

    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🕌</Text>
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
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Assalamu Alaikum!</Text>
            <Text style={styles.subtitle}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>📍</Text>
            <Text style={styles.title}>Prayer Times</Text>
            <Text style={styles.subtitle}>
              We need your location to calculate accurate prayer times
            </Text>
            <Text style={styles.description}>
              Your location data stays on your device and is never shared
            </Text>
            <TouchableOpacity style={styles.button} onPress={requestLocationPermission}>
              <Text style={styles.buttonText}>Allow Location Access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🔔</Text>
            <Text style={styles.title}>Prayer Reminders</Text>
            <Text style={styles.subtitle}>
              Get gentle reminders for each prayer time
            </Text>
            <Text style={styles.description}>
              We'll notify you 10 minutes before each prayer so you can prepare mindfully
            </Text>
            {/* NEW: Adhan Toggle Section */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Play Adhan Sound</Text>
                <Switch
                  value={enableAdhan}
                  onValueChange={setEnableAdhan}
                  trackColor={{ false: '#767577', true: '#D4AF37' }}
                  thumbColor={'#f4f3f4'}
                />
              </View>
              <Text style={styles.toggleDescription}>
                Hear the beautiful call to prayer when it's time.
              </Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={requestNotificationPermission}>
              <Text style={styles.buttonText}>Enable Notifications</Text>
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
            <Text style={styles.emoji}>🕌</Text>
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
    const steps = ['welcome', 'name', 'location', 'notifications', 'method'];
    return (steps.indexOf(currentStep) + 1) / steps.length;
  };

  return (
    <LinearGradient 
      colors={['#1A1F3A', '#252B47', '#2D3454']}  // Dark theme gradient
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
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,  // 5xl
    fontWeight: '700',  // bold
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,  // xl
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
  },
  description: {
    fontSize: 16,  // lg
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,  // xl
    color: theme.colors.text.primary,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,  // xl
    fontWeight: '600',  // semibold
    color: theme.colors.text.primary,
  },
  skipText: {
    fontSize: 16,  // lg
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 20,
  },
  methodList: {
    width: '100%',
    marginBottom: 32,
  },
  methodOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  methodOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: theme.colors.primary.DEFAULT,
  },
  methodText: {
    fontSize: 16,  // lg
    color: 'rgba(255, 255, 255, 0.8)',
  },
  methodTextSelected: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',  // semibold
  },
  toggleContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 18,  // xl
    color: theme.colors.text.primary,
    fontWeight: '600',  // semibold
  },
  toggleDescription: {
    fontSize: 14,  // md
    color: 'rgba(255,255,255,0.7)',
  },
});

export default OnboardingScreen;
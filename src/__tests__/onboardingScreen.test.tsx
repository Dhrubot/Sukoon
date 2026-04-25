import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockSetUserSettings = jest.fn();
const mockLogOnboardingCompleted = jest.fn();
const mockOnComplete = jest.fn();
const mockGetNotificationReadiness = jest.fn(async () => ({
  permissionStatus: 'undetermined',
  exactAlarmStatus: 'not_applicable',
  isReady: false,
  blockedReason: null,
}));
const mockRequestNotificationAccessFromUser = jest.fn(async () => ({
  permissionStatus: 'granted',
  exactAlarmStatus: 'granted',
  isReady: true,
  blockedReason: null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        onboarding: { gradient: ['#fff', '#f5f5f5', '#eee'] },
      },
    },
  }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (factory: any) => factory({}),
}));

jest.mock('../store/useStore', () => ({
  useStore: () => ({
    setUserSettings: mockSetUserSettings,
  }),
}));

jest.mock('../services/AnalyticsService', () => ({
  __esModule: true,
  default: {
    logOnboardingCompleted: mockLogOnboardingCompleted,
  },
}));

const mockDefaultSettings = {
  location: { latitude: 0, longitude: 0, city: 'Unknown', country: 'Unknown' },
  calculationMethod: 'MWL',
  calculationMethodManuallySelected: false,
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Time for {prayer} prayer',
    postPrayerCheck: false,
    intensity: 'gentle',
    liveActivityEnabled: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: false,
    persistentReminders: { enabled: false, firstCheckDelay: 20, interval: 15, maxReminders: 1 },
    gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
    quietHours: { enabled: false, start: '22:00', end: '04:00' },
  },
  mosqueMode: {
    enabled: false,
    iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    jummah: { enabled: true, silentDuration: 30, iqamahOffset: 15 },
  },
  theme: 'auto',
};

jest.mock('../services/StorageService', () => ({
  __esModule: true,
  default: {
    getDefaultSettings: jest.fn(() => ({ ...mockDefaultSettings })),
    setValue: jest.fn(),
  },
}));

jest.mock('../services/LocationService', () => ({
  __esModule: true,
  default: {
    getCurrentLocation: jest.fn(),
  },
}));

jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    getNotificationReadiness: mockGetNotificationReadiness,
    requestNotificationAccessFromUser: mockRequestNotificationAccessFromUser,
  },
}));

jest.mock('../utils/calculationMethodByRegion', () => ({
  applyRegionalCalculationMethod: jest.fn((settings: any, location?: any) => ({
    calculationMethod: settings.calculationMethod,
    didAutoSelect: false,
    settings: {
      ...settings,
      location: location ?? settings.location,
    },
  })),
}));

jest.mock('../components/LocationModal', () => ({
  LocationModal: () => null,
}));

jest.mock('../components/onboarding/OnboardingWelcomeStep', () => ({
  OnboardingWelcomeStep: ({ onContinue }: any) => {
    const ReactNative = require('react-native');
    return <ReactNative.Button title="welcome" onPress={onContinue} />;
  },
}));

jest.mock('../components/onboarding/OnboardingLocationStep', () => ({
  OnboardingLocationStep: ({ onSkip }: any) => {
    const ReactNative = require('react-native');
    return <ReactNative.Button title="location" onPress={onSkip} />;
  },
}));

jest.mock('../components/onboarding/OnboardingNotificationStep', () => ({
  OnboardingNotificationStep: ({ onSkip, onEnable }: any) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Button title="notifications-enable" onPress={onEnable} />
        <ReactNative.Button title="notifications-skip" onPress={onSkip} />
      </ReactNative.View>
    );
  },
}));

jest.mock('../components/onboarding/OnboardingReadyStep', () => ({
  OnboardingReadyStep: ({ asrJuristic, onAsrJuristicChange, onContinue }: any) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{`Asr: ${asrJuristic}`}</ReactNative.Text>
        <ReactNative.Button title="set-hanafi" onPress={() => onAsrJuristicChange('Hanafi')} />
        <ReactNative.Button title="complete" onPress={onContinue} />
      </ReactNative.View>
    );
  },
}));

const OnboardingScreen = require('../screens/Onboarding/OnboardingScreen').default;

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNotificationReadiness.mockResolvedValue({
      permissionStatus: 'undetermined',
      exactAlarmStatus: 'not_applicable',
      isReady: false,
      blockedReason: null,
    });
    mockRequestNotificationAccessFromUser.mockResolvedValue({
      permissionStatus: 'granted',
      exactAlarmStatus: 'granted',
      isReady: true,
      blockedReason: null,
    });
  });

  it('defaults the final onboarding step to Standard and persists a changed Asr juristic choice', () => {
    const { getByText, getByRole } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByRole('button', { name: 'welcome' }));
    fireEvent.press(getByRole('button', { name: 'location' }));
    fireEvent.press(getByRole('button', { name: 'notifications-skip' }));

    expect(getByText('Asr: Standard')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'set-hanafi' }));
    fireEvent.press(getByRole('button', { name: 'complete' }));

    expect(mockSetUserSettings).toHaveBeenCalledWith(
      expect.objectContaining({ asrJuristic: 'Hanafi' })
    );
    expect(mockLogOnboardingCompleted).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('persists reminders and adhan as off when prayer reminders are skipped', async () => {
    mockGetNotificationReadiness.mockResolvedValueOnce({
      permissionStatus: 'granted',
      exactAlarmStatus: 'granted',
      isReady: true,
      blockedReason: null,
    });

    const { getByRole } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByRole('button', { name: 'welcome' }));
    fireEvent.press(getByRole('button', { name: 'location' }));

    await waitFor(() => {
      expect(mockGetNotificationReadiness).toHaveBeenCalled();
    });

    fireEvent.press(getByRole('button', { name: 'notifications-skip' }));
    fireEvent.press(getByRole('button', { name: 'complete' }));

    expect(mockSetUserSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.objectContaining({
          enabled: false,
          adhanEnabled: false,
          fullAdhanEnabled: false,
        }),
      })
    );
  });

  it('stays on the notification step when Android permission remains blocked', async () => {
    mockRequestNotificationAccessFromUser.mockResolvedValueOnce({
      permissionStatus: 'denied',
      exactAlarmStatus: 'not_applicable',
      isReady: false,
      blockedReason: 'permission_blocked',
    });
    mockGetNotificationReadiness.mockResolvedValueOnce({
      permissionStatus: 'denied',
      exactAlarmStatus: 'not_applicable',
      isReady: false,
      blockedReason: 'permission_blocked',
    });

    const { getByRole, queryByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByRole('button', { name: 'welcome' }));
    fireEvent.press(getByRole('button', { name: 'location' }));
    fireEvent.press(getByRole('button', { name: 'notifications-enable' }));

    await waitFor(() => {
      expect(queryByText('Asr: Standard')).toBeNull();
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });
});

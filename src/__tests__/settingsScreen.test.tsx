import React from 'react';
import { render } from '@testing-library/react-native';

const mockTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 11,
      md: 14,
      lg: 17,
    },
    fontFamily: {
      body: 'System',
      bodyMedium: 'System',
      bodySemibold: 'System',
    },
  },
  borderRadius: {
    sm: 8,
  },
  colors: {
    ambient: { top: '#fff', bottom: '#f5f5f5' },
    background: { primary: '#fff' },
    text: { primary: '#111', secondary: '#666', muted: '#999' },
    card: { background: '#fff' },
    border: { secondary: '#ddd' },
    status: { success: '#16a34a', error: '#dc2626' },
    primary: { DEFAULT: '#2274a5' },
  },
};

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('../components/LocationModal', () => ({
  LocationModal: () => null,
}));

jest.mock('../screens/Settings/components/PrayerSettingsSection', () => ({
  PrayerSettingsSection: () => null,
}));

jest.mock('../screens/Settings/components', () => ({
  NotificationSection: () => null,
  LocationSection: () => null,
  AppDataSection: () => <></>,
  AboutSection: ({ showSupport }: { showSupport?: boolean }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>Privacy Policy</ReactNative.Text>
        {showSupport ? <ReactNative.Text>Support Sukoon</ReactNative.Text> : null}
      </ReactNative.View>
    );
  },
}));

jest.mock('../components/settings/SettingSection', () => ({
  SettingSection: ({ title, children }: any) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{title}</ReactNative.Text>
        {children}
      </ReactNative.View>
    );
  },
}));

jest.mock('../components/settings/SettingRow', () => ({
  SettingRow: ({ label }: { label: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{label}</ReactNative.Text>;
  },
}));

jest.mock('../screens/Settings/modals', () => ({
  CalculationMethodModal: () => null,
  NotificationModal: () => null,
  HijriAdjustmentModal: () => null,
  ExportDataConfirmModal: () => null,
}));

jest.mock('../screens/Debug/NotificationDebugScreen', () => ({
  NotificationDebugScreen: () => null,
}));

jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    scheduleTahajjudEncouragement: jest.fn(async () => {}),
    cancelTahajjudNotifications: jest.fn(async () => {}),
  },
}));

jest.mock('../utils/ramadan', () => ({
  getCachedHijriDate: () => null,
}));

jest.mock('../screens/Settings/hooks', () => ({
  useSettingsManager: () => ({
    userSettings: {
      location: { latitude: 23.81, longitude: 90.41, city: 'Dhaka', country: 'Bangladesh' },
      calculationMethod: 'MWL',
      asrJuristic: 'Standard',
      adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
      notifications: {
        enabled: true,
        adhanEnabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        beforePrayer: 10,
        reminderText: 'Time for {prayer} prayer',
        postPrayerCheck: true,
      },
      prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
      habitBuilder: {
        enabled: true,
        persistentReminders: { enabled: true, firstCheckDelay: 20, interval: 15, maxReminders: 1 },
        gracePeriodWarning: { enabled: false, minutesBeforeNext: 15 },
        snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
        quietHours: { enabled: false, start: '22:00', end: '06:00' },
      },
      mosqueMode: {
        enabled: false,
        iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
        silentDuration: 10,
        autoRestore: true,
        promptBeforeEnable: false,
        useVibrateInsteadOfSilent: false,
        jummah: { enabled: true, silentDuration: 30, iqamahTime: '13:30' },
      },
      theme: 'auto',
    },
    showCalculationPicker: false,
    showNotificationModal: false,
    isUpdatingLocation: false,
    calculationMethods: [],
    showManualLocationModal: false,
    isUpdatingMethod: false,
    previewPrayerTimes: null,
    prayerTimesLoading: false,
    hasValidLocation: true,
    todayPrayerTimes: [],
    nextPrayer: null,
    setUserSettings: jest.fn(),
    setShowCalculationPicker: jest.fn(),
    setShowNotificationModal: jest.fn(),
    setShowManualLocationModal: jest.fn(),
    handleCalculationMethodChange: jest.fn(),
    updateLocation: jest.fn(),
    handleResetApp: jest.fn(),
    handleExportData: jest.fn(),
    handleExportDataWithOptions: jest.fn(),
    handleImportData: jest.fn(),
    handlePrivacyPolicy: jest.fn(),
    previewCalculationMethod: jest.fn(),
    testPrayerCalculations: jest.fn(),
    showDebugInfo: jest.fn(),
    refreshPrayerTimes: jest.fn(),
    showExportConfirmModal: false,
    setShowExportConfirmModal: jest.fn(),
    handleAutomaticCalculationMethod: jest.fn(),
  }),
}));

const SettingsScreen = require('../screens/Settings/SettingsScreen').default;

describe('SettingsScreen', () => {
  it('hides the app data and support sections from settings', () => {
    const { queryByText, getByText } = render(
      <SettingsScreen navigation={{ navigate: jest.fn() }} />
    );

    expect(getByText('Privacy Policy')).toBeTruthy();
    expect(queryByText('App Data')).toBeNull();
    expect(queryByText('Support Sukoon')).toBeNull();
  });
});

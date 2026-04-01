import React from 'react';
import { Platform, Switch } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { UserSettings } from '../types';

const mockUpdateUserSettings = jest.fn();
const mockGetPermissionStatus = jest.fn(async () => 'granted');
const mockUpdateNotificationSettings = jest.fn(async () => {});

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
  SettingRow: ({ label, subtitle, value }: any) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.View>
        <ReactNative.Text>{label}</ReactNative.Text>
        {subtitle ? <ReactNative.Text>{subtitle}</ReactNative.Text> : null}
        {value ? <ReactNative.Text>{value}</ReactNative.Text> : null}
      </ReactNative.View>
    );
  },
}));

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        switch: {
          trackFalse: '#000',
          trackTrue: '#111',
          thumb: '#fff',
        },
      },
    },
  }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: () => ({
    row: {},
    textContainer: {},
    label: {},
    subtitle: {},
  }),
}));

jest.mock('../store/useStore', () => ({
  useStore: () => ({
    updateUserSettings: mockUpdateUserSettings,
  }),
}));

jest.mock('../services/NotificationService', () => ({
  __esModule: true,
  default: {
    getPermissionStatus: mockGetPermissionStatus,
    updateNotificationSettings: mockUpdateNotificationSettings,
  },
}));

jest.mock('../services/LiveActivityService', () => ({
  __esModule: true,
  default: {
    startWithCurrentData: jest.fn(async () => {}),
    end: jest.fn(async () => {}),
  },
}));

const { NotificationSection } = require('../screens/Settings/components/NotificationSection');
const LiveActivityService = require('../services/LiveActivityService').default;

const baseSettings: UserSettings = {
  location: { latitude: 23.8103, longitude: 90.4125, city: 'Dhaka', country: 'Bangladesh' },
  calculationMethod: 'MWL',
  asrJuristic: 'Standard',
  adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
  notifications: {
    enabled: true,
    adhanEnabled: true,
    fullAdhanEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    beforePrayer: 10,
    reminderText: 'Time for {prayer} prayer',
    postPrayerCheck: false,
    liveActivityEnabled: false,
  },
  prayerNotifications: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  habitBuilder: {
    enabled: true,
    persistentReminders: { enabled: true, firstCheckDelay: 15, interval: 15, maxReminders: 3 },
    gracePeriodWarning: { enabled: true, minutesBeforeNext: 15 },
    snooze: { allowedIntervals: [5, 10, 15, 30], defaultInterval: 10, maxSnoozesPerPrayer: 5 },
    quietHours: { enabled: false, start: '22:00', end: '04:00' },
  },
  mosqueMode: {
    enabled: false,
    silentDuration: 10,
    autoRestore: true,
    promptBeforeEnable: false,
    useVibrateInsteadOfSilent: false,
    iqamahOffsets: { Fajr: 10, Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 10 },
  },
  theme: 'auto',
};

describe('NotificationSection', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockGetPermissionStatus.mockResolvedValue('granted');
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('shows the Android locked-screen full adhan toggle', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const { getByText } = render(
      <NotificationSection
        userSettings={baseSettings}
        onNotificationPress={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(getByText('Full Adhan (Locked Screen)')).toBeTruthy();
    });
    expect(
      getByText('Schedules the complete call to prayer when your phone is locked or the app is closed')
    ).toBeTruthy();
    expect(getByText('Persistent Prayer Countdown')).toBeTruthy();
    expect(
      getByText('Keep a prayer-aware countdown in your notifications and on the lock screen.')
    ).toBeTruthy();
  });

  it('hides the Android-only full adhan toggle on iOS', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const { queryByText } = render(
      <NotificationSection
        userSettings={baseSettings}
        onNotificationPress={jest.fn()}
      />
    );

    await waitFor(() => expect(mockGetPermissionStatus).toHaveBeenCalled());
    expect(queryByText('Full Adhan (Locked Screen)')).toBeNull();
    expect(
      queryByText('Short call to prayer on the lock screen. Full adhan continues after you open the app.')
    ).toBeTruthy();
    expect(queryByText('Live Activity')).toBeTruthy();
    expect(
      queryByText('Show a prayer-aware countdown on your lock screen and Dynamic Island.')
    ).toBeTruthy();
  });

  it('disables full adhan when the main adhan switch is turned off', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const { UNSAFE_getAllByType } = render(
      <NotificationSection
        userSettings={baseSettings}
        onNotificationPress={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(UNSAFE_getAllByType(Switch)[0].props.disabled).toBe(false);
    });

    const switches = UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], 'valueChange', false);

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        notifications: {
          ...baseSettings.notifications,
          adhanEnabled: false,
          fullAdhanEnabled: false,
        },
      });
    });

    expect(mockUpdateNotificationSettings).toHaveBeenCalledWith({
      adhanEnabled: false,
      fullAdhanEnabled: false,
    });
  });

  it('starts and ends the platform countdown service when the toggle changes', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const { UNSAFE_getAllByType } = render(
      <NotificationSection
        userSettings={baseSettings}
        onNotificationPress={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(UNSAFE_getAllByType(Switch).length).toBeGreaterThanOrEqual(2);
    });

    const liveActivitySwitch = UNSAFE_getAllByType(Switch)[1];
    fireEvent(liveActivitySwitch, 'valueChange', true);

    await waitFor(() => {
      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        notifications: {
          ...baseSettings.notifications,
          liveActivityEnabled: true,
        },
      });
      expect(LiveActivityService.startWithCurrentData).toHaveBeenCalledTimes(1);
    });

    fireEvent(liveActivitySwitch, 'valueChange', false);

    await waitFor(() => {
      expect(LiveActivityService.end).toHaveBeenCalledTimes(1);
    });
  });
});

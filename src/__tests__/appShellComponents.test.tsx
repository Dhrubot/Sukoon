import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockUseAppInitialization = jest.fn();
const mockUseNotificationRescheduler = jest.fn();
const mockMarkLaunchMilestoneOnce = jest.fn();
const mockCrashlyticsLog = jest.fn();
const mockCrashlyticsSetAttribute = jest.fn();
const mockCrashlyticsRecordError = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../hooks/useAppInitialization', () => ({
  useAppInitialization: () => mockUseAppInitialization(),
}));

jest.mock('../hooks/useNotificationRescheduler', () => ({
  useNotificationRescheduler: () => mockUseNotificationRescheduler(),
}));

jest.mock('../screens/Onboarding/OnboardingScreen', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  return ({ onComplete }: { onComplete: () => void }) => (
    <ReactNative.TouchableOpacity onPress={onComplete}>
      {ReactModule.createElement(ReactNative.Text, null, 'Onboarding Screen')}
    </ReactNative.TouchableOpacity>
  );
});

jest.mock('../components/LoadingScreen', () => {
  const ReactModule = require('react');
  const ReactNative = require('react-native');
  return {
    LoadingScreen: ({ message, onPress }: { message: string; onPress?: () => void }) => (
      <ReactNative.TouchableOpacity onPress={onPress}>
        {ReactModule.createElement(ReactNative.Text, null, message)}
      </ReactNative.TouchableOpacity>
    ),
  };
});

jest.mock('../navigation/AppNavigator', () => ({
  AppNavigator: () => {
    const ReactModule = require('react');
    const ReactNative = require('react-native');
    return ReactModule.createElement(ReactNative.Text, null, 'App Navigator');
  },
}));

jest.mock('../providers/ServiceProvider', () => ({
  ServiceProvider: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
}));

jest.mock('../services/PerformanceService', () => ({
  __esModule: true,
  default: {
    markLaunchMilestoneOnce: (...args: unknown[]) => mockMarkLaunchMilestoneOnce(...args),
  },
}));

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  log: (...args: unknown[]) => mockCrashlyticsLog(...args),
  setAttribute: (...args: unknown[]) => mockCrashlyticsSetAttribute(...args),
  recordError: (...args: unknown[]) => mockCrashlyticsRecordError(...args),
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    warn: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => {
    const ReactModule = require('react');
    const ReactNative = require('react-native');
    return ReactModule.createElement(ReactNative.View, null, children);
  },
}));

import { AppInitializer } from '../components/AppInitializer';
import ErrorBoundary from '../components/ErrorBoundary';

describe('app shell components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the correct AppInitializer branch for loading, error, onboarding, and ready states', () => {
    const retryInitialization = jest.fn();
    const completeOnboarding = jest.fn();

    mockUseAppInitialization.mockReturnValue({
      isLoading: true,
      isFirstLaunch: false,
      error: null,
      completeOnboarding,
      retryInitialization,
    });
    const loading = render(<AppInitializer />);
    expect(loading.getByText('Initializing Sukoon...')).toBeTruthy();
    loading.unmount();

    mockUseAppInitialization.mockReturnValue({
      isLoading: false,
      isFirstLaunch: false,
      error: 'boom',
      completeOnboarding,
      retryInitialization,
    });
    const error = render(<AppInitializer />);
    fireEvent.press(error.getByText('Initialization failed: boom\n\nTap to retry'));
    expect(retryInitialization).toHaveBeenCalledTimes(1);
    error.unmount();

    mockUseAppInitialization.mockReturnValue({
      isLoading: false,
      isFirstLaunch: true,
      error: null,
      completeOnboarding,
      retryInitialization,
    });
    const onboarding = render(<AppInitializer />);
    expect(onboarding.getByText('Onboarding Screen')).toBeTruthy();
    fireEvent.press(onboarding.getByText('Onboarding Screen'));
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
    expect(mockMarkLaunchMilestoneOnce).toHaveBeenCalledWith('onboarding_screen_rendered');
    onboarding.unmount();

    mockUseAppInitialization.mockReturnValue({
      isLoading: false,
      isFirstLaunch: false,
      error: null,
      completeOnboarding,
      retryInitialization,
    });
    const ready = render(<AppInitializer />);
    expect(ready.getByText('App Navigator')).toBeTruthy();
    expect(mockMarkLaunchMilestoneOnce).toHaveBeenCalledWith('app_navigator_rendered');
    expect(mockUseNotificationRescheduler).toHaveBeenCalled();
  });

  it('renders the ErrorBoundary fallback, reports to crashlytics, and retries successfully', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    const ProblemChild = () => {
      if (shouldThrow) {
        throw new Error('Kaboom');
      }
      return <Text>Recovered</Text>;
    };

    const screen = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockCrashlyticsLog).toHaveBeenCalledWith('ErrorBoundary caught error');
    expect(mockCrashlyticsRecordError).toHaveBeenCalled();

    shouldThrow = false;
    fireEvent.press(screen.getByText('Try Again'));
    expect(screen.getByText('Recovered')).toBeTruthy();
  });
});

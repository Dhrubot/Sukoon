import { NavigatorScreenParams } from '@react-navigation/native';
import { PrayerTime, PrayerName } from './index';

// Tab navigator parameter types
export type TabParamList = {
  Home: { markPrayerComplete?: PrayerName } | undefined;
  Stats: undefined;
  Settings: undefined;
  Achievements: undefined;
  DigitalWellness: undefined;
  Support: undefined;
};

// Root stack parameter types
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  MindfulnessFlow: { prayer: PrayerTime };
};

// Onboarding and other modal screens (if needed)
export type AppStackParamList = {
  App: undefined;
  Onboarding: { onComplete: () => void };
};

// Type declaration to make the types available to the React Navigation library
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

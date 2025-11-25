import { NavigatorScreenParams } from '@react-navigation/native';
import { PrayerTime, PrayerName } from './index';

// Tab navigator parameter types
export type TabParamList = {
  Home: undefined;
  QiblaFinder: undefined;
  Stats: undefined;
  Menu: undefined;
  // These are now accessible from Menu
  Achievements: undefined;
  DigitalWellness: undefined;
  Support: undefined;
  Settings: undefined;
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

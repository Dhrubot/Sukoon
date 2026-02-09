import { NavigatorScreenParams } from '@react-navigation/native';
import { PrayerTime, PrayerName } from './index';
import { MenuStackParamList } from '../navigation/MenuStackNavigator';

// Tab navigator parameter types (only visible tabs)
export type TabParamList = {
  Home: undefined;
  QiblaFinder: undefined;
  Menu: NavigatorScreenParams<MenuStackParamList>; // Nested stack
};

// Root stack parameter types
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  // Modal screens
  MindfulnessFlow: { prayer: PrayerTime };
  // Debug screens
  NotificationDebug: undefined;
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

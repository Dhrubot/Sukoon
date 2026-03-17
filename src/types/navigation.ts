import { NavigatorScreenParams } from '@react-navigation/native';
import { PrayerName, ExtendedPrayerName } from './index';

// Serializable version of PrayerTime for React Navigation params
// (React Navigation warns about non-serializable values like Date objects)
export interface SerializablePrayerTime {
  name: PrayerName | ExtendedPrayerName;
  time: string;       // ISO 8601 string from Date.toISOString()
  timestamp: number;
  isNext?: boolean;
}
import { MenuStackParamList } from '../navigation/MenuStackNavigator';

// Tab navigator parameter types (only visible tabs)
export type TabParamList = {
  Home: { quickLogPrayer?: string } | undefined;
  MosqueMode: undefined;
  QiblaFinder: undefined;
  Menu: NavigatorScreenParams<MenuStackParamList>; // Nested stack
};

// Root stack parameter types
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  // Modal screens
  MindfulnessFlow: { prayer: SerializablePrayerTime; isSunnah?: boolean };
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
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
  /* eslint-enable @typescript-eslint/no-namespace */
}

import { NavigatorScreenParams } from '@react-navigation/native';
import { PrayerTime } from './index';

// Define the parameter types for each screen
export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  Stats: undefined;
  MindfulnessFlow: { prayer: PrayerTime }; // Define the prayer parameter for MindfulnessFlow
  // Add other routes as needed
};

// Type declaration to make the types available to the React Navigation library
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

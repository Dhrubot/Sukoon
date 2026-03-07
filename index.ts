import { override as overrideRNFlags } from 'react-native/src/private/featureflags/ReactNativeFeatureFlags';

overrideRNFlags({
  scheduleAnimatedCleanupInMicrotask: () => true,
});

import { registerRootComponent } from 'expo';
import crashlytics from '@react-native-firebase/crashlytics';

import './src/tasks/notificationRescheduleTask';

import App from './App';

// Global JS error handler — catches unhandled errors outside React's ErrorBoundary
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  try {
    crashlytics().log(`Global error handler: isFatal=${isFatal}`);
    crashlytics().recordError(error);
  } catch (_) {
    // Crashlytics unavailable
  }
  defaultHandler(error, isFatal);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

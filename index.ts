import './src/setupFeatureFlags';
import { registerRootComponent } from 'expo';
import './src/tasks/notificationRescheduleTask';
import './src/tasks/notificationBootRescheduleTask';

import App from './App';
import CrashReportingService from './src/services/CrashReportingService';

// Global JS error handler — catches unhandled errors outside React's ErrorBoundary
const defaultHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  CrashReportingService.recordGlobalError(error, isFatal);
  defaultHandler(error, isFatal);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

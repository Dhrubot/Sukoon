import { override } from 'react-native/src/private/featureflags/ReactNativeFeatureFlags';

override({
  scheduleAnimatedCleanupInMicrotask: () => true,
});

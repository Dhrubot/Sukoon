declare module 'react-native/src/private/featureflags/ReactNativeFeatureFlags' {
  type ReactNativeFeatureFlagsJsOnlyOverrides = Partial<{
    scheduleAnimatedCleanupInMicrotask: (defaultValue: boolean) => boolean;
    [key: string]: (defaultValue: unknown) => unknown;
  }>;

  export function override(overrides: ReactNativeFeatureFlagsJsOnlyOverrides): void;
}

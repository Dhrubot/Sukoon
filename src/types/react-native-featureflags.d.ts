declare module 'react-native/src/private/featureflags/ReactNativeFeatureFlags' {
  type ReactNativeFeatureFlagsJsOnlyOverrides = Partial<{
    scheduleAnimatedCleanupInMicrotask: (defaultValue: boolean) => boolean;
    [key: string]: (defaultValue: any) => any;
  }>;

  export function override(overrides: ReactNativeFeatureFlagsJsOnlyOverrides): void;
}

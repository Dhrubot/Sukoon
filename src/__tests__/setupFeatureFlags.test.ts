describe('setupFeatureFlags', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('overrides the React Native animated cleanup flag', () => {
    const override = jest.fn();

    jest.doMock(
      'react-native/src/private/featureflags/ReactNativeFeatureFlags',
      () => ({ override })
    );

    require('../setupFeatureFlags');

    expect(override).toHaveBeenCalledWith({
      scheduleAnimatedCleanupInMicrotask: expect.any(Function),
    });
    expect(override.mock.calls[0][0].scheduleAnimatedCleanupInMicrotask()).toBe(true);
  });
});

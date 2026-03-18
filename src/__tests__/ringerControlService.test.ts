describe('RingerControlService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadService(options?: {
    platformOS?: 'android' | 'ios';
    module?: {
      canModifyRingerMode?: jest.Mock;
      setRingerMode?: jest.Mock;
      getRingerMode?: jest.Mock;
      scheduleMosqueMode?: jest.Mock;
      cancelMosqueMode?: jest.Mock;
      openNotificationPolicyAccessSettings?: jest.Mock;
    } | null;
    openSettings?: jest.Mock;
  }) {
    jest.resetModules();

    const nativeModule = options?.module === null
      ? null
      : {
          canModifyRingerMode: options?.module?.canModifyRingerMode ?? jest.fn(async () => true),
          setRingerMode: options?.module?.setRingerMode ?? jest.fn(async () => 'NORMAL'),
          getRingerMode: options?.module?.getRingerMode ?? jest.fn(async () => 'NORMAL'),
          scheduleMosqueMode: options?.module?.scheduleMosqueMode ?? jest.fn(async () => true),
          cancelMosqueMode: options?.module?.cancelMosqueMode ?? jest.fn(async () => true),
          openNotificationPolicyAccessSettings:
            options?.module?.openNotificationPolicyAccessSettings ?? jest.fn(async () => true),
        };
    const openSettings = options?.openSettings ?? jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
      NativeModules: { RingerModeModule: nativeModule },
      Linking: { openSettings },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/RingerControlService').default;
    return { service, nativeModule, openSettings };
  }

  it('exposes the native Android ringer controls and helper methods when available', async () => {
    const { service, nativeModule } = loadService();

    expect(service.isAvailable()).toBe(true);
    await expect(service.canModify()).resolves.toBe(true);
    await expect(service.setRingerMode('SILENT')).resolves.toBe(true);
    await expect(service.scheduleMosqueMode(1, 2, 'SILENT', 'NORMAL', 10)).resolves.toBe(true);
    await expect(service.cancelMosqueMode(10)).resolves.toBe(true);
    await expect(service.getRingerMode()).resolves.toBe('NORMAL');
    await expect(service.isSilent()).resolves.toBe(false);

    expect(nativeModule?.setRingerMode).toHaveBeenCalledWith('SILENT');
    expect(nativeModule?.scheduleMosqueMode).toHaveBeenCalledWith(1, 2, 'SILENT', 'NORMAL', 10);
  });

  it('refuses mode changes without DND access and falls back to Linking for settings', async () => {
    const { service, nativeModule, openSettings } = loadService({
      module: {
        canModifyRingerMode: jest.fn(async () => false),
        openNotificationPolicyAccessSettings: jest.fn(async () => {
          throw new Error('native failed');
        }),
      },
    });

    await expect(service.setRingerMode('VIBRATE')).resolves.toBe(false);
    await expect(service.openNotificationPolicyAccessSettings()).resolves.toBe(true);

    expect(nativeModule?.setRingerMode).not.toHaveBeenCalled();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable defaults off Android and throws if all settings-open paths fail', async () => {
    const ios = loadService({ platformOS: 'ios', module: null });
    expect(ios.service.isAvailable()).toBe(false);
    await expect(ios.service.canModify()).resolves.toBe(false);
    await expect(ios.service.getRingerMode()).resolves.toBeNull();
    await expect(ios.service.openNotificationPolicyAccessSettings()).resolves.toBe(false);

    const androidFailure = loadService({
      platformOS: 'android',
      module: {
        openNotificationPolicyAccessSettings: jest.fn(async () => {
          throw new Error('native failed');
        }),
      },
      openSettings: jest.fn(async () => {
        throw new Error('linking failed');
      }),
    });

    await expect(androidFailure.service.openNotificationPolicyAccessSettings()).rejects.toThrow(
      'Could not open DND settings.'
    );
  });
});

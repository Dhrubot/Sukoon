describe('NotificationChannels', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadModule(options?: {
    platformOS?: 'android' | 'ios';
    isDevice?: boolean;
    channels?: Array<{ id: string }>;
  }) {
    jest.resetModules();

    const getNotificationChannelsAsync = jest.fn(async () => options?.channels ?? []);
    const deleteNotificationChannelAsync = jest.fn(async () => {});
    const setNotificationChannelAsync = jest.fn(async () => {});
    const setNotificationCategoryAsync = jest.fn(async () => {});

    jest.doMock('react-native', () => ({
      Platform: { OS: options?.platformOS ?? 'android' },
    }));
    jest.doMock('expo-device', () => ({
      isDevice: options?.isDevice ?? true,
    }));
    jest.doMock('expo-notifications', () => ({
      getNotificationChannelsAsync,
      deleteNotificationChannelAsync,
      setNotificationChannelAsync,
      setNotificationCategoryAsync,
      AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const module = require('../services/notifications/NotificationChannels');
    return {
      ...module,
      mocks: {
        getNotificationChannelsAsync,
        deleteNotificationChannelAsync,
        setNotificationChannelAsync,
        setNotificationCategoryAsync,
      },
    };
  }

  it('cleans up legacy Android notification channels only', async () => {
    const { cleanupOldChannels, mocks } = loadModule({
      platformOS: 'android',
      channels: [
        { id: 'prayer-times-adhan-v8' },
        { id: 'prayer-times-default-v2' },
        { id: 'jummah-v9' },
      ],
    });

    await cleanupOldChannels();

    expect(mocks.deleteNotificationChannelAsync).toHaveBeenCalledTimes(2);
    expect(mocks.deleteNotificationChannelAsync).toHaveBeenCalledWith('prayer-times-adhan-v8');
    expect(mocks.deleteNotificationChannelAsync).toHaveBeenCalledWith('prayer-times-default-v2');
  });

  it('sets up the expected Android channels including the silent full-adhan channel', async () => {
    const { setupNotificationChannels, mocks } = loadModule({
      platformOS: 'android',
    });

    await setupNotificationChannels();

    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledTimes(10);
    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledWith(
      'prayer-times-adhan-silent-v9',
      expect.objectContaining({
        name: 'Prayer Times (Full Adhan)',
        sound: null,
      })
    );
    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledWith(
      'persistent-urgent-v9',
      expect.objectContaining({
        name: 'Prayer Follow-up (Urgent)',
        importance: 4,
      })
    );
    expect(mocks.setNotificationChannelAsync).toHaveBeenCalledWith(
      'jummah-v9',
      expect.objectContaining({
        name: 'Jummah Reminders',
        importance: 3,
      })
    );
  });

  it('sets up iOS categories and initializes the correct platform-specific path', async () => {
    const ios = loadModule({ platformOS: 'ios' });
    await ios.setupNotificationCategories();
    expect(ios.mocks.setNotificationCategoryAsync).toHaveBeenCalledTimes(6);
    expect(ios.mocks.setNotificationCategoryAsync).toHaveBeenCalledWith(
      ios.NOTIFICATION_CATEGORIES.JUMMAH_REMINDER,
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'prepare' }),
      ])
    );

    await ios.initializeChannelsAndCategories();
    expect(ios.mocks.setNotificationCategoryAsync).toHaveBeenCalledTimes(12);
    expect(ios.mocks.setNotificationChannelAsync).not.toHaveBeenCalled();

    const android = loadModule({ platformOS: 'android', isDevice: true });
    await android.initializeChannelsAndCategories();
    expect(android.mocks.setNotificationChannelAsync).toHaveBeenCalledTimes(10);

    const simulator = loadModule({ platformOS: 'android', isDevice: false });
    await simulator.initializeChannelsAndCategories();
    expect(simulator.mocks.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

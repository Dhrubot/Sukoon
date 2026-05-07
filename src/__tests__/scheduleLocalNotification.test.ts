describe('scheduleLocalNotificationAsync', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadModule(platformOS: 'android' | 'ios') {
    const scheduleNotificationAsync = jest.fn(async () => 'notification-id');

    jest.doMock('react-native', () => ({
      Platform: { OS: platformOS },
    }));

    jest.doMock('expo-notifications', () => ({
      scheduleNotificationAsync,
    }));

    const module = require('../services/notifications/scheduleLocalNotification');

    return {
      ...module,
      mocks: {
        scheduleNotificationAsync,
      },
    };
  }

  it('preserves silent iOS notifications when no sound is provided', async () => {
    const { scheduleLocalNotificationAsync, mocks } = loadModule('ios');

    await scheduleLocalNotificationAsync({
      content: {
        title: 'Reminder',
        body: 'Prayer time',
      },
      trigger: null,
    });

    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Reminder',
        body: 'Prayer time',
      },
      trigger: null,
    });
  });

  it('does not inject the default sound on Android', async () => {
    const { scheduleLocalNotificationAsync, mocks } = loadModule('android');

    await scheduleLocalNotificationAsync({
      content: {
        title: 'Reminder',
        body: 'Prayer time',
      },
      trigger: null,
    });

    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Reminder',
        body: 'Prayer time',
      },
      trigger: null,
    });
  });

  it('preserves explicit sounds instead of overriding them', async () => {
    const { scheduleLocalNotificationAsync, mocks } = loadModule('android');

    await scheduleLocalNotificationAsync({
      content: {
        title: 'Adhan',
        body: 'Play adhan',
        sound: 'adhan_short.ogg',
      },
      trigger: null,
    });

    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'Adhan',
        body: 'Play adhan',
        sound: 'adhan_short.ogg',
      },
      trigger: null,
    });
  });
});

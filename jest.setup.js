// jest.setup.js
// Global mocks for native modules that aren't available in the test environment

function mockCreateMmkvStore() {
  const storage = new Map();

  return {
    set: jest.fn((key, value) => {
      storage.set(key, value);
    }),
    getString: jest.fn((key) => {
      const value = storage.get(key);
      return typeof value === 'string' ? value : undefined;
    }),
    getNumber: jest.fn((key) => {
      const value = storage.get(key);
      return typeof value === 'number' ? value : undefined;
    }),
    getBoolean: jest.fn((key) => {
      const value = storage.get(key);
      return typeof value === 'boolean' ? value : undefined;
    }),
    delete: jest.fn((key) => {
      storage.delete(key);
    }),
    remove: jest.fn((key) => {
      storage.delete(key);
    }),
    contains: jest.fn((key) => storage.has(key)),
    clearAll: jest.fn(() => {
      storage.clear();
    }),
    getAllKeys: jest.fn(() => Array.from(storage.keys())),
  };
}

function mockCreateAudioPlayer() {
  const listeners = new Map();

  return {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    currentStatus: {
      isLoaded: true,
      didJustFinish: false,
      playing: false,
    },
    addListener: jest.fn((eventName, callback) => {
      listeners.set(eventName, callback);
      return {
        remove: jest.fn(() => {
          listeners.delete(eventName);
        }),
      };
    }),
    __emit(eventName, payload) {
      const listener = listeners.get(eventName);
      if (listener) listener(payload);
    },
  };
}

const ReactNative = require('react-native');
Object.assign(ReactNative.NativeModules, {
  AdhanModule: {
    scheduleAdhan: jest.fn(async () => {}),
    cancelAllAdhans: jest.fn(async () => {}),
    cancelAdhan: jest.fn(async () => {}),
    stopAdhan: jest.fn(async () => {}),
    getExactAlarmStatus: jest.fn(async () => 'granted'),
  },
  RingerModeModule: {
    setRingerMode: jest.fn(async () => 'NORMAL'),
    getRingerMode: jest.fn(async () => 'NORMAL'),
    canModifyRingerMode: jest.fn(async () => true),
    openNotificationPolicyAccessSettings: jest.fn(async () => true),
    scheduleMosqueMode: jest.fn(async () => true),
    cancelMosqueMode: jest.fn(async () => true),
  },
});

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => mockCreateMmkvStore()),
  MMKV: jest.fn(() => mockCreateMmkvStore()),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((size) => new Uint8Array(size)),
  digestStringAsync: jest.fn(async () => 'mock-hash-value'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  modelName: 'TestDevice',
  osVersion: '17.0',
  deviceName: 'Test',
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => mockCreateAudioPlayer()),
  setAudioModeAsync: jest.fn(async () => {}),
  setIsAudioActiveAsync: jest.fn(async () => {}),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getNotificationChannelsAsync: jest.fn(async () => []),
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(async () => {}),
  setUserProperty: jest.fn(async () => {}),
  logScreenView: jest.fn(async () => {}),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('StorageAdapter', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('supports CRUD operations in MemoryStorage', () => {
    const { MemoryStorage } = require('../services/StorageAdapter');
    const storage = new MemoryStorage();

    storage.set('string', 'value');
    storage.set('number', 12);
    storage.set('boolean', true);

    expect(storage.getString('string')).toBe('value');
    expect(storage.getNumber('number')).toBe(12);
    expect(storage.getBoolean('boolean')).toBe(true);
    expect(storage.getAllKeys().sort()).toEqual(['boolean', 'number', 'string']);

    storage.remove('string');
    storage.delete('number');
    expect(storage.getString('string')).toBeUndefined();
    expect(storage.getNumber('number')).toBeUndefined();

    storage.clearAll();
    expect(storage.getAllKeys()).toEqual([]);
  });

  it('creates encrypted MMKV storage with the cached key when none is passed explicitly', () => {
    const createMMKV = jest.fn(() => ({
      getAllKeys: () => ['existing-key'],
    }));

    jest.doMock('react-native-mmkv', () => ({
      createMMKV,
      MMKV: jest.fn(),
    }));
    jest.doMock('../utils/secureKeyManager', () => ({
      getCachedEncryptionKey: jest.fn(() => 'abcd1234securekey'),
    }));

    const { createStorage } = require('../services/StorageAdapter');
    createStorage({ id: 'secure-store' });

    expect(createMMKV).toHaveBeenCalledWith({
      id: 'secure-store',
      encryptionKey: 'abcd1234securekey',
    });
  });

  it('falls back to MemoryStorage when MMKV creation fails', () => {
    jest.doMock('react-native-mmkv', () => ({
      createMMKV: jest.fn(() => {
        throw new Error('mmkv unavailable');
      }),
      MMKV: jest.fn(),
    }));
    jest.doMock('../utils/secureKeyManager', () => ({
      getCachedEncryptionKey: jest.fn(() => 'fallback-key'),
    }));

    const { createStorage, MemoryStorage, createUnencryptedStorage } = require('../services/StorageAdapter');
    const encrypted = createStorage({ id: 'broken-store' });
    const unencrypted = createUnencryptedStorage({ id: 'broken-public-store' });

    expect(encrypted).toBeInstanceOf(MemoryStorage);
    expect(unencrypted).toBeInstanceOf(MemoryStorage);
  });
});

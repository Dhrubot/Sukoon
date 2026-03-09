// src/__tests__/encryptionKeyFallback.test.ts
// Test 5: Encryption key fallback chain — verify SecureStore failure
// produces a device-specific key (not a static string).

import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';

// We need to test the secureKeyManager module's fallback behavior.
// Mock SecureStore to simulate failure, then verify the key is derived
// from device info rather than being a hardcoded string.

const STATIC_FALLBACK_KEYS = [
  'sukoon-fallback-encryption-key-v1',
  'sukoon-temp-encryption-key',
];

describe('Encryption key fallback chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT use static fallback keys (security requirement)', async () => {
    // Simulate SecureStore failure
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore unavailable'));
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('SecureStore unavailable'));

    // Mock expo-crypto digestStringAsync to return a deterministic hash
    (ExpoCrypto.digestStringAsync as jest.Mock).mockResolvedValue(
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    );

    // Import fresh to avoid cached state
    jest.resetModules();
    const { initializeEncryptionKey } = require('../utils/secureKeyManager');

    const key = await initializeEncryptionKey();

    // Key should NOT be any of the old static fallback strings
    for (const staticKey of STATIC_FALLBACK_KEYS) {
      expect(key).not.toBe(staticKey);
    }

    // Key should be a non-empty string
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('digestStringAsync should be called for device-specific derivation on fallback', async () => {
    // Re-mock after resetModules to ensure fresh state
    jest.resetModules();

    // Re-require mocked modules
    const SecureStoreMock = require('expo-secure-store');
    const ExpoCryptoMock = require('expo-crypto');

    SecureStoreMock.getItemAsync.mockRejectedValue(new Error('SecureStore unavailable'));
    SecureStoreMock.setItemAsync.mockRejectedValue(new Error('SecureStore unavailable'));
    ExpoCryptoMock.digestStringAsync.mockResolvedValue('device-specific-hash-value-32chars-padded');

    const { initializeEncryptionKey } = require('../utils/secureKeyManager');

    await initializeEncryptionKey();

    // Verify that SHA-256 digest was called (device-specific key derivation)
    expect(ExpoCryptoMock.digestStringAsync).toHaveBeenCalled();
  });

  it('getCachedEncryptionKey should never return a static fallback', () => {
    jest.resetModules();
    const { getCachedEncryptionKey } = require('../utils/secureKeyManager');

    const key = getCachedEncryptionKey();

    for (const staticKey of STATIC_FALLBACK_KEYS) {
      expect(key).not.toBe(staticKey);
    }
  });
});

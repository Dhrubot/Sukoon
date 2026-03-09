// src/utils/secureKeyManager.ts
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import logger from './logger';

const ENCRYPTION_KEY_STORAGE_KEY = 'sukoon_encryption_key';

/**
 * Generates a random encryption key
 */
function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  const randomValues = new Uint8Array(length);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // expo-crypto fallback (always available on native)
    const bytes = ExpoCrypto.getRandomBytes(length);
    randomValues.set(bytes);
  }

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

/**
 * Gets or creates a secure encryption key for MMKV storage.
 * The key is stored in the device's secure storage (Keychain on iOS, Keystore on Android).
 * This ensures each device has a unique encryption key that persists across app restarts.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  // Web platform doesn't support SecureStore - use a fixed key (less secure but functional)
  if (Platform.OS === 'web') {
    logger.log('🌐 Web platform: Using fallback encryption key');
    return 'sukoon-web-encryption-key-v1';
  }

  try {
    // Try to get existing key
    const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
    
    if (existingKey) {
      logger.log('🔐 Retrieved existing encryption key from secure storage');
      return existingKey;
    }

    // Generate new key if none exists
    const newKey = generateRandomKey(32);
    
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    
    logger.log('🔐 Generated and stored new encryption key in secure storage');
    return newKey;
  } catch (error) {
    logger.error('⚠️ SecureStore error, deriving device-specific fallback key:', error);
    // Derive a device-specific key instead of using a static string.
    // Not as secure as SecureStore but far better than a publicly known constant.
    const deviceSeed = [
      Device.modelName || 'unknown',
      Device.osVersion || '0',
      Device.deviceName || 'device',
      Platform.OS,
    ].join('-');
    // SHA-256 the seed to get a consistent, non-obvious key
    const hash = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      `sukoon-device-key-${deviceSeed}`
    );
    return hash.slice(0, 32);
  }
}

/**
 * Synchronous version that returns a cached key or fallback.
 * Use getOrCreateEncryptionKey() for initial setup.
 */
let cachedKey: string | null = null;

export function getCachedEncryptionKey(): string {
  if (cachedKey) {
    return cachedKey;
  }
  // Return a device-derived fallback synchronously if not yet initialized.
  // This is used briefly before initializeEncryptionKey() completes.
  const seed = `${Platform.OS}-${Device.modelName || 'u'}-${Device.osVersion || '0'}`;
  // Simple hash — this path is only hit for the first few ms of app launch
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return `sukoon-init-${Math.abs(h).toString(36).padStart(12, '0')}`;
}

export function setCachedEncryptionKey(key: string): void {
  cachedKey = key;
}

/**
 * Initialize the encryption key system.
 * Call this early in app startup.
 */
export async function initializeEncryptionKey(): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  setCachedEncryptionKey(key);
  return key;
}

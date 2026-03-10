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
      logger.log(`🔐 [KeyDiag] SecureStore HIT — existing key fingerprint: ${existingKey.slice(0, 4)}...${existingKey.slice(-4)}`);
      return existingKey;
    }

    // Generate new key if none exists
    const newKey = generateRandomKey(32);
    
    await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, newKey, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    
    logger.warn(`🔐 [KeyDiag] SecureStore MISS — generated NEW key fingerprint: ${newKey.slice(0, 4)}...${newKey.slice(-4)} (existing MMKV data will be unreadable!)`);
    return newKey;
  } catch (error) {
    logger.error(`⚠️ [KeyDiag] SecureStore FAILED — error: ${error instanceof Error ? error.message : String(error)}`);
    // SecureStore failed (rare, but real on some Android OEMs).
    // Generate a random key and persist it to unencrypted MMKV.
    // This is less secure than Keychain/Keystore but far better than a
    // deterministic key derived from public device properties.
    try {
      const { createMMKV } = require('react-native-mmkv');
      const fallbackStore = createMMKV({ id: 'sukoon-key-fallback' });
      const existing = fallbackStore.getString('fallback_enc_key');
      if (existing) {
        logger.log(`🔐 [KeyDiag] MMKV fallback HIT — fingerprint: ${existing.slice(0, 4)}...${existing.slice(-4)}`);
        return existing;
      }
      const randomKey = generateRandomKey(32);
      fallbackStore.set('fallback_enc_key', randomKey);
      logger.warn(`🔐 [KeyDiag] MMKV fallback MISS — generated NEW random key (existing data unreadable!)`);
      return randomKey;
    } catch (mmkvError) {
      // Absolute last resort: derive from device properties (deterministic but non-obvious)
      logger.error(`⚠️ [KeyDiag] MMKV fallback also FAILED — using device-derived key. Error: ${mmkvError instanceof Error ? mmkvError.message : String(mmkvError)}`);
      const deviceSeed = [
        Device.modelName || 'unknown',
        Device.osVersion || '0',
        Device.deviceName || 'device',
        Platform.OS,
      ].join('-');
      const hash = await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        `sukoon-device-key-${deviceSeed}`
      );
      return hash.slice(0, 32);
    }
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

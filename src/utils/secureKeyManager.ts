// src/utils/secureKeyManager.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

const ENCRYPTION_KEY_STORAGE_KEY = 'sukoon_encryption_key';

/**
 * Generates a random encryption key
 */
function generateRandomKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  const randomValues = new Uint8Array(length);
  
  // Use crypto.getRandomValues if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
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
    logger.error('⚠️ SecureStore error, using fallback key:', error);
    // Fallback to a deterministic key based on app identifier
    // This is less secure but ensures the app doesn't crash
    return 'sukoon-fallback-encryption-key-v1';
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
  // Return fallback if not yet initialized
  return 'sukoon-temp-encryption-key';
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

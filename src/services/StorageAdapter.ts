// src/services/StorageAdapter.ts
import { Platform } from 'react-native';
import { createMMKV, MMKV } from 'react-native-mmkv';
import { getCachedEncryptionKey } from '../utils/secureKeyManager';
import logger from '../utils/logger';

// 1. Simple In-Memory Storage for fallback (Data is lost on app restart, but app won't crash)
export class MemoryStorage {
  private storage = new Map<string, string>();

  getString(key: string) { 
    return this.storage.get(key); 
  }
  
  getNumber(key: string) { 
    const val = this.storage.get(key);
    return val ? Number(val) : undefined;
  }
  
  getBoolean(key: string) { 
    const val = this.storage.get(key);
    return val === 'true';
  }
  
  set(key: string, value: string | number | boolean) {
    this.storage.set(key, String(value));
  }
  
  remove(key: string) { 
    this.storage.delete(key); 
  }
  
  delete(key: string) { 
    this.storage.delete(key); 
  }
  
  getAllKeys() { 
    return Array.from(this.storage.keys()); 
  }
  
  clearAll() { 
    this.storage.clear(); 
  }
}

// Web storage implementation
class WebStorage {
  private storage = window.localStorage;
  private prefix: string;

  constructor(options: { id: string }) {
    this.prefix = options.id ? `${options.id}_` : '';
  }

  getString(key: string) { 
    return this.storage.getItem(this.prefix + key) || undefined; 
  }
  
  getNumber(key: string) { 
    const v = this.storage.getItem(this.prefix + key);
    return v ? Number(v) : undefined;
  }
  
  getBoolean(key: string) { 
    return this.storage.getItem(this.prefix + key) === 'true'; 
  }
  
  set(key: string, value: string | number | boolean) { 
    this.storage.setItem(this.prefix + key, String(value)); 
  }
  
  remove(key: string) { 
    this.storage.removeItem(this.prefix + key); 
  }
  
  delete(key: string) { 
    this.storage.removeItem(this.prefix + key); 
  }
  
  getAllKeys() { 
    return Object.keys(this.storage)
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.slice(this.prefix.length)); 
  }
  
  clearAll() { 
    const keys = this.getAllKeys();
    keys.forEach(k => this.remove(k));
  }
}

// 2. Factory function for creating encrypted storage instances (PII data)
export function createStorage(options: { id: string; encryptionKey?: string }): MMKV | MemoryStorage | WebStorage {
  if (Platform.OS === 'web') {
    logger.log('🌐 Using WebStorage for web platform');
    return new WebStorage(options);
  }

  try {
    // 🔐 Use secure encryption key from device keychain/keystore
    // Falls back to cached key if SecureStore hasn't been initialized yet
    const secureKey = options.encryptionKey || getCachedEncryptionKey();
    
    // 🎯 NEW v4.x API: Use createMMKV() instead of new MMKV()
    const storage = createMMKV({
      id: options.id,
      encryptionKey: secureKey,
    });
    
    logger.log('✅ MMKV initialized with secure encryption key');
    return storage;
  } catch (error) {
    // 3. Safe Fallback
    logger.error('⚠️ MMKV failed to load. Using in-memory storage fallback.', error);
    return new MemoryStorage();
  }
}

// 3. Factory function for creating unencrypted storage instances (non-PII data)
// Skips AES encryption overhead for high-frequency reads like prayer records, stats, counters.
export function createUnencryptedStorage(options: { id: string }): MMKV | MemoryStorage | WebStorage {
  if (Platform.OS === 'web') {
    return new WebStorage(options);
  }

  try {
    const storage = createMMKV({ id: options.id });
    logger.log('✅ Unencrypted MMKV initialized:', options.id);
    return storage;
  } catch (error) {
    logger.error('⚠️ Unencrypted MMKV failed. Using in-memory fallback.', error);
    return new MemoryStorage();
  }
}
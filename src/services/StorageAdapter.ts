// src/services/StorageAdapter.ts
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


// 2. Factory function for creating encrypted storage instances (PII data)
export function createStorage(options: { id: string; encryptionKey?: string }): MMKV | MemoryStorage {
  try {
    // 🔐 Use secure encryption key from device keychain/keystore
    // Falls back to cached key if SecureStore hasn't been initialized yet
    const secureKey = options.encryptionKey || getCachedEncryptionKey();
    const keyFingerprint = secureKey.length >= 8 ? `${secureKey.slice(0, 4)}...${secureKey.slice(-4)}` : '(short)';
    logger.log(`🔐 [StorageDiag] Creating encrypted MMKV id="${options.id}" with key fingerprint: ${keyFingerprint}`);
    
    // 🎯 NEW v4.x API: Use createMMKV() instead of new MMKV()
    const storage = createMMKV({
      id: options.id,
      encryptionKey: secureKey,
    });
    
    // Sanity check: can we read from this store?
    const keyCount = storage.getAllKeys().length;
    logger.log(`✅ [StorageDiag] MMKV "${options.id}" opened OK — ${keyCount} key(s) found`);
    return storage;
  } catch (error) {
    // 3. Safe Fallback
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error(`🚨 [StorageDiag] MMKV "${options.id}" FAILED to open — falling back to MemoryStorage. Error: ${errMsg}`);
    logger.error(`🚨 [StorageDiag] THIS MEANS ALL ENCRYPTED DATA (settings, location, name) IS INACCESSIBLE`);
    return new MemoryStorage();
  }
}

// 3. Factory function for creating unencrypted storage instances (non-PII data)
// Skips AES encryption overhead for high-frequency reads like prayer records, stats, counters.
export function createUnencryptedStorage(options: { id: string }): MMKV | MemoryStorage {
  try {
    const storage = createMMKV({ id: options.id });
    logger.log('✅ Unencrypted MMKV initialized:', options.id);
    return storage;
  } catch (error) {
    logger.error('⚠️ Unencrypted MMKV failed. Using in-memory fallback.', error);
    return new MemoryStorage();
  }
}
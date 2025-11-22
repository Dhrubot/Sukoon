// src/services/StorageAdapter.ts
import { Platform } from 'react-native';
import { createMMKV, MMKV } from 'react-native-mmkv';

// 1. Simple In-Memory Storage for fallback (Data is lost on app restart, but app won't crash)
class MemoryStorage {
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

// 2. Factory function for creating storage instances
export function createStorage(options: { id: string; encryptionKey?: string }): MMKV | MemoryStorage | WebStorage {
  if (Platform.OS === 'web') {
    console.log('🌐 Using WebStorage for web platform');
    return new WebStorage(options);
  }

  try {
    // 🎯 NEW v4.x API: Use createMMKV() instead of new MMKV()
    const storage = createMMKV({
      id: options.id,
      ...(options.encryptionKey && { encryptionKey: options.encryptionKey }),
    });
    
    console.log('✅ MMKV initialized successfully');
    return storage;
  } catch (error) {
    // 3. Safe Fallback
    console.error('⚠️ MMKV failed to load. Using in-memory storage fallback.', error);
    return new MemoryStorage();
  }
}
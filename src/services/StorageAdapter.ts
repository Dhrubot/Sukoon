import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { AsyncStorageFallback } from './AsyncStorageFallback';

// Web storage implementation that mimics MMKV API
class WebStorage {
  private storage: Storage;
  private storagePrefix: string;

  constructor(options: { id: string }) {
    this.storage = window.localStorage;
    this.storagePrefix = options.id ? `${options.id}_` : '';
  }

  getString(key: string): string | undefined {
    const value = this.storage.getItem(this.storagePrefix + key);
    return value !== null ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.storage.getItem(this.storagePrefix + key);
    return value !== null ? Number(value) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.storage.getItem(this.storagePrefix + key);
    if (value === null) return undefined;
    return value === 'true';
  }

  set(key: string, value: string | number | boolean): void {
    this.storage.setItem(this.storagePrefix + key, String(value));
  }

  delete(key: string): void {
    this.storage.removeItem(this.storagePrefix + key);
  }

  clearAll(): void {
    // Only clear items with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.storagePrefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => this.storage.removeItem(key));
  }
}

// Factory function that returns appropriate storage implementation based on platform
export function createStorage(options: { id: string; encryptionKey?: string }): MMKV | WebStorage | AsyncStorageFallback {
  if (Platform.OS === 'web') {
    console.log('Using WebStorage for storage');
    return new WebStorage(options);
  } else {
    try {
      console.log('Attempting to use MMKV for storage');
      return new MMKV(options);
    } catch (error) {
      console.warn('MMKV initialization failed, falling back to AsyncStorage:', error);
      return new AsyncStorageFallback(options);
    }
  }
}

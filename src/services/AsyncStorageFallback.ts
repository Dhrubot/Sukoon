import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage fallback for when MMKV fails to initialize
export class AsyncStorageFallback {
  private storagePrefix: string;

  constructor(options: { id: string }) {
    this.storagePrefix = options.id ? `${options.id}_` : '';
  }

  // We need to handle both synchronous and asynchronous usage patterns
  getString(key: string): string | undefined {
    let value: string | null = null;
    AsyncStorage.getItem(this.storagePrefix + key)
      .then(result => { value = result; })
      .catch(error => console.error('AsyncStorageFallback getString error:', error));
    return value !== null ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.getString(key);
    return value !== undefined ? Number(value) : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.getString(key);
    if (value === undefined) return undefined;
    return value === 'true';
  }

  set(key: string, value: string | number | boolean): void {
    AsyncStorage.setItem(this.storagePrefix + key, String(value))
      .catch(error => console.error('AsyncStorageFallback set error:', error));
  }

  delete(key: string): void {
    AsyncStorage.removeItem(this.storagePrefix + key)
      .catch(error => console.error('AsyncStorageFallback delete error:', error));
  }

  clearAll(): void {
    // This is a simplified implementation - ideally, we should only clear items with our prefix
    AsyncStorage.getAllKeys()
      .then(keys => {
        const keysToRemove = keys.filter(key => key.startsWith(this.storagePrefix));
        if (keysToRemove.length > 0) {
          AsyncStorage.multiRemove(keysToRemove);
        }
      })
      .catch(error => console.error('AsyncStorageFallback clearAll error:', error));
  }
}
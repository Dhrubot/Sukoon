import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage fallback for when MMKV fails to initialize
export class AsyncStorageFallback {
  private storagePrefix: string;
  private cachedKeys: string[] = [];

  constructor(options: { id: string }) {
    this.storagePrefix = options.id ? `${options.id}_` : '';
    // Initialize cached keys
    this.updateKeyCache();
  }

  // Helper method to update key cache in the background
  private updateKeyCache(): void {
    AsyncStorage.getAllKeys()
      .then(keys => {
        // Filter keys that belong to our namespace and remove prefix
        this.cachedKeys = keys
          .filter(key => key.startsWith(this.storagePrefix))
          .map(key => key.slice(this.storagePrefix.length));
      })
      .catch(error => console.error('AsyncStorageFallback updateKeyCache error:', error));
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

  getAllKeys(): string[] {
    // Return cached keys - note this may not be 100% up-to-date
    // but it's a necessary tradeoff to maintain API compatibility
    // Trigger a cache update for future calls
    this.updateKeyCache();
    return [...this.cachedKeys];
  }

  set(key: string, value: string | number | boolean): void {
    AsyncStorage.setItem(this.storagePrefix + key, String(value))
      .then(() => this.updateKeyCache()) // Update key cache after adding a new key
      .catch(error => console.error('AsyncStorageFallback set error:', error));
  }

  delete(key: string): void {
    AsyncStorage.removeItem(this.storagePrefix + key)
      .then(() => this.updateKeyCache()) // Update key cache after removing a key
      .catch(error => console.error('AsyncStorageFallback delete error:', error));
  }

  clearAll(): void {
    // This is a simplified implementation - ideally, we should only clear items with our prefix
    AsyncStorage.getAllKeys()
      .then(keys => {
        const keysToRemove = keys.filter(key => key.startsWith(this.storagePrefix));
        if (keysToRemove.length > 0) {
          AsyncStorage.multiRemove(keysToRemove)
            .then(() => {
              this.cachedKeys = []; // Clear the cache after clearAll
            });
        }
      })
      .catch(error => console.error('AsyncStorageFallback clearAll error:', error));
  }
}
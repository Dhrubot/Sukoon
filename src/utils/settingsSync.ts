import StorageService from '../services/StorageService';
import { UserSettings } from '../types';

/**
 * Unified settings sync — writes to both MMKV (StorageService) and Zustand store
 * with deep merge for nested objects.
 *
 * Usage:
 *   const { updateUserSettings } = useStore();
 *   syncUserSettings(updates, updateUserSettings);
 */
export function syncUserSettings(
  updates: Partial<UserSettings>,
  zustandUpdate: (updates: Partial<UserSettings>) => void
): void {
  // Both StorageService.updateUserSettings and Zustand's updateUserSettings
  // now perform deep merges (fixed in Phase 1), so we just call both.
  StorageService.updateUserSettings(updates);
  zustandUpdate(updates);
}

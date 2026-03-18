import { UserSettings } from '../types';

/**
 * Unified settings sync — delegates to Zustand's updateUserSettings which
 * performs a deep merge and writes through to StorageService automatically.
 *
 * Usage:
 *   const { updateUserSettings } = useStore();
 *   syncUserSettings(updates, updateUserSettings);
 */
export function syncUserSettings(
  updates: Partial<UserSettings>,
  zustandUpdate: (updates: Partial<UserSettings>) => void
): void {
  // Zustand's updateUserSettings does deep merge + write-through to StorageService.
  // No need to call StorageService directly (its updateUserSettings is now private).
  zustandUpdate(updates);
}

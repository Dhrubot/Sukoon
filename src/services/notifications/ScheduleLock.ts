// src/services/notifications/ScheduleLock.ts
//
// Cross-process scheduling lock abstraction.
//
// Android: backed by native SharedPreferences (BootPrefsModule.acquireScheduleLock /
//   releaseScheduleLock).  SharedPreferences uses a kernel file lock that is
//   shared across processes, making it safe when both the foreground app and the
//   headless boot task attempt to schedule simultaneously.
//
// iOS: MMKV (single-process on iOS — no headless boot task).  The existing
//   MMKV pattern is retained as-is.

import { NativeModules, Platform } from 'react-native';
import StorageService from '../StorageService';
import { SCHEDULING_LOCK_TIMEOUT_MS } from '../../constants/NotificationConstants';
import logger from '../../utils/logger';

const MMKV_LOCK_KEY = 'notification_scheduling_lock';

export const ScheduleLock = {
  /**
   * Attempt to acquire the scheduling lock.
   *
   * Returns `true` if the lock was newly acquired (caller may proceed).
   * Returns `false` if a non-expired lock is already held by another caller /
   * process (caller must skip scheduling).
   *
   * On Android the lock is cross-process via SharedPreferences.
   * On iOS the lock is in-process via MMKV.
   */
  async acquire(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const module = NativeModules.BootPrefsModule;
        if (!module?.acquireScheduleLock) {
          // Native module unavailable — fall through to MMKV fallback
          logger.warn('⚠️ ScheduleLock: BootPrefsModule.acquireScheduleLock unavailable, falling back to MMKV');
        } else {
          const acquired: boolean = await module.acquireScheduleLock(SCHEDULING_LOCK_TIMEOUT_MS);
          return acquired;
        }
      } catch (err) {
        logger.warn('⚠️ ScheduleLock: Android native acquire failed, falling back to MMKV:', err);
      }
    }

    // iOS or Android fallback: MMKV-backed single-process lock
    const lockValue = StorageService.getValue(MMKV_LOCK_KEY);
    if (lockValue) {
      const elapsed = Date.now() - parseInt(lockValue, 10);
      if (elapsed < SCHEDULING_LOCK_TIMEOUT_MS) {
        return false; // Lock held and not stale
      }
      // Lock is stale — steal it
    }
    StorageService.setValue(MMKV_LOCK_KEY, Date.now().toString());
    return true;
  },

  /**
   * Release the scheduling lock so the next caller may proceed.
   * Safe to call even when the lock is not held (idempotent).
   */
  async release(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        const module = NativeModules.BootPrefsModule;
        if (!module?.releaseScheduleLock) {
          logger.warn('⚠️ ScheduleLock: BootPrefsModule.releaseScheduleLock unavailable, clearing MMKV fallback');
        } else {
          await module.releaseScheduleLock();
          return;
        }
      } catch (err) {
        logger.warn('⚠️ ScheduleLock: Android native release failed, clearing MMKV fallback:', err);
      }
    }

    // iOS or Android fallback
    StorageService.deleteValue(MMKV_LOCK_KEY);
  },
};

export default ScheduleLock;

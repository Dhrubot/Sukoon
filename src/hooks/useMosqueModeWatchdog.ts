// src/hooks/useMosqueModeWatchdog.ts
//
// Phase 1 — JS foreground watchdog for Mosque Mode.
//
// Subscribes to app-foreground transitions via useAppStateChange and
// fires MosqueModeService.runForegroundWatchdog() to catch the
// "stuck silent" failure mode (AlarmManager restore alarm was killed).
//
// Also sets a single setTimeout keyed off state.restoreTime so that,
// if the user keeps the app open through prayer, the watchdog fires
// within a few seconds of the window expiring — without polling.
//
// Android-only: watchdog logic in runForegroundWatchdog short-circuits on iOS.

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAppStateChange } from './useAppStateChange';
import { useStore } from '../store/useStore';
import MosqueModeService from '../services/MosqueModeService';
import logger from '../utils/logger';

/** Minimum milliseconds between watchdog runs (debounce). */
const WATCHDOG_DEBOUNCE_MS = 5_000;

export function useMosqueModeWatchdog(): void {
  // Android-only — nothing to do on iOS (no ringer control).
  if (Platform.OS !== 'android') return;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useMosqueModeWatchdogInternal();
}

function useMosqueModeWatchdogInternal(): void {
  const currentTime = useStore((s) => s.currentTime);

  const lastRunRef        = useRef<number>(0);
  const restoreTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runWatchdog = useCallback(async (trigger: string) => {
    const now = Date.now();
    if (now - lastRunRef.current < WATCHDOG_DEBOUNCE_MS) {
      return; // debounce — another trigger fired within the window
    }
    lastRunRef.current = now;

    try {
      const result = await MosqueModeService.runForegroundWatchdog();
      if (result !== 'none') {
        logger.log(`[MosqueModeWatchdog] trigger=${trigger} result=${result}`);
      }
    } catch (err) {
      logger.error('[MosqueModeWatchdog] error during watchdog run:', err);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Trigger 1: app foreground transition
  // -----------------------------------------------------------------------
  useAppStateChange(useCallback((nextState) => {
    if (nextState === 'active') {
      void runWatchdog('foreground');
    }
  }, [runWatchdog]));

  // -----------------------------------------------------------------------
  // Trigger 2: 60-second tick (currentTime changes whenever the store ticks)
  // -----------------------------------------------------------------------
  useEffect(() => {
    void runWatchdog('tick');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]);

  // -----------------------------------------------------------------------
  // Trigger 3: single setTimeout at restoreTime — belt-and-suspenders for
  // the in-process case where the app stays open through the prayer window.
  // Re-evaluated each tick so we always have the latest restoreTime.
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Clean up any previous timer.
    if (restoreTimerRef.current !== null) {
      clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    const activeState = MosqueModeService.getActiveMosqueMode();
    if (!activeState || !activeState.managedBySukoon) return;

    const msUntilRestore = activeState.restoreTime.getTime() - Date.now();
    if (msUntilRestore <= 0) {
      // Already past — watchdog will catch it on the next tick run above.
      return;
    }

    // Fire slightly after restoreTime to give AlarmManager a chance first.
    const delay = msUntilRestore + 3_000;
    restoreTimerRef.current = setTimeout(() => {
      restoreTimerRef.current = null;
      void runWatchdog('restore_timer');
    }, delay);

    return () => {
      if (restoreTimerRef.current !== null) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };
  }, [currentTime, runWatchdog]);
}

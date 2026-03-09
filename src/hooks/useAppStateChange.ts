// src/hooks/useAppStateChange.ts
// Consolidated AppState listener — single native bridge subscription
// shared by all consumers. Avoids 3+ duplicate AppState.addEventListener calls.

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type AppStateCallback = (nextState: AppStateStatus) => void;

const listeners = new Set<AppStateCallback>();
let subscription: ReturnType<typeof AppState.addEventListener> | null = null;

function ensureSubscription() {
  if (subscription) return;
  subscription = AppState.addEventListener('change', (nextState) => {
    for (const cb of listeners) {
      cb(nextState);
    }
  });
}

function removeSubscriptionIfEmpty() {
  if (listeners.size === 0 && subscription) {
    subscription.remove();
    subscription = null;
  }
}

/**
 * Register a callback for AppState changes via a single shared native listener.
 * The callback is stable — pass a ref-based function or useCallback-wrapped handler.
 */
export function useAppStateChange(callback: AppStateCallback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler: AppStateCallback = (nextState) => {
      callbackRef.current(nextState);
    };

    listeners.add(handler);
    ensureSubscription();

    return () => {
      listeners.delete(handler);
      removeSubscriptionIfEmpty();
    };
  }, []);
}

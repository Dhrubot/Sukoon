import React from 'react';
import { InteractionManager } from 'react-native';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { useFocusEffect } from '@react-navigation/native';
import logger from '../utils/logger';

const isBenignKeepAwakeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('current activity is no longer available') ||
    message.includes('activity has been destroyed') ||
    message.includes('no activity') ||
    message.includes('expokeepawake.activate') ||
    message.includes('expokeepawake.deactivate') ||
    message.includes('has been rejected')
  );
};

const logKeepAwakeError = (phase: 'activation' | 'deactivation', error: unknown) => {
  if (!isBenignKeepAwakeError(error)) {
    logger.warn(`Keep awake ${phase} failed:`, error);
  }
};

// Some expo-keep-awake versions return undefined synchronously when the
// native module is unavailable. Guard against ".catch is not a function".
const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  !!value && typeof (value as { then?: unknown }).then === 'function';

export function useFocusKeepAwake(tag: string) {
  useFocusEffect(
    React.useCallback(() => {
      let isScreenActive = true;
      let keepAwakeActive = false;

      const activationTask = InteractionManager.runAfterInteractions(() => {
        if (!isScreenActive) {
          return;
        }

        try {
          const activation = activateKeepAwakeAsync(tag);
          if (isPromiseLike(activation)) {
            // .then(onFulfilled, onRejected) attaches the rejection handler
            // in the same microtask as the resolution handler — avoids the
            // dev-mode LogBox window of .then().catch().
            activation.then(
              () => {
                keepAwakeActive = true;
              },
              (error) => {
                logKeepAwakeError('activation', error);
              },
            );
          } else {
            keepAwakeActive = true;
          }
        } catch (error) {
          logKeepAwakeError('activation', error);
        }
      });

      return () => {
        isScreenActive = false;
        activationTask.cancel();
        if (!keepAwakeActive) {
          return;
        }

        try {
          const deactivation = deactivateKeepAwake(tag);
          if (isPromiseLike(deactivation)) {
            deactivation.then(undefined, (error) => {
              logKeepAwakeError('deactivation', error);
            });
          }
        } catch (error) {
          logKeepAwakeError('deactivation', error);
        }
      };
    }, [tag])
  );
}

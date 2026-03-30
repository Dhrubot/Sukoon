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
    message.includes('no activity')
  );
};

const logKeepAwakeError = (phase: 'activation' | 'deactivation', error: unknown) => {
  if (!isBenignKeepAwakeError(error)) {
    logger.warn(`Keep awake ${phase} failed:`, error);
  }
};

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
          void activation
            .then(() => {
              keepAwakeActive = true;
            })
            .catch((error) => {
              logKeepAwakeError('activation', error);
            });
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
          void deactivation.catch((error) => {
            logKeepAwakeError('deactivation', error);
          });
        } catch (error) {
          logKeepAwakeError('deactivation', error);
        }
      };
    }, [tag])
  );
}

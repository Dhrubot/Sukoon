// src/hooks/useNotificationRescheduler.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import NotificationService from '../services/NotificationService';

export const useNotificationRescheduler = () => {
  useEffect(() => {
    // Check on mount
    checkAndReschedule();

    // Check on resume
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAndReschedule();
      }
    });

    return () => subscription.remove();
  }, []);

  const checkAndReschedule = async () => {
    try {
      await NotificationService.maybeRescheduleExtendedNotifications(24);
    } catch (error) {
      console.error('❌ Reschedule failed:', error);
    }
  };
};
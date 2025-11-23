// src/hooks/useNotificationRescheduler.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';

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
      // 1. Get the last time we ran the batch scheduler
      const lastRunStr = StorageService.getValue('last_batch_schedule_date');
      const lastRun = lastRunStr ? new Date(lastRunStr) : new Date(0);
      const now = new Date();

      // 2. Calculate hours passed
      const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      // 3. Logic: If it's been more than 24 hours, refill the queue
      // This is better than "today vs yesterday" because it handles timezones better
      if (hoursSinceLastRun > 24) {
        console.log(`🔄 Queue might be low (${hoursSinceLastRun.toFixed(1)}h). Refilling 14 days...`);
        
        // CALL THE BATCH METHOD HERE
        await NotificationService.scheduleExtendedNotifications();
        
        // Save the timestamp
        StorageService.setValue('last_batch_schedule_date', now.toISOString());
      } else {
        console.log('✅ Notification queue is fresh.');
      }
    } catch (error) {
      console.error('❌ Reschedule failed:', error);
    }
  };
};
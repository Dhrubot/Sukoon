// src/providers/NavigationProvider.tsx
import React, { createRef, useEffect, useMemo } from 'react';
import { NavigationContainer, NavigationContainerRef, DefaultTheme } from '@react-navigation/native';
import { useTheme } from './ThemeProvider';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';
import ReminderStateService from '../services/ReminderStateService';
import { PrayerName, PrayerRecord } from '../types';
import { useStore } from '../store/useStore';
import { getLocalDateKey } from '../utils/dateHelpers';
import WidgetService from '../services/WidgetService';

// Create navigation reference
export const navigationRef = createRef<NavigationContainerRef<any>>();

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const { theme, themeMode } = useTheme();

  const navTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: themeMode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background.primary,
      card: theme.colors.background.primary,
      text: theme.colors.text.primary,
      border: theme.colors.border.primary,
      primary: theme.colors.primary.DEFAULT,
      notification: theme.colors.primary.DEFAULT,
    },
  }), [theme, themeMode]);

  useEffect(() => {
    // Register navigation handler for notifications
    const handleNotificationNavigation = (prayer: PrayerName, action: string) => {
      console.log(`Handling notification action: ${action} for prayer: ${prayer}`);

      if (navigationRef.current?.isReady()) {
        switch (action) {
          case "complete": {
            // P0-C FIX: Create PrayerRecord directly instead of relying on
            // HomeScreen to consume a markPrayerComplete param (which it never did).
            const dateKey = getLocalDateKey();
            const existing = StorageService.getPrayerRecord(dateKey, prayer);

            if (!existing || existing.status !== 'prayed') {
              const record: PrayerRecord = {
                id: `prayer_${Date.now()}`,
                date: dateKey,
                prayer: prayer,
                status: 'prayed',
                prayedAt: new Date(),
                mindfulnessCompleted: false,
                reflectionAdded: false,
              };
              StorageService.savePrayerRecordWithTracking(record);
              useStore.getState().addPrayerRecord(record);
              WidgetService.reloadWidgets();
            }

            // Also close the reminder flow for this prayer
            const prayerId = `${prayer}-${dateKey}`;
            ReminderStateService.markPrayerCompleted(prayerId);
            NotificationService.cancelPrayerReminderFlow(prayerId).catch(() => {});

            // Navigate to Home so user sees the updated state
            navigationRef.current.navigate("MainTabs", {
              screen: "Home",
            });
            break;
          }
          case "prepare": {
            // P0-B FIX: Resolve prayer name to full PrayerTime object.
            // MindfulnessFlow expects { prayer: { name, time, timestamp, ... } }
            const todayPrayers = useStore.getState().todayPrayerTimes;
            const prayerTime = todayPrayers.find(p => p.name === prayer);

            if (prayerTime) {
              // Serialize Date → ISO string for navigation params (MindfulnessFlow converts back)
              const serializablePrayer = {
                ...prayerTime,
                time: prayerTime.time.toISOString(),
              };
              navigationRef.current.navigate("MindfulnessFlow", {
                prayer: serializablePrayer,
              });
            } else {
              // Fallback: prayer times not loaded yet, go to Home
              console.warn(`⚠️ Could not resolve prayer time for ${prayer}, navigating to Home`);
              navigationRef.current.navigate("MainTabs");
            }
            break;
          }
          default:
            navigationRef.current.navigate("MainTabs");
            break;
        }
      }
    };

    // Register the handler with NotificationService
    NotificationService.registerNavigationHandler(handleNotificationNavigation);
    console.log("Navigation handler registered");
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {children}
    </NavigationContainer>
  );
};
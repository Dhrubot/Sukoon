// src/providers/NavigationProvider.tsx
import React, { createRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, ParamListBase } from '@react-navigation/native';
import { useTheme } from './ThemeProvider';
import NotificationService from '../services/NotificationService';
import StorageService from '../services/StorageService';
import ReminderStateService from '../services/ReminderStateService';
import { PrayerName, PrayerRecord } from '../types';

const VALID_PRAYER_NAMES = new Set<string>(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
const VALID_DEEP_LINK_ACTIONS = new Set<string>(['prepare', 'prayed']);
import { useStore } from '../store/useStore';
import { getLocalDateKey } from '../utils/dateHelpers';
import WidgetService from '../services/WidgetService';
import AnalyticsService from '../services/AnalyticsService';
import PerformanceService from '../services/PerformanceService';
import logger from '../utils/logger';

// Create navigation reference
export const navigationRef = createRef<NavigationContainerRef<ParamListBase>>();

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const { theme, themeMode } = useTheme();
  const routeNameRef = useRef<string | undefined>(undefined);
  const screenTraceStopRef = useRef<(() => void) | null>(null as (() => void) | null);

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
      logger.log(`Handling notification action: ${action} for prayer: ${prayer}`);

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
              logger.warn(`⚠️ Could not resolve prayer time for ${prayer}, navigating to Home`);
              navigationRef.current.navigate("MainTabs");
            }
            break;
          }
          default:
            // Pass prayer name so HomeScreen can show QuickLogSheet
            if (prayer) {
              navigationRef.current.navigate("MainTabs", {
                screen: "Home",
                params: { quickLogPrayer: prayer },
              });
            } else {
              navigationRef.current.navigate("MainTabs");
            }
            break;
        }
      }
    };

    NotificationService.registerNavigationHandler(handleNotificationNavigation);

    // Deep-link handler for Live Activity actions (sukoon://prepare?prayer=X, sukoon://prayed?prayer=X)
    const handleDeepLink = (event: { url: string }) => {
      try {
        const url = new URL(event.url);
        if (url.protocol !== 'sukoon:') return;

        const action = url.hostname;
        if (!VALID_DEEP_LINK_ACTIONS.has(action)) {
          logger.warn('Unknown deep link action:', action);
          return;
        }

        const prayerParam = url.searchParams.get('prayer');
        if (!prayerParam || !VALID_PRAYER_NAMES.has(prayerParam)) {
          logger.warn('Invalid prayer name in deep link:', prayerParam);
          return;
        }
        const prayer = prayerParam as PrayerName;

        if (action === 'prepare') {
          handleNotificationNavigation(prayer, 'prepare');
        } else if (action === 'prayed') {
          handleNotificationNavigation(prayer, 'complete');
        }
      } catch (e) {
        logger.warn('Failed to parse deep link URL:', event.url, e);
      }
    };

    const linkingSub = Linking.addEventListener('url', handleDeepLink);

    // Handle cold-start deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      NotificationService.registerNavigationHandler(null);
      linkingSub.remove();
    };
  }, []);

  const onNavigationReady = useCallback(() => {
    void AnalyticsService.preload();
    void PerformanceService.preload();
    const currentRoute = navigationRef.current?.getCurrentRoute();
    routeNameRef.current = currentRoute?.name;
    if (currentRoute?.name) {
      AnalyticsService.logScreenView(currentRoute.name);
    }
    NotificationService.consumeInitialNotificationResponse().catch((error) => {
      logger.warn('Failed to consume initial notification response:', error);
    });
  }, []);

  const onNavigationStateChange = useCallback(async () => {
    const previousRouteName = routeNameRef.current;
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;

    if (currentRouteName && previousRouteName !== currentRouteName) {
      // Stop previous screen trace
      if (screenTraceStopRef.current) {
        screenTraceStopRef.current();
        screenTraceStopRef.current = null;
      }
      // Log screen view + start new trace
      AnalyticsService.logScreenView(currentRouteName);
      const stop = await PerformanceService.traceScreenLoad(currentRouteName);
      screenTraceStopRef.current = stop;
    }
    routeNameRef.current = currentRouteName;
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
      {children}
    </NavigationContainer>
  );
};

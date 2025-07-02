// src/providers/NavigationProvider.tsx
import React, { createRef, useEffect } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import NotificationService from '../services/NotificationService';
import { PrayerName } from '../types';

// Create navigation reference
export const navigationRef = createRef<NavigationContainerRef<any>>();

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  useEffect(() => {
    // Register navigation handler for notifications
    const handleNotificationNavigation = (prayer: PrayerName, action: string) => {
      console.log(`Handling notification action: ${action} for prayer: ${prayer}`);

      if (navigationRef.current?.isReady()) {
        switch (action) {
          case "complete":
            navigationRef.current.navigate("MainTabs", {
              screen: "Home",
              params: { markPrayerComplete: prayer },
            });
            break;
          case "prepare":
            navigationRef.current.navigate("MindfulnessFlow", {
              prayer: prayer,
            });
            break;
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
    <NavigationContainer ref={navigationRef}>
      {children}
    </NavigationContainer>
  );
};
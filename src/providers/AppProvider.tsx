// src/providers/AppProvider.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ServiceProvider } from './ServiceProvider';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ServiceProvider>
        {children}
      </ServiceProvider>
    </SafeAreaProvider>
  );
};
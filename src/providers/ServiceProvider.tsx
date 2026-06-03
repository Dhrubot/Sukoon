// ===== 2. src/providers/ServiceProvider.tsx =====
import React from 'react';
import { useServiceInitialization } from '../hooks/useServiceInitialization';
import { useMosqueModeWatchdog } from '../hooks/useMosqueModeWatchdog';

interface ServiceProviderProps {
  children: React.ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  useServiceInitialization();
  // Phase 1: mosque mode foreground watchdog — catches missed restore alarms.
  useMosqueModeWatchdog();
  return <>{children}</>;
};
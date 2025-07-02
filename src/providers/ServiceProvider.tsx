// ===== 2. src/providers/ServiceProvider.tsx =====
import React from 'react';
import { useServiceInitialization } from '../hooks/useServiceInitialization';

interface ServiceProviderProps {
  children: React.ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  useServiceInitialization();
  return <>{children}</>;
};
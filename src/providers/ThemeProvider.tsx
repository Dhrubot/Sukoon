// src/providers/ThemeProvider.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { StatusBar } from 'react-native';
import { AppTheme, ThemeMode, createTheme } from '../theme';
import StorageService from '../services/StorageService';

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('blackout');
  const [theme, setTheme] = useState<AppTheme>(createTheme('blackout'));

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when mode changes
  useEffect(() => {
    const newTheme = createTheme(themeMode);
    setTheme(newTheme);
    
    // Update status bar (blackout uses light-content like dark)
    StatusBar.setBarStyle(
      themeMode === 'light' ? 'dark-content' : 'light-content',
      true
    );
    
    // Save theme preference
    saveThemePreference(themeMode);
  }, [themeMode]);

  const loadThemePreference = () => {
    try {
      const settings = StorageService.getUserSettings();
      const savedTheme = settings?.theme;
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'blackout') {
        setThemeModeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = (mode: ThemeMode) => {
    try {
      const settings = StorageService.getUserSettings();
      if (settings) {
        StorageService.setUserSettings({
          ...settings,
          theme: mode,
        });
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      const cycle: Record<ThemeMode, ThemeMode> = {
        dark: 'light',
        light: 'blackout',
        blackout: 'dark',
      };
      return cycle[prev];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

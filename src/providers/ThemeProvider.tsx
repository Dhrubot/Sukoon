// src/providers/ThemeProvider.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { StatusBar, Appearance } from 'react-native';
import { AppTheme, ThemeMode, createTheme } from '../theme';
import { useStore } from '../store/useStore';

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
  const storedTheme = useStore((state) => state.userSettings?.theme);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const os = Appearance.getColorScheme();
    return os === 'light' ? 'light' : 'midnight';
  });
  const [theme, setTheme] = useState<AppTheme>(() => {
    const os = Appearance.getColorScheme();
    return createTheme(os === 'light' ? 'light' : 'midnight');
  });

  // Update theme when mode changes
  useEffect(() => {
    const newTheme = createTheme(themeMode);
    setTheme(newTheme);
    
    // Update status bar (midnight uses light-content like dark)
    StatusBar.setBarStyle(
      themeMode === 'light' ? 'dark-content' : 'light-content',
      true
    );
  }, [themeMode]);

  useEffect(() => {
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'midnight') {
      setThemeModeState(storedTheme);
    }
  }, [storedTheme]);

  const persistThemeMode = (mode: ThemeMode) => {
    const { userSettings, updateUserSettings } = useStore.getState();
    if (!userSettings || userSettings.theme === mode) return;
    updateUserSettings({ theme: mode });
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    persistThemeMode(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      const cycle: Record<ThemeMode, ThemeMode> = {
        dark: 'light',
        light: 'midnight',
        midnight: 'dark',
      };
      const next = cycle[prev];
      persistThemeMode(next);
      return next;
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

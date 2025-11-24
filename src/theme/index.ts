// src/theme/index.ts
import { darkTheme, lightTheme, Theme } from './colors';
import { spacing, borderRadius, shadows } from './spacing';
import { typography } from './typography';

export type ThemeMode = 'dark' | 'light';

export interface AppTheme {
  mode: ThemeMode;
  colors: Theme;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  typography: typeof typography;
}

export const createTheme = (mode: ThemeMode): AppTheme => ({
  mode,
  colors: mode === 'dark' ? darkTheme : lightTheme,
  spacing,
  borderRadius,
  shadows,
  typography,
});

// Export default dark theme
export const defaultTheme = createTheme('dark');

// Export individual modules for direct access if needed
export { darkTheme, lightTheme, spacing, borderRadius, shadows, typography };
export type { Theme };

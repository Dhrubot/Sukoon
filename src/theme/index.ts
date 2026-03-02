// src/theme/index.ts
import { darkTheme, lightTheme, midnightTheme, Theme } from './colors';
import { spacing, borderRadius, shadows } from './spacing';
import { typography, midnightTypography } from './typography';
import { iconSizes } from './iconSizes';

export type ThemeMode = 'dark' | 'light' | 'midnight';

export interface AppTheme {
  mode: ThemeMode;
  colors: Theme;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  typography: typeof typography;
  iconSizes: typeof iconSizes;
}

const themeColors: Record<ThemeMode, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  midnight: midnightTheme,
};

const themeTypography: Record<ThemeMode, typeof typography> = {
  dark: typography,
  light: typography,
  midnight: midnightTypography,
};

export const createTheme = (mode: ThemeMode): AppTheme => ({
  mode,
  colors: themeColors[mode],
  spacing,
  borderRadius,
  shadows,
  typography: themeTypography[mode],
  iconSizes,
});

// Export default midnight theme
export const defaultTheme = createTheme('midnight');

// Export individual modules for direct access if needed
export { darkTheme, lightTheme, midnightTheme, spacing, borderRadius, shadows, typography, midnightTypography, iconSizes };
export type { Theme };

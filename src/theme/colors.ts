// src/theme/colors.ts
export const darkTheme = {
  // Backgrounds
  background: {
    primary: '#1A1F3A',
    secondary: '#252B47',
    tertiary: '#2D3454',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#A0AEC0',
    muted: '#6C7A89',
    inverse: '#1A1F3A',
  },
  
  // Primary (Turquoise)
  primary: {
    DEFAULT: '#00C9A7',
    light: '#1DD1A1',
    dark: '#00A589',
    contrast: '#FFFFFF',
  },
  
  // Secondary (Gray)
  secondary: {
    DEFAULT: '#6C7A89',
    light: '#95A5A6',
    dark: '#4A5568',
  },
  
  // Status colors
  status: {
    success: '#00C9A7',
    warning: '#FFB74D',
    error: '#F44336',
    info: '#00C9A7',
  },
  
  // Prayer colors
  prayer: {
    fajr: '#3949AB',
    dhuhr: '#FFB74D',
    asr: '#FF9800',
    maghrib: '#E91E63',
    isha: '#512DA8',
  },
  
  // UI Elements
  border: {
    primary: '#2D3454',
    secondary: '#252B47',
    focus: '#00C9A7',
  },
  
  // Cards
  card: {
    background: '#252B47',
    hover: '#2D3454',
    border: '#2D3454',
  },
  
  // Interactive elements
  interactive: {
    active: '#00C9A7',
    hover: '#2D3454',
    disabled: '#6C7A89',
  },
};

export const lightTheme = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#E0E0E0',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text
  text: {
    primary: '#212121',
    secondary: '#757575',
    muted: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  
  // Primary (Turquoise - adjusted for light theme)
  primary: {
    DEFAULT: '#00A589',
    light: '#00C9A7',
    dark: '#008B73',
    contrast: '#FFFFFF',
  },
  
  // Secondary (Gray)
  secondary: {
    DEFAULT: '#757575',
    light: '#BDBDBD',
    dark: '#424242',
  },
  
  // Status colors
  status: {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  
  // Prayer colors
  prayer: {
    fajr: '#3949AB',
    dhuhr: '#FFB74D',
    asr: '#FF9800',
    maghrib: '#E91E63',
    isha: '#512DA8',
  },
  
  // UI Elements
  border: {
    primary: '#E0E0E0',
    secondary: '#F0F0F0',
    focus: '#00A589',
  },
  
  // Cards
  card: {
    background: '#FFFFFF',
    hover: '#F5F5F5',
    border: '#E0E0E0',
  },
  
  // Interactive elements
  interactive: {
    active: '#00A589',
    hover: '#F5F5F5',
    disabled: '#BDBDBD',
  },
};

export type Theme = typeof darkTheme;
export type ThemeColors = keyof Theme;

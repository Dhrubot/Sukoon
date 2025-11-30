// src/hooks/useThemedStyles.ts
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../theme';

/**
 * Hook to create themed styles
 * Usage:
 * const styles = useThemedStyles(createStyles);
 * 
 * where createStyles = (theme: AppTheme) => StyleSheet.create({...})
 */
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  createStyles: (theme: AppTheme) => T
): T => {
  const { theme } = useTheme();
  
  return useMemo(() => createStyles(theme), [theme, createStyles]);
};

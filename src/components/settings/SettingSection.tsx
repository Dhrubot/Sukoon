// src/components/settings/SettingSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  section: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    backgroundColor: theme.colors.background.secondary,
    borderBottomColor: theme.colors.border.primary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    letterSpacing: 0.5,
    color: theme.colors.text.secondary,
  },
});
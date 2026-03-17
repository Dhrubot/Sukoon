// src/components/settings/SettingSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => {
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
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginBottom: theme.spacing.md,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: theme.colors.text.muted,
  },
});

// src/components/settings/SettingSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.section, { 
      backgroundColor: theme.colors.background.secondary,
      borderBottomColor: theme.colors.border.primary 
    }]}>
      {title && <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>{title}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
    marginBottom: 12,
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
});
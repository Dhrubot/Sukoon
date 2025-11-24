// src/components/settings/SettingSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#252B47', // Dark card background
    marginBottom: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3454',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00C9A7', // Turquoise accent
    marginBottom: 16,
  },
});
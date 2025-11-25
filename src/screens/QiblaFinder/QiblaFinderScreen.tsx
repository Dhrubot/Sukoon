// src/screens/QiblaFinder/QiblaFinderScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🧭</Text>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Qibla Finder
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Coming Soon
        </Text>
        <Text style={[styles.description, { color: theme.colors.text.muted }]}>
          Find the direction of the Kaaba from anywhere in the world
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default QiblaFinderScreen;
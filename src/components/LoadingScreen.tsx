// src/components/LoadingScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface LoadingScreenProps {
  message?: string;
  onPress?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Preparing your prayer companion...',
  onPress
}) => {
  const { theme } = useTheme();
  
  const content = (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      <Text style={[styles.message, { color: theme.colors.text.secondary }]}>{message}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.fullScreen} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
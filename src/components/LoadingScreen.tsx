// ===== 5. Updated src/components/LoadingScreen.tsx =====
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

interface LoadingScreenProps {
  message?: string;
  onPress?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Preparing your prayer companion...',
  onPress
}) => {
  const content = (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00C9A7" />
      <Text style={styles.message}>{message}</Text>
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
    backgroundColor: '#1A1F3A', // Dark navy background
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
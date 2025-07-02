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
      <ActivityIndicator size="large" color="#1B5E3F" />
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
    backgroundColor: '#FAFAFA',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
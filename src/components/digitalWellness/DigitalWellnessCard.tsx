import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Utils
import { formatTime } from '../../utils/dateHelpers';

interface DigitalWellnessCardProps {
  screenTime: number;
}

const DigitalWellnessCard: React.FC<DigitalWellnessCardProps> = ({ screenTime }) => {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('DigitalWellness' as never)}
      style={styles.container}
    >
      <View style={styles.wellnessCard}>
        <Text style={styles.wellnessTitle}>📱 Screen Time Today</Text>
        <Text style={styles.wellnessValue}>{formatTime(screenTime)}</Text>
        <Text style={styles.wellnessSubtext}>Tap to see more →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  wellnessCard: {
    backgroundColor: '#252B47', // Dark card background
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D3454',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  wellnessTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  wellnessValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  wellnessSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
});

export default DigitalWellnessCard;
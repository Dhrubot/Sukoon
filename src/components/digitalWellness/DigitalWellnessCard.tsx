import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';

// Utils
import { formatTime } from '../../utils/dateHelpers';

interface DigitalWellnessCardProps {
  screenTime: number;
}

const DigitalWellnessCard: React.FC<DigitalWellnessCardProps> = ({ screenTime }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('DigitalWellness' as never)}
      style={styles.container}
    >
      <View style={[styles.wellnessCard, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
        <Text style={[styles.wellnessTitle, { color: theme.colors.text.secondary }]}>📱 Screen Time Today</Text>
        <Text style={[styles.wellnessValue, { color: theme.colors.text.primary }]}>{formatTime(screenTime)}</Text>
        <Text style={[styles.wellnessSubtext, { color: theme.colors.text.muted }]}>Tap to see more →</Text>
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  wellnessTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  wellnessValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  wellnessSubtext: {
    fontSize: 14,
  },
});

export default DigitalWellnessCard;
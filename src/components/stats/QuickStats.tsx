import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';

interface QuickStatsProps {
  prayersToday: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  prayersToday,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    (navigation as any).navigate('Menu', { screen: 'MyJourney' });
  };

  const getMessage = () => {
    if (prayersToday === 5) return 'All prayers complete today \u2014 Alhamdulillah';
    if (prayersToday >= 3) return 'You are remembering Allah today';
    if (prayersToday >= 1) return 'A beautiful start to your day';
    return 'Each prayer is a new beginning';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: theme.colors.border.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[styles.count, { color: theme.colors.text.primary }]}>
        {prayersToday}/5 prayers today
      </Text>
      <Text style={[styles.message, { color: theme.colors.text.muted }]}>
        {getMessage()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  count: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '300',
  },
});

export default QuickStats;
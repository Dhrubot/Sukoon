import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface QuickStatsProps {
  prayersToday: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  prayersToday,
}) => {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('MainTabs', { screen: 'Menu', params: { screen: 'MyJourney' } });
  };

  const getMessage = () => {
    if (prayersToday === 5) return 'All prayers complete today \u2014 Alhamdulillah';
    if (prayersToday >= 3) return 'You are remembering Allah today';
    if (prayersToday >= 1) return 'A beautiful start to your day';
    return 'Each prayer is a new beginning';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.count}>
        {prayersToday}/5 prayers today
      </Text>
      <Text style={styles.message}>
        {getMessage()}
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderColor: theme.colors.border.primary,
  },
  count: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  message: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    color: theme.colors.text.muted,
  },
});

export default QuickStats;

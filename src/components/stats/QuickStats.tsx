import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { Icon } from '../common/Icon';
import { HomeTabIcon, AchievementIcon } from '../../assets/icons';

interface QuickStatsProps {
  prayersToday: number;
  streak: number;
  nextMilestone?: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  prayersToday,
  streak,
  nextMilestone,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Stats' as never);
  };

  const getStreakColor = () => {
    if (streak === 0) return theme.colors.text.muted;
    if (streak < 7) return theme.colors.status.warning;
    if (streak < 30) return theme.colors.primary.DEFAULT;
    return theme.colors.status.success;
  };

  const getEncouragement = () => {
    if (prayersToday === 5) return 'Perfect day! Ma sha Allah';
    if (prayersToday >= 3) return 'Great progress today!';
    if (prayersToday >= 1) return 'Keep going!';
    return 'Start your day with prayer';
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Today's Progress</Text>
        <Text style={[styles.viewMore, { color: theme.colors.primary.DEFAULT }]}>View Details →</Text>
      </View>

      <View style={styles.statsRow}>
        {/* Prayers Today */}
        <View style={[styles.statBox, { backgroundColor: theme.colors.card.hover }]}>
          <View style={styles.statHeader}>
            <Icon source={HomeTabIcon} size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Today</Text>
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{prayersToday}/5</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(prayersToday / 5) * 100}%`, backgroundColor: theme.colors.primary.DEFAULT }
              ]} 
            />
          </View>
        </View>

        {/* Streak */}
        <View style={[styles.statBox, { backgroundColor: theme.colors.card.hover }]}>
          <View style={styles.statHeader}>
            <Icon source={AchievementIcon} size={28} color={getStreakColor()} />
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>Streak</Text>
          </View>
          <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>{streak} days</Text>
          {nextMilestone && streak > 0 && (
            <Text style={[styles.milestone, { color: theme.colors.text.muted }]}>
              {nextMilestone - streak} to {nextMilestone}!
            </Text>
          )}
        </View>
      </View>

      <Text style={[styles.encouragement, { color: theme.colors.text.secondary }]}>{getEncouragement()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,     // xl
    marginVertical: 16,       // lg
    borderRadius: 16,         // lg
    padding: 20,              // xl
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,         // xl
  },
  title: {
    fontSize: 18,  // xl
    fontWeight: '600',  // semibold
  },
  viewMore: {
    fontSize: 14,  // md
    fontWeight: '500',  // medium
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,                  // lg
  },
  statBox: {
    flex: 1,
    borderRadius: 12,         // md
    padding: 16,              // lg
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                   // sm
    marginBottom: 8,          // sm
  },
  statLabel: {
    fontSize: 14,  // md
  },
  statValue: {
    fontSize: 24,             // 3xl
    fontWeight: '700',        // bold
    marginBottom: 8,          // sm
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  milestone: {
    fontSize: 13,  // sm (adjusted up)
  },
  encouragement: {
    fontSize: 14,             // md
    textAlign: 'center',
    marginTop: 16,            // lg
    fontStyle: 'italic',
  },
});

export default QuickStats;
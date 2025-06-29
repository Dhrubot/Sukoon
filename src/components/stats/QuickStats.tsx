import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

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
  const navigation = useNavigation();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Stats' as never);
  };

  const getStreakEmoji = () => {
    if (streak === 0) return '🌱';
    if (streak < 3) return '🌿';
    if (streak < 7) return '🔥';
    if (streak < 30) return '⭐';
    if (streak < 100) return '💎';
    return '👑';
  };

  const getEncouragement = () => {
    if (prayersToday === 5) return 'Perfect day! Ma sha Allah';
    if (prayersToday >= 3) return 'Great progress today!';
    if (prayersToday >= 1) return 'Keep going!';
    return 'Start your day with prayer';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Progress</Text>
        <Text style={styles.viewMore}>View Details →</Text>
      </View>

      <View style={styles.statsRow}>
        {/* Prayers Today */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Text style={styles.statEmoji}>🕌</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <Text style={styles.statValue}>{prayersToday}/5</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(prayersToday / 5) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Streak */}
        <View style={styles.statBox}>
          <View style={styles.statHeader}>
            <Text style={styles.statEmoji}>{getStreakEmoji()}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <Text style={styles.statValue}>{streak} days</Text>
          {nextMilestone && streak > 0 && (
            <Text style={styles.milestone}>
              {nextMilestone - streak} to {nextMilestone}!
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.encouragement}>{getEncouragement()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewMore: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  milestone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  encouragement: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default QuickStats;
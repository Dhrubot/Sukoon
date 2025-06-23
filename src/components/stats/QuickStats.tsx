import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface QuickStatsProps {
  prayersToday: number;
  streak: number;
  nextMilestone: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  prayersToday,
  streak,
  nextMilestone,
}) => {
  const getStreakEmoji = (): string => {
    if (streak === 0) return '💫';
    if (streak < 7) return '🔥';
    if (streak < 30) return '⭐';
    if (streak < 100) return '🌟';
    return '🏆';
  };

  const streakProgress = streak > 0 ? (streak % 7) / 7 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{prayersToday}/5</Text>
        <Text style={styles.statLabel}>Prayers Today</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(prayersToday / 5) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={styles.streakHeader}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.streakEmoji}>{getStreakEmoji()}</Text>
        </View>
        <Text style={styles.statLabel}>Day Streak</Text>
        {streak > 0 && (
          <Text style={styles.milestone}>
            {nextMilestone - streak} days to {nextMilestone} 🎯
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakEmoji: {
    fontSize: 24,
  },
  milestone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
});

export default QuickStats;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import AchievementService from '../../services/AchievementService';
import { Achievement } from '../../types';

const { width } = Dimensions.get('window');

type CategoryFilter = 'all' | 'prayer' | 'streak' | 'mindfulness' | 'focus' | 'special';

const AchievementsScreen: React.FC = () => {
  const { achievements, setAchievements } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [allAchievements, setAllAchievements] = useState<any[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    try {
      // Get all achievement definitions
      const definitions = AchievementService.getAllAchievements();
      
      // Get unlocked achievements from storage
      const unlocked = StorageService.getAchievements();
      
      // Merge with progress
      const merged = definitions.map(def => {
        const unlockedAchievement = unlocked.find(u => u.id === def.id);
        return {
          ...def,
          unlockedAt: unlockedAchievement?.unlockedAt,
          progress: unlockedAchievement?.progress || 0,
        };
      });
      
      setAllAchievements(merged);
      setAchievements(unlocked);
      
      // Check for new achievements
      const newlyUnlocked = await AchievementService.checkAchievements();
      if (newlyUnlocked.length > 0) {
        // Reload to show newly unlocked
        loadAchievements();
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAchievements = () => {
    if (selectedCategory === 'all') {
      return allAchievements;
    }
    return allAchievements.filter(a => a.category === selectedCategory);
  };

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#1B5E3F';
    }
  };

  const getTierGradient = (tier: string): [string, string] => {
    switch (tier) {
      case 'bronze': return ['#CD7F32', '#8B4513'];
      case 'silver': return ['#C0C0C0', '#808080'];
      case 'gold': return ['#FFD700', '#FFA500'];
      case 'platinum': return ['#E5E4E2', '#BCC6CC'];
      default: return ['#1B5E3F', '#2E7D32'];
    }
  };

  const getCompletionStats = () => {
    const total = allAchievements.length;
    const unlocked = allAchievements.filter(a => a.unlockedAt).length;
    const percentage = total > 0 ? (unlocked / total) * 100 : 0;
    
    return { total, unlocked, percentage };
  };

  const categories = [
    { key: 'all', label: 'All', icon: '🏆' },
    { key: 'prayer', label: 'Prayer', icon: '🕌' },
    { key: 'streak', label: 'Streak', icon: '🔥' },
    { key: 'mindfulness', label: 'Mindful', icon: '🧘' },
    { key: 'focus', label: 'Focus', icon: '🎯' },
    { key: 'special', label: 'Special', icon: '⭐' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E3F" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getCompletionStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Achievements</Text>
          
          {/* Progress Overview */}
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.unlocked}</Text>
                <Text style={styles.statLabel}>Unlocked</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.percentage.toFixed(0)}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${stats.percentage}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.key as CategoryFilter)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === category.key && styles.categoryLabelActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements Grid */}
        <View style={styles.achievementsGrid}>
          {getFilteredAchievements().map((achievement) => (
            <TouchableOpacity
              key={achievement.id}
              style={styles.achievementCard}
              activeOpacity={0.8}
            >
              {achievement.unlockedAt ? (
                <LinearGradient
                  colors={getTierGradient(achievement.tier)}
                  style={styles.achievementUnlocked}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={styles.achievementName}>{achievement.name}</Text>
                  <Text style={styles.achievementDescription}>
                    {achievement.description}
                  </Text>
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierText}>
                      {achievement.tier.toUpperCase()}
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.achievementLocked}>
                  <View style={styles.lockedIconContainer}>
                    <Text style={styles.lockedIcon}>🔒</Text>
                  </View>
                  <Text style={styles.achievementNameLocked}>
                    {achievement.name}
                  </Text>
                  <Text style={styles.achievementDescriptionLocked}>
                    {achievement.description}
                  </Text>
                  {achievement.target && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {achievement.progress || 0}/{achievement.target}
                        </Text>
                      </View>
                      <View style={styles.miniProgressBar}>
                        <View
                          style={[
                            styles.miniProgressFill,
                            {
                              width: `${((achievement.progress || 0) / achievement.target) * 100}%`,
                              backgroundColor: getTierColor(achievement.tier),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Achievement Tips</Text>
          <Text style={styles.tipText}>
            • Complete all 5 daily prayers to build streaks
          </Text>
          <Text style={styles.tipText}>
            • Use mindfulness mode before prayers for focus achievements
          </Text>
          <Text style={styles.tipText}>
            • Add reflections after prayers to unlock special badges
          </Text>
          <Text style={styles.tipText}>
            • Consistency is key - small steps lead to big achievements!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 20,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B5E3F',
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: '#1B5E3F',
    fontWeight: '600',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  achievementCard: {
    width: (width - 48) / 2,
    aspectRatio: 1,
    marginBottom: 16,
  },
  achievementUnlocked: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  achievementLocked: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  lockedIconContainer: {
    marginBottom: 12,
  },
  lockedIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementNameLocked: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 12,
  },
  achievementDescriptionLocked: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  tierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressContainer: {
    width: '100%',
    marginTop: 12,
  },
  progressInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tipsSection: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default AchievementsScreen;
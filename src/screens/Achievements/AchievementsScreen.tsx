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
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const { width } = Dimensions.get('window');

type CategoryFilter = 'all' | 'prayer' | 'streak' | 'mindfulness' | 'focus' | 'special';

const AchievementsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
        // Re-read updated achievements and merge (no recursive call)
        const refreshed = StorageService.getAchievements();
        setAchievements(refreshed);
        const refreshedMerged = definitions.map(def => {
          const u = refreshed.find(a => a.id === def.id);
          return {
            ...def,
            unlockedAt: u?.unlockedAt,
            progress: u?.progress || 0,
          };
        });
        setAllAchievements(refreshedMerged);
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
    const tiers = theme.colors.achievement.tiers;
    const t = (tiers[tier as keyof typeof tiers]) || tiers.default;
    return t.from;
  };

  const getTierGradient = (tier: string): [string, string] => {
    const tiers = theme.colors.achievement.tiers;
    const t = (tiers[tier as keyof typeof tiers]) || tiers.default;
    return [t.from, t.to];
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
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,  // lg
    color: theme.colors.text.secondary,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 32,  // 5xl
    fontWeight: '700',  // bold
    color: theme.colors.text.primary,
    marginBottom: 20,
  },
  progressCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 18,  // xl
    fontWeight: '600',  // semibold
    color: theme.colors.text.primary,
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
    fontSize: 28,  // 4xl
    fontWeight: '700',  // bold
    color: theme.colors.primary.DEFAULT,
  },
  statLabel: {
    fontSize: 14,  // md
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.card.hover,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary.DEFAULT,
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
    backgroundColor: theme.colors.card.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.card.hover,
    borderColor: theme.colors.primary.DEFAULT,
  },
  categoryIcon: {
    fontSize: 20,  // 2xl
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,  // md
    color: theme.colors.text.secondary,
    fontWeight: '500',  // medium
  },
  categoryLabelActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',  // semibold
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
    shadowColor: theme.colors.achievement.shadow,
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
    backgroundColor: theme.colors.card.background,
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
    borderStyle: 'dashed',
  },
  achievementIcon: {
    fontSize: 48,  // icon 4xl
    marginBottom: 12,
  },
  lockedIconContainer: {
    marginBottom: 12,
  },
  lockedIcon: {
    fontSize: 32,  // 5xl
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementNameLocked: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 13,  // sm (adjusted up)
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  achievementDescriptionLocked: {
    fontSize: 13,  // sm (adjusted up)
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  tierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.achievement.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 11,  // xs (adjusted up)
    fontWeight: '700',  // bold
    color: theme.colors.text.primary,
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
    fontSize: 13,  // sm (adjusted up)
    color: theme.colors.text.secondary,
    fontWeight: '600',  // semibold
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: theme.colors.card.hover,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tipsSection: {
    backgroundColor: theme.colors.card.background,
    padding: 20,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  tipsTitle: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: theme.colors.primary.DEFAULT,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,  // md
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 8,
  },
});

export default AchievementsScreen;
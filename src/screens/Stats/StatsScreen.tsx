// src/screens/Stats/StatsScreen.tsx
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
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfMonth } from 'date-fns';

// Store and Services
import { useStore } from '../../store/useStore';
import { getPrayerIcon } from '../../assets/icons';
import StorageService from '../../services/StorageService';
import { PrayerRecord, DailyStats } from '../../types';

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const { width } = Dimensions.get('window');

type TimeRange = 'week' | 'month' | 'all';

const StatsScreen: React.FC = ({ navigation }: any) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  // 🎯 NEW: Use centralized prayer times hook
  const { 
    todayPrayerTimes, 
    hasValidLocation, 
    isLoading: prayerTimesLoading,
    error: prayerTimesError 
  } = usePrayerTimes();

  // Keep existing store state for other features
  const { currentStreak, engagementStreak, todayPrayerRecords } = useStore();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrayers: 0,
    completedPrayers: 0,
    averageDailyCompletion: 0,
    averageFocusScore: 0,
    longestStreak: 0,
    mindfulnessRate: 0,
  });
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ date: string; count: number }[]>([]);
  const [prayerBreakdown, setPrayerBreakdown] = useState<{ name: string; count: number; color: string }[]>([]);
  const [focusTrend, setFocusTrend] = useState<number[]>([]);

  useEffect(() => {
    // Only load statistics if we have valid location and prayer times
    if (hasValidLocation && todayPrayerTimes.length > 0) {
      loadStatistics();
    }
  }, [timeRange, hasValidLocation, todayPrayerTimes.length]); // Use length instead of full array

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(endDate);
          break;
        case 'month':
          startDate = startOfMonth(endDate);
          break;
        case 'all':
          startDate = subDays(endDate, 90); // Last 90 days
          break;
      }

      // Load prayer records for the period
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      let totalPossiblePrayers = 0;
      let completedPrayers = 0;
      let mindfulPrayers = 0;
      let focusScores: number[] = [];
      
      const prayerCounts = {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      };

      // Weekly data for bar chart
      const weekData = new Array(7).fill(0);
      const monthData: { date: string; count: number }[] = [];
      
      days.forEach((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const records = StorageService.getDayPrayerRecords(dateStr);
        const stats = StorageService.getDailyStats(dateStr);
        
        totalPossiblePrayers += 5;
        const dayCompleted = records.filter(r => r.status === 'prayed').length;
        completedPrayers += dayCompleted;
        
        // Count mindfulness sessions
        const dayMindful = records.filter(r => r.mindfulnessCompleted).length;
        mindfulPrayers += dayMindful;
        
        // Collect focus scores
        records.forEach(record => {
          if (record.status === 'prayed') {
            prayerCounts[record.prayer.toLowerCase() as keyof typeof prayerCounts]++;
            if (record.focusScore) {
              focusScores.push(record.focusScore);
            }
          }
        });
        
        // Weekly bar chart data
        if (timeRange === 'week') {
          weekData[index] = dayCompleted;
        }
        
        // Monthly data
        if (timeRange === 'month' && dayCompleted > 0) {
          monthData.push({
            date: format(day, 'dd'),
            count: dayCompleted,
          });
        }
      });

      // Calculate statistics
      const avgCompletion = totalPossiblePrayers > 0 
        ? (completedPrayers / totalPossiblePrayers) * 100 
        : 0;
      
      const avgFocus = focusScores.length > 0
        ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length
        : 0;
        
      const mindfulnessRate = completedPrayers > 0
        ? (mindfulPrayers / completedPrayers) * 100
        : 0;

      // Get longest streak
      const longestStreak = StorageService.getLongestStreak();

      // Prepare prayer breakdown for pie chart
      const breakdown = Object.entries(prayerCounts)
        .map(([prayer, count]) => ({
          name: prayer.charAt(0).toUpperCase() + prayer.slice(1),
          count,
          color: getPrayerColor(prayer),
        }))
        .filter(item => item.count > 0);

      // Focus trend (last 7 days)
      const focusTrendData: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayStats = StorageService.getDailyStats(date);
        focusTrendData.push(dayStats?.averageFocusScore || 0);
      }

      setStats({
        totalPrayers: totalPossiblePrayers,
        completedPrayers,
        averageDailyCompletion: avgCompletion,
        averageFocusScore: avgFocus,
        longestStreak,
        mindfulnessRate,
      });
      
      setWeeklyData(weekData);
      setMonthlyData(monthData);
      setPrayerBreakdown(breakdown);
      setFocusTrend(focusTrendData);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPrayerColor = (prayer: string): string => {
    const colors = theme.colors.prayer;
    return colors[prayer.toLowerCase() as keyof typeof colors] || theme.colors.primary.DEFAULT;
  };

  const chartConfig = {
    backgroundColor: theme.colors.chart.background,
    backgroundGradientFrom: theme.colors.chart.gradientFrom,
    backgroundGradientTo: theme.colors.chart.gradientTo,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(45, 139, 111, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.chart.dot,
    },
  };

  // 🎯 NEW: Handle invalid location state
  if (!hasValidLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>📍</Text>
          <Text style={styles.emptyStateTitle}>Location Required</Text>
          <Text style={styles.emptyStateText}>
            Please set your location to view prayer statistics
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Go to Settings to configure your location
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🎯 NEW: Handle prayer times loading state
  if (prayerTimesLoading || (todayPrayerTimes.length === 0 && !prayerTimesError)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading prayer times...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🎯 NEW: Handle prayer times error state
  if (prayerTimesError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>⚠️</Text>
          <Text style={styles.emptyStateTitle}>Unable to Load Prayer Times</Text>
          <Text style={styles.emptyStateText}>{prayerTimesError}</Text>
          <Text style={styles.emptyStateSubtext}>
            Statistics require prayer times to be available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🎯 ENHANCED: Show loading state for statistics calculation
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Calculating your statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Prayer Statistics</Text>
          
          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === range && styles.timeRangeTextActive,
                  ]}
                >
                  {range === 'all' ? 'Last 90 Days' : range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Statistics */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedPrayers}</Text>
            <Text style={styles.statLabel}>Prayers Completed</Text>
            <Text style={styles.statSubtext}>out of {stats.totalPrayers}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageDailyCompletion.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Completion Rate</Text>
            <Text style={styles.statSubtext}>daily average</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{engagementStreak}</Text>
            <Text style={styles.statLabel}>Devotion</Text>
            <Text style={styles.statSubtext}>consecutive days</Text>
            {currentStreak > 0 && (
              <Text style={styles.perfectDaysBadge}>✦ {currentStreak}d all five</Text>
            )}
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageFocusScore.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Focus Score</Text>
            <Text style={styles.statSubtext}>average rating</Text>
          </View>
        </View>

        {/* Today's Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.todayProgressContainer}>
            {todayPrayerTimes.map((prayer) => {
              const record = todayPrayerRecords.find(r => r.prayer === prayer.name);
              const isCompleted = record?.status === 'prayed';
              const isMindful = record?.mindfulnessCompleted;
              
              return (
                <View key={prayer.name} style={styles.todayPrayerItem}>
                  <View style={styles.prayerIconContainer}>
                    {React.createElement(getPrayerIcon(prayer.name), {
                      size: 22,
                      color: isCompleted
                        ? theme.colors.primary.DEFAULT
                        : theme.colors.text.muted,
                    })}
                  </View>
                  <Text style={[
                    styles.prayerName,
                    isCompleted && styles.completedPrayerName
                  ]}>
                    {prayer.name}
                  </Text>
                  <Text style={styles.prayerTime}>
                    {format(prayer.time, 'HH:mm')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Weekly Progress Chart */}
        {timeRange === 'week' && weeklyData.some(d => d > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <BarChart
              data={{
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: weeklyData }],
              }}
              width={width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </View>
        )}

        {/* Focus Trend */}
        {focusTrend.some(score => score > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Focus Trend (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: Array.from({ length: 7 }, (_, i) => 
                  format(subDays(new Date(), 6 - i), 'dd')
                ),
                datasets: [{ data: focusTrend }],
              }}
              width={width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={styles.chart}
            />
          </View>
        )}

        {/* Prayer Breakdown */}
        {prayerBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prayer Breakdown</Text>
            <PieChart
              data={prayerBreakdown.map((item, index) => ({
                name: item.name,
                population: item.count,
                color: item.color,
                legendFontColor: theme.colors.chart.legendFont,
                legendFontSize: 14,
              }))}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}

        {/* Additional Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🎯 Presence Rate</Text>
            <Text style={styles.insightValue}>{stats.mindfulnessRate.toFixed(1)}%</Text>
            <Text style={styles.insightDescription}>
              of your prayers include presence practice
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>� Longest Devotion</Text>
            <Text style={styles.insightValue}>{stats.longestStreak} days</Text>
            <Text style={styles.insightDescription}>
              your longest unbroken path of prayer
            </Text>
          </View>

          {stats.averageDailyCompletion >= 80 && (
            <View style={[styles.insightCard, styles.achievementCard]}>
              <Text style={styles.insightTitle}>⭐ Excellent Consistency!</Text>
              <Text style={styles.insightDescription}>
                You're maintaining an outstanding prayer completion rate. Keep up the amazing work!
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.card.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card.hover,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  timeRangeText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.secondary,
  },
  timeRangeTextActive: {
    color: theme.colors.primary.contrast,
  },
  
  // 🎯 NEW: Empty and loading states
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['4xl'],
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['4xl'],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  
  // Existing styles...
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    width: (width - 40) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: theme.typography.fontSize['4xl'],
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  statSubtext: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  perfectDaysBadge: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.gold,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  section: {
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  todayProgressContainer: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  todayPrayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  prayerIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  prayerName: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
  },
  completedPrayerName: {
    color: theme.colors.primary.DEFAULT,
  },
  prayerTime: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  insightCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary.DEFAULT,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  achievementCard: {
    borderLeftColor: theme.colors.gold,
    backgroundColor: theme.colors.card.hover,
  },
  insightTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.sm,
  },
  insightValue: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  insightDescription: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});

export default StatsScreen;
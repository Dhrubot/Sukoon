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
import StorageService from '../../services/StorageService';
import { PrayerRecord, DailyStats } from '../../types';

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';

const { width } = Dimensions.get('window');

type TimeRange = 'week' | 'month' | 'all';

const StatsScreen: React.FC = () => {
  // 🎯 NEW: Use centralized prayer times hook
  const { 
    todayPrayerTimes, 
    hasValidLocation, 
    isLoading: prayerTimesLoading,
    error: prayerTimesError 
  } = usePrayerTimes();

  // Keep existing store state for other features
  const { currentStreak, todayPrayerRecords } = useStore();
  
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
  }, [timeRange, hasValidLocation, todayPrayerTimes]);

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
    const colors = {
      fajr: '#3949ab',
      dhuhr: '#ffeb3b',
      asr: '#ff9800',
      maghrib: '#e91e63',
      isha: '#1a237e',
    };
    return colors[prayer.toLowerCase() as keyof typeof colors] || '#1B5E3F';
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(27, 94, 63, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#1B5E3F',
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
          <ActivityIndicator size="large" color="#1B5E3F" />
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
          <ActivityIndicator size="large" color="#1B5E3F" />
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
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statSubtext}>days in a row</Text>
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
                  <Text style={styles.prayerEmoji}>
                    {isCompleted ? (isMindful ? '🤲' : '✅') : '⭕'}
                  </Text>
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
                legendFontColor: '#333',
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
            <Text style={styles.insightTitle}>🎯 Mindfulness Rate</Text>
            <Text style={styles.insightValue}>{stats.mindfulnessRate.toFixed(1)}%</Text>
            <Text style={styles.insightDescription}>
              of your prayers include mindfulness practice
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>🏆 Longest Streak</Text>
            <Text style={styles.insightValue}>{stats.longestStreak} days</Text>
            <Text style={styles.insightDescription}>
              your personal best consecutive prayer days
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E3F',
    marginBottom: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#1B5E3F',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  
  // 🎯 NEW: Empty and loading states
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E3F',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Existing styles...
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: (width - 40) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B5E3F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 16,
  },
  todayProgressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  todayPrayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  prayerEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  prayerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  completedPrayerName: {
    color: '#1B5E3F',
  },
  prayerTime: {
    fontSize: 14,
    color: '#666666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1B5E3F',
  },
  achievementCard: {
    borderLeftColor: '#FFD700',
    backgroundColor: '#FFFEF7',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E3F',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});

export default StatsScreen;
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

const { width } = Dimensions.get('window');

type TimeRange = 'week' | 'month' | 'all';

const StatsScreen: React.FC = () => {
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
    loadStatistics();
  }, [timeRange]);

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E3F" />
          <Text style={styles.loadingText}>Loading your statistics...</Text>
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
                  {range === 'all' ? '90 Days' : range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsContainer}
        >
          <LinearGradient
            colors={['#1B5E3F', '#2E7D32']}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>{currentStreak}</Text>
            <Text style={styles.metricLabel}>Current Streak</Text>
            <Text style={styles.metricSubtext}>days</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#1976D2', '#2196F3']}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {stats.averageDailyCompletion.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
            <Text style={styles.metricSubtext}>
              {stats.completedPrayers}/{stats.totalPrayers} prayers
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={['#7B1FA2', '#9C27B0']}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {stats.averageFocusScore.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Avg Focus</Text>
            <Text style={styles.metricSubtext}>khushoo score</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#F57C00', '#FF9800']}
            style={styles.metricCard}
          >
            <Text style={styles.metricValue}>
              {stats.mindfulnessRate.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Mindfulness</Text>
            <Text style={styles.metricSubtext}>with preparation</Text>
          </LinearGradient>
        </ScrollView>

        {/* Weekly Prayer Chart */}
        {timeRange === 'week' && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>This Week's Prayers</Text>
            <BarChart
              data={{
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                  data: weeklyData,
                }],
              }}
              width={width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showBarTops
              showValuesOnTopOfBars
            />
          </View>
        )}

        {/* Monthly Trend */}
        {timeRange === 'month' && monthlyData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Monthly Trend</Text>
            <LineChart
              data={{
                labels: monthlyData.slice(-7).map(d => d.date),
                datasets: [{
                  data: monthlyData.slice(-7).map(d => d.count),
                }],
              }}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              bezier
            />
          </View>
        )}

        {/* Prayer Breakdown */}
        {prayerBreakdown.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Prayer Breakdown</Text>
            <PieChart
              data={prayerBreakdown}
              width={width - 40}
              height={200}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Focus Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Focus Trend (Last 7 Days)</Text>
          <LineChart
            data={{
              labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Today'],
              datasets: [{
                data: focusTrend.length > 0 ? focusTrend : [0, 0, 0, 0, 0, 0, 0],
              }],
            }}
            width={width - 40}
            height={180}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
            }}
            style={styles.chart}
            bezier
            getDotColor={(value) => value >= 80 ? '#4CAF50' : value >= 60 ? '#FF9800' : '#F44336'}
          />
        </View>

        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.insightTitle}>📊 Insights</Text>
          
          {stats.averageDailyCompletion >= 80 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>🌟</Text>
              <Text style={styles.insightText}>
                Excellent consistency! You're praying {stats.averageDailyCompletion.toFixed(0)}% of your prayers.
              </Text>
            </View>
          )}
          
          {currentStreak >= 7 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>🔥</Text>
              <Text style={styles.insightText}>
                Amazing {currentStreak}-day streak! Keep it up!
              </Text>
            </View>
          )}
          
          {stats.averageFocusScore >= 80 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>🧘</Text>
              <Text style={styles.insightText}>
                Your focus during prayer is exceptional. Ma sha Allah!
              </Text>
            </View>
          )}
          
          {stats.mindfulnessRate >= 50 && (
            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>💚</Text>
              <Text style={styles.insightText}>
                You prepare mindfully for {stats.mindfulnessRate.toFixed(0)}% of your prayers.
              </Text>
            </View>
          )}
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>Export Prayer Data</Text>
        </TouchableOpacity>
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
    paddingBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#1B5E3F',
    fontWeight: '600',
  },
  metricsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  metricCard: {
    width: 140,
    padding: 20,
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  metricSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  insightsSection: {
    padding: 20,
    marginTop: 24,
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  insightEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
  },
  exportButton: {
    backgroundColor: '#1B5E3F',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StatsScreen;
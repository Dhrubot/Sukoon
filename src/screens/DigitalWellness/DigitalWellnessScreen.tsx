import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { format, startOfDay, endOfDay } from 'date-fns';
import * as Haptics from 'expo-haptics';

// Services
import UsageStatsService from '../../services/UsageStatsService';
import { useStore } from '../../store/useStore';

// Types
import { UsageStats, ScreenTimeData, AppUsageData } from '../../types';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const { width } = Dimensions.get('window');

const DigitalWellnessScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { todayPrayerTimes } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [todayStats, setTodayStats] = useState<ScreenTimeData | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [weeklyPattern, setWeeklyPattern] = useState<{ [key: string]: number }>({});
  const [selectedTab, setSelectedTab] = useState<'today' | 'weekly' | 'insights'>('today');
  const [prePrayerStats, setPrePrayerStats] = useState<{ prayer: string; screenTime: number; unlocks: number }[]>([]);

  useEffect(() => {
    checkPermissionAndLoadData();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadPrePrayerStats();
    }
  }, [todayPrayerTimes, hasPermission]);

  const checkPermissionAndLoadData = async () => {
    setIsLoading(true);
    
    if (Platform.OS !== 'android') {
      setIsLoading(false);
      return;
    }

    try {
      const permission = await UsageStatsService.hasPermission();
      setHasPermission(permission);

      if (permission) {
        await loadAllData();
      }
    } catch (error) {
      console.error('Error checking permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    const granted = await UsageStatsService.requestPermission();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please enable usage access in Settings > Apps > Sukoon > Special app access > Usage access',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // Permission request will open settings automatically
            setTimeout(checkPermissionAndLoadData, 1000);
          }},
        ]
      );
    }
  };

  const loadAllData = async () => {
    try {
      // Load today's screen time
      const todayData = await UsageStatsService.getTodayScreenTime();
      setTodayStats(todayData);

      // Load detailed usage stats for today
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      const stats = await UsageStatsService.getUsageStats(start, end);
      setUsageStats(stats);

      // Load weekly pattern
      const pattern = await UsageStatsService.getWeeklyUsagePattern();
      setWeeklyPattern(pattern);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPrePrayerStats = async () => {
    const stats = [];
    
    for (const prayer of todayPrayerTimes) {
      const screenTime = await UsageStatsService.getScreenTimeBeforePrayer(prayer.time, 30);
      const unlocks = await UsageStatsService.getUnlockCountBeforePrayer(prayer.time, 30);
      
      stats.push({
        prayer: prayer.name,
        screenTime,
        unlocks,
      });
    }
    
    setPrePrayerStats(stats);
  };

  const getFocusScore = (): number => {
    if (!usageStats) return 100;
    
    return UsageStatsService.calculateFocusScore(
      usageStats.totalScreenTime,
      usageStats.unlockCount,
      usageStats.socialMediaTime
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getChartConfig = () => ({
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(27, 94, 63, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  });

  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionIcon}>📊</Text>
      <Text style={styles.permissionTitle}>Enable Usage Tracking</Text>
      <Text style={styles.permissionText}>
        To help you reduce phone distractions before prayer, Sukoon needs permission to track your screen time.
      </Text>
      <Text style={styles.permissionNote}>
        Your data stays on your device and is never shared.
      </Text>
      <TouchableOpacity style={styles.enableButton} onPress={requestPermission}>
        <Text style={styles.enableButtonText}>Enable Usage Access</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTodayTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Focus Score Card */}
      <LinearGradient
        colors={['#1B5E3F', '#2E7D32']}
        style={styles.focusCard}
      >
        <Text style={styles.focusTitle}>Today's Digital Focus Score</Text>
        <Text style={[styles.focusScore, { color: getScoreColor(getFocusScore()) }]}>
          {getFocusScore()}%
        </Text>
        <Text style={styles.focusSubtext}>
          {getFocusScore() >= 80 ? 'Excellent focus!' : 
           getFocusScore() >= 60 ? 'Good, room for improvement' : 
           'Time for a digital detox'}
        </Text>
      </LinearGradient>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>📱</Text>
          <Text style={styles.metricValue}>
            {formatTime(todayStats?.totalScreenTime || 0)}
          </Text>
          <Text style={styles.metricLabel}>Screen Time</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>🔓</Text>
          <Text style={styles.metricValue}>
            {todayStats?.unlockCount || 0}
          </Text>
          <Text style={styles.metricLabel}>Unlocks</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricIcon}>💬</Text>
          <Text style={styles.metricValue}>
            {formatTime(usageStats?.socialMediaTime || 0)}
          </Text>
          <Text style={styles.metricLabel}>Social Media</Text>
        </View>
      </View>

      {/* Top Apps */}
      {usageStats && usageStats.appUsage.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Used Apps Today</Text>
          {usageStats.appUsage.slice(0, 5).map((app, index) => (
            <View key={app.packageName} style={styles.appRow}>
              <View style={styles.appInfo}>
                <Text style={styles.appRank}>#{index + 1}</Text>
                <Text style={styles.appName}>{app.appName}</Text>
              </View>
              <Text style={styles.appTime}>{formatTime(app.timeSpent)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pre-Prayer Usage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone Usage Before Prayers</Text>
        <Text style={styles.sectionSubtext}>30 minutes before each prayer</Text>
        
        {prePrayerStats.map((stat) => (
          <View key={stat.prayer} style={styles.prayerStatRow}>
            <Text style={styles.prayerName}>{stat.prayer}</Text>
            <View style={styles.prayerStatValues}>
              <Text style={styles.prayerStatText}>
                📱 {formatTime(stat.screenTime)}
              </Text>
              <Text style={styles.prayerStatText}>
                🔓 {stat.unlocks}x
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderWeeklyTab = () => {
    const chartData = {
      labels: Object.keys(weeklyPattern).reverse(),
      datasets: [{
        data: Object.values(weeklyPattern).reverse(),
      }],
    };

    const totalWeekly = Object.values(weeklyPattern).reduce((sum, val) => sum + val, 0);
    const avgDaily = totalWeekly / 7;

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.weeklyStats}>
          <View style={styles.weeklyStatCard}>
            <Text style={styles.weeklyStatValue}>{formatTime(totalWeekly)}</Text>
            <Text style={styles.weeklyStatLabel}>Total This Week</Text>
          </View>
          <View style={styles.weeklyStatCard}>
            <Text style={styles.weeklyStatValue}>{formatTime(Math.round(avgDaily))}</Text>
            <Text style={styles.weeklyStatLabel}>Daily Average</Text>
          </View>
        </View>

        {Object.keys(weeklyPattern).length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>Daily Screen Time</Text>
            <BarChart
              data={chartData}
              width={width - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=" min"
              chartConfig={getChartConfig()}
              style={styles.chart}
              fromZero
              showBarTops
            />
          </View>
        )}

        {/* Category Breakdown */}
        {usageStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time by Category</Text>
            <PieChart
              data={[
                {
                  name: 'Social',
                  population: usageStats.socialMediaTime,
                  color: '#F44336',
                  legendFontColor: '#7F7F7F',
                },
                {
                  name: 'Productive',
                  population: usageStats.productiveTime,
                  color: '#4CAF50',
                  legendFontColor: '#7F7F7F',
                },
                {
                  name: 'Other',
                  population: usageStats.totalScreenTime - usageStats.socialMediaTime - usageStats.productiveTime,
                  color: '#9E9E9E',
                  legendFontColor: '#7F7F7F',
                },
              ]}
              width={width - 40}
              height={200}
              chartConfig={getChartConfig()}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
      </ScrollView>
    );
  };

  const renderInsightsTab = () => {
    const insights = usageStats ? UsageStatsService.getUsageInsights(usageStats) : [];
    
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Your Digital Wellness Insights</Text>
          
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Tips for Better Focus</Text>
            
            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>🔕</Text>
              <Text style={styles.tipText}>
                Enable "Do Not Disturb" mode 30 minutes before each prayer
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>📍</Text>
              <Text style={styles.tipText}>
                Keep your phone in another room during prayer time
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>⏰</Text>
              <Text style={styles.tipText}>
                Set app timers for social media apps
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipEmoji}>🌙</Text>
              <Text style={styles.tipText}>
                Use grayscale mode to reduce phone addiction
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (Platform.OS !== 'android') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Digital Wellness</Text>
        </View>
        <View style={styles.iosMessage}>
          <Text style={styles.iosIcon}>📱</Text>
          <Text style={styles.iosTitle}>Available on Android</Text>
          <Text style={styles.iosText}>
            Digital wellness tracking is currently only available on Android devices due to iOS restrictions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E3F" />
          <Text style={styles.loadingText}>Loading your digital wellness data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Digital Wellness</Text>
        </View>
        {renderPermissionRequest()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Wellness</Text>
        
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {(['today', 'weekly', 'insights'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => {
                setSelectedTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedTab === 'today' && renderTodayTab()}
      {selectedTab === 'weekly' && renderWeeklyTab()}
      {selectedTab === 'insights' && renderInsightsTab()}
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
    fontSize: 16,
    color: 'theme.colors.text.secondary',
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'theme.colors.card.hover',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'theme.colors.primary.DEFAULT', // Turquoise accent
    shadowColor: 'theme.colors.primary.DEFAULT',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: 'theme.colors.text.secondary',
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'theme.colors.text.primary',
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: 'theme.colors.text.secondary',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  permissionNote: {
    fontSize: 14,
    color: 'theme.colors.text.muted',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 32,
  },
  enableButton: {
    backgroundColor: 'theme.colors.primary.DEFAULT', // Turquoise accent
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'theme.colors.text.primary',
  },
  focusCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  focusScore: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 8,
  },
  focusSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: 'theme.colors.card.background', // Dark card background
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'theme.colors.card.hover',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'theme.colors.primary.DEFAULT', // Turquoise accent
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: 'theme.colors.text.secondary',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
  },
  sectionSubtext: {
    fontSize: 14,
    color: 'theme.colors.text.secondary',
    marginBottom: 12,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'theme.colors.card.background',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'theme.colors.card.hover',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appRank: {
    fontSize: 16,
    fontWeight: '600',
    color: 'theme.colors.text.muted',
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    color: 'theme.colors.text.primary',
  },
  appTime: {
    fontSize: 16,
    fontWeight: '600',
    color: 'theme.colors.primary.DEFAULT', // Turquoise accent
  },
  prayerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'theme.colors.card.background',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'theme.colors.card.hover',
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'theme.colors.text.primary',
  },
  prayerStatValues: {
    flexDirection: 'row',
    gap: 16,
  },
  prayerStatText: {
    fontSize: 14,
    color: 'theme.colors.text.secondary',
  },
  weeklyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  weeklyStatCard: {
    alignItems: 'center',
  },
  weeklyStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: 'theme.colors.primary.DEFAULT', // Turquoise accent
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 14,
    color: 'theme.colors.text.secondary',
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  insightsContainer: {
    padding: 20,
  },
  insightsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'theme.colors.text.primary',
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: 'theme.colors.card.background',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'theme.colors.primary.DEFAULT', // Turquoise accent
    borderWidth: 1,
    borderColor: 'theme.colors.card.hover',
  },
  insightText: {
    fontSize: 16,
    color: 'theme.colors.text.secondary',
    lineHeight: 24,
  },
  tipsSection: {
    marginTop: 24,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'theme.colors.card.background',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'theme.colors.card.hover',
  },
  tipEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: 'theme.colors.text.secondary',
    lineHeight: 22,
  },
  iosMessage: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  iosTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'theme.colors.text.primary',
    marginBottom: 16,
  },
  iosText: {
    fontSize: 16,
    color: 'theme.colors.text.secondary',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default DigitalWellnessScreen;
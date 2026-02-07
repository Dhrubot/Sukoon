// src/screens/Home/HomeScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ColorValue,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";

// Store and Services
import { useStore } from "../../store/useStore";
import StorageService from "../../services/StorageService";
import { useTheme } from "../../providers/ThemeProvider";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { AppTheme } from "../../theme";

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from "../../providers/PrayerTimesProvider";

// Components
import PrayerCard from "../../components/prayer/PrayerCard";
import NextPrayerCard from "../../components/prayer/NextPrayerCard";
import DailyVerse from "../../components/common/DailyVerse";
import QuickStats from "../../components/stats/QuickStats";
import DigitalWellnessCard from "../../components/digitalWellness/DigitalWellnessCard";
import { SunTimesDisplay } from "../../components/common/SunTimesDisplay";
import { MosqueModeStatus } from "../../components/mosque";

// Types
import { Achievement, PrayerTime } from "../../types";
import AchievementService from "../../services/AchievementService";
import AchievementCelebration from "../../components/achievements/AchievementCelebration";
import UsageStatsService from "../../services/UsageStatsService";

const { width } = Dimensions.get("window");

const HomeScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  // 🎯 NEW: Replace complex prayer time logic with simple hook
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    isLoading: prayerTimesLoading, 
    hasValidLocation, 
    isOffline,
    error: prayerTimesError,
    refreshPrayerTimes 
  } = usePrayerTimes();

  // Keep existing store state for other features
  const {
    userSettings,
    todayPrayerRecords,
    setTodayPrayerRecords,
    currentStreak,
    isRefreshing,
    setIsRefreshing,
    celebratingAchievement,
    setCelebratingAchievement,
    todaySunrise,
    todaySunset
  } = useStore();

  // Local state for UI features
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [screenTime, setScreenTime] = useState(0);

  // 🎯 REMOVED: loadPrayerTimes function - now handled by provider!
  // 🎯 REMOVED: location checks - now handled by provider!
  // 🎯 REMOVED: prayer time error handling - now handled by provider!

  useEffect(() => {
    // Only load non-prayer-time related data
    loadTodayRecords();
    loadScreenTime();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      updateGreeting();
    }, 60000);

    updateGreeting();

    return () => clearInterval(timer);
  }, []); // 🎯 SIMPLIFIED: No dependencies on location/settings

  const loadTodayRecords = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const records = StorageService.getDayPrayerRecords(today);
    setTodayPrayerRecords(records);
  };

  const loadScreenTime = async () => {
    try {
      const data = await UsageStatsService.getTodayScreenTime();
      setScreenTime(data?.totalScreenTime || 0);
    } catch (error) {
      console.error("Error loading screen time:", error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    const name = userSettings?.name || "Friend";

    if (hour < 5) {
      setGreeting(`Night prayers, ${name} 🌙`);
    } else if (hour < 12) {
      setGreeting(`Good morning, ${name} ☀️`);
    } else if (hour < 17) {
      setGreeting(`Good afternoon, ${name} 🌞`);
    } else if (hour < 20) {
      setGreeting(`Good evening, ${name} 🌅`);
    } else {
      setGreeting(`Peace be upon you, ${name} 🌙`);
    }
  };

  // 🎯 SIMPLIFIED: Refresh now just calls the provider's refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshPrayerTimes(); // 🎯 NEW: Use provider's refresh
    loadTodayRecords();
    loadScreenTime();
    setIsRefreshing(false);
  }, [refreshPrayerTimes]);

  const handlePrayerComplete = async (prayerTime: PrayerTime) => {
    // Create a serializable version of prayerTime by converting Date to ISO string
    const serializablePrayer = {
      ...prayerTime,
      time: prayerTime.time.toISOString(),  // Convert Date to string
    };
    
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer });
    const unlocked = await AchievementService.checkAchievements();
    if (unlocked.length > 0) {
      // Show celebration for first unlocked achievement
      setCelebratingAchievement(unlocked[0]);
    }
  };

  const getBackgroundGradient = (): readonly [ColorValue, ColorValue] => {
    return [theme.colors.background.primary, theme.colors.background.secondary];
  };

  const getNextMilestone = (current: number): number => {
    if (current < 3) return 3;
    if (current < 7) return 7;
    if (current < 30) return 30;
    if (current < 100) return 100;
    return 365;
  };

  const completedToday = todayPrayerRecords.filter(r => r.status === 'prayed').length;

  // 🎯 NEW: Handle invalid location state
  if (!hasValidLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
          <View style={styles.locationSetupContainer}>
            <Text style={styles.setupTitle}>🕌 Welcome to Sukoon</Text>
            <Text style={styles.setupSubtitle}>
              To show accurate prayer times, we need your location
            </Text>
            <View style={styles.setupHelpBox}>
              <Text style={styles.setupHelpText}>
                📍 Please set your location in the modal that appeared, or go to Settings to configure your location manually.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // 🎯 NEW: Handle loading state
  if (prayerTimesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Loading your prayer times...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // 🎯 NEW: Handle error state
  if (prayerTimesError) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Prayer Times Unavailable</Text>
            <Text style={styles.errorText}>{prayerTimesError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshPrayerTimes}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // 🎯 MAIN UI: Same as before, but now using reliable prayer times from provider
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>
              {format(currentTime, "EEEE, MMMM do, yyyy")}
            </Text>
          </View>

          {/* Sunrise & Sunset Times */}
          <SunTimesDisplay sunrise={todaySunrise} sunset={todaySunset} />

          {/* 🕌 Mosque Mode Status Banner */}
          <MosqueModeStatus />

          {/* Next Prayer Card */}
          {nextPrayer && (
            <NextPrayerCard
              prayer={nextPrayer}
              onPrepare={() => handlePrayerComplete(nextPrayer)}
            />
          )}

          {/* Offline Banner */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                ✈️ Offline — times are estimated
              </Text>
            </View>
          )}

          {/* Today's Prayer Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Prayers</Text>
            <View style={styles.prayerGrid}>
              {todayPrayerTimes.map((prayer, index) => {
                // 🎯 FIXED: Get the matching prayer record
                const record = todayPrayerRecords.find(
                  (r) => r.prayer === prayer.name
                );
                
                // Get the next prayer in the list (for grace period calculation)
                // If this is the last prayer of the day, nextPrayer will be null
                const nextPrayerInList = index < todayPrayerTimes.length - 1 
                  ? todayPrayerTimes[index + 1] 
                  : null;
                
                return (
                  <PrayerCard
                    key={prayer.name}
                    prayer={prayer}
                    record={record} 
                    onComplete={() => handlePrayerComplete(prayer)}
                    currentTime={currentTime}
                    nextPrayer={nextPrayerInList}
                  />
                );
              })}
            </View>
          </View>

          {/* Quick Stats */}
          <QuickStats
            prayersToday={completedToday} 
            streak={currentStreak}        
            nextMilestone={getNextMilestone(currentStreak)} 
          />

          {/* Digital Wellness Card */}
          <DigitalWellnessCard
            screenTime={screenTime} 
          />

          {/* Daily Verse */}
          <DailyVerse />

          {/* Achievement Celebration */}
          {celebratingAchievement && (
            <AchievementCelebration
              achievement={celebratingAchievement}
              onClose={() => setCelebratingAchievement(null)}
              isVisible={true} 
            />
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  date: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  prayerGrid: {
    gap: theme.spacing.md,
  },
  
  locationSetupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  setupSubtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    lineHeight: 24,
  },
  setupHelpBox: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  setupHelpText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  offlineBanner: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.status.warning,
    fontWeight: '500',
  },
  offlineBanner: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
});

export default HomeScreen;
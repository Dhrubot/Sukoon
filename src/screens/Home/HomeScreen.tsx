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

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from "../../providers/PrayerTimesProvider";

// Components
import PrayerCard from "../../components/prayer/PrayerCard";
import NextPrayerCard from "../../components/prayer/NextPrayerCard";
import DailyVerse from "../../components/common/DailyVerse";
import QuickStats from "../../components/stats/QuickStats";
import DigitalWellnessCard from "../../components/digitalWellness/DigitalWellnessCard";

// Types
import { Achievement, PrayerTime } from "../../types";
import AchievementService from "../../services/AchievementService";
import AchievementCelebration from "../../components/achievements/AchievementCelebration";
import UsageStatsService from "../../services/UsageStatsService";

const { width } = Dimensions.get("window");

const HomeScreen = ({ navigation }: any) => {
  // 🎯 NEW: Replace complex prayer time logic with simple hook
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    isLoading: prayerTimesLoading, 
    hasValidLocation, 
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
    setCelebratingAchievement
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
    const hour = currentTime.getHours();

    if (hour >= 4 && hour < 6) {
      return ["#0d47a1", "#42a5f5"]; // Fajr
    } else if (hour >= 11 && hour < 15) {
      return ["#c8e6c9", "#a5d6a7"]; // Dhuhr
    } else if (hour >= 15 && hour < 18) {
      return ["#ffe0b2", "#ffb74d"]; // Asr
    } else if (hour >= 18 && hour < 20) {
      return ["#f8bbd0", "#f06292"]; // Maghrib
    } else {
      return ["#1a237e", "#311b92"]; // Isha/Night
    }
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
            <Text style={styles.setupTitle}>🕌 Welcome to PrayerBuddy</Text>
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
            <ActivityIndicator size="large" color="#FFFFFF" />
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

          {/* Next Prayer Card */}
          {nextPrayer && (
            <NextPrayerCard
              prayer={nextPrayer}
              onPrepare={() => handlePrayerComplete(nextPrayer)}
            />
          )}

          {/* Today's Prayer Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Prayers</Text>
            <View style={styles.prayerGrid}>
              {todayPrayerTimes.map((prayer) => {
                // 🎯 FIXED: Get the matching prayer record
                const record = todayPrayerRecords.find(
                  (r) => r.prayer === prayer.name
                );
                
                return (
                  <PrayerCard
                    key={prayer.name}
                    prayer={prayer}
                    record={record} 
                    onComplete={() => handlePrayerComplete(prayer)}
                    currentTime={currentTime}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  prayerGrid: {
    gap: 12,
  },
  
  // 🎯 NEW: Styles for improved state handling
  locationSetupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  setupSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  setupHelpBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  setupHelpText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
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
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
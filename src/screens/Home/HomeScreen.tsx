// src/screens/Home/HomeScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
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
import SanctuaryView from "../../components/prayer/SanctuaryView";
import DailyVerse from "../../components/common/DailyVerse";
import { SunTimesDisplay } from "../../components/common/SunTimesDisplay";
import { MosqueModeStatus, MosqueModeOverlay } from "../../components/mosque";
import RamadanTimesCard from "../../components/prayer/RamadanTimesCard";
import OptionalPrayersSection from "../../components/prayer/OptionalPrayersSection";
import GardenTeaser from "../../components/garden/GardenTeaser";

// Types
import { PrayerTime, OptionalPrayerTime } from "../../types";

import { isRamadan, getRamadanDay } from "../../utils/ramadan";

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
    todaySunrise,
    todaySunset
  } = useStore();

  // Local state for UI features
  const [currentTime, setCurrentTime] = useState(new Date());

  // 🎯 REMOVED: loadPrayerTimes function - now handled by provider!
  // 🎯 REMOVED: location checks - now handled by provider!
  // 🎯 REMOVED: prayer time error handling - now handled by provider!

  useEffect(() => {
    // Only load non-prayer-time related data
    loadTodayRecords();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const loadTodayRecords = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const records = StorageService.getDayPrayerRecords(today);
    setTodayPrayerRecords(records);
  };


  // 1c: Prayer-aware greeting
  const getGreeting = (): string => {
    const fullName = userSettings?.name?.trim() || 'Friend';
    const firstName = fullName.split(/\s+/)[0];
    const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const now = currentTime;

    if (nextPrayer) {
      const minutesUntil = Math.floor(
        (nextPrayer.time.getTime() - now.getTime()) / (1000 * 60)
      );

      // Within 30 minutes of next prayer — approaching
      if (minutesUntil > 0 && minutesUntil <= 30) {
        return `${nextPrayer.name} is approaching, ${name}`;
      }

      // Within active prayer window (past the time, within grace)
      if (minutesUntil <= 0 && minutesUntil > -60) {
        return `بِسْمِ اللَّهِ — Time for ${nextPrayer.name}`;
      }
    }

    // Ramadan-aware greeting
    if (isRamadan()) {
      const day = getRamadanDay();
      const dayStr = day ? ` — Day ${day}` : '';
      const hour = now.getHours();
      // After Isha during Ramadan, mention Taraweeh
      if (hour >= 20) {
        return `Time for Taraweeh${dayStr}, ${name}`;
      }
      return `Ramadan Mubarak${dayStr}, ${name}`;
    }

    // Default: peaceful between-prayers greeting
    const hour = now.getHours();
    if (hour < 5) return `Peace be upon you, ${name}`;
    if (hour < 12) return `As Salamu Alaykum, ${name}`;
    if (hour < 17) return `Peace be upon you, ${name}`;
    if (hour < 20) return `As Salamu Alaykum, ${name}`;
    return `Peace be upon you, ${name}`;
  };

  const handlePrayerComplete = (prayerTime: PrayerTime) => {
    // Create a serializable version of prayerTime by converting Date to ISO string
    const serializablePrayer = {
      ...prayerTime,
      time: prayerTime.time.toISOString(),  // Convert Date to string
    };
    
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer });
  };

  const handleOptionalPrayerPrepare = (prayer: OptionalPrayerTime) => {
    const serializablePrayer = {
      name: prayer.name,
      time: prayer.time.toISOString(),
      timestamp: prayer.time.getTime(),
      isNext: false,
    };
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer });
  };

  const getBackgroundGradient = (): readonly [ColorValue, ColorValue] => {
    return [theme.colors.background.primary, theme.colors.background.secondary];
  };


  const completedToday = todayPrayerRecords.filter(r => r.status === 'prayed').length;

  // Find the record for the current hero prayer (if already prayed)
  const heroPrayerRecord = useMemo(() => {
    if (!nextPrayer) return undefined;
    return todayPrayerRecords.find(
      r => r.prayer === nextPrayer.name && r.status === 'prayed'
    );
  }, [nextPrayer, todayPrayerRecords]);

  // Check if the hero prayer's adhan has actually happened
  const isHeroPrayerTimeEntered = useMemo(() => {
    if (!nextPrayer) return false;
    return nextPrayer.time <= currentTime;
  }, [nextPrayer, currentTime]);

  // Find the most recent MISSED prayer (before the hero prayer) for qada prompt
  const missedPreviousPrayer = useMemo(() => {
    if (!nextPrayer || isHeroPrayerTimeEntered) return undefined;
    const heroIdx = todayPrayerTimes.findIndex(p => p.name === nextPrayer.name);
    // Walk backwards to find the first unprayed prayer
    for (let i = heroIdx - 1; i >= 0; i--) {
      const p = todayPrayerTimes[i];
      const prayed = todayPrayerRecords.some(
        r => r.prayer === p.name && r.status === 'prayed'
      );
      if (!prayed) return p;
    }
    return undefined;
  }, [nextPrayer, todayPrayerTimes, todayPrayerRecords, isHeroPrayerTimeEntered]);

  // 🎯 NEW: Handle invalid location state
  if (!hasValidLocation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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

  // 🎯 MAIN UI: SanctuaryView hero + secondary content below
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1a: SanctuaryView — full-screen next prayer hero */}
        {nextPrayer ? (
          <SanctuaryView
            prayer={nextPrayer}
            greeting={getGreeting()}
            record={heroPrayerRecord}
            isTimeEntered={isHeroPrayerTimeEntered}
            missedPrayer={missedPreviousPrayer}
            onPrepare={() => handlePrayerComplete(nextPrayer)}
            onPrepareQada={missedPreviousPrayer ? () => handlePrayerComplete(missedPreviousPrayer) : undefined}
          />
        ) : (
          <LinearGradient colors={getBackgroundGradient()} style={styles.noNextPrayer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.allPrayersComplete}>All prayers complete today</Text>
            <Text style={styles.allPrayersSubtext}>Alhamdulillah</Text>
          </LinearGradient>
        )}

        {/* Secondary content — below the fold */}
        <View style={[styles.secondaryContent, { backgroundColor: theme.colors.background.primary }]}>
          {/* Offline Banner */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Offline — times are estimated
              </Text>
            </View>
          )}

          {/* 🕌 Mosque Mode Status Banner */}
          <MosqueModeStatus />

          {/* Sunrise & Sunset */}
          <SunTimesDisplay sunrise={todaySunrise} sunset={todaySunset} />

          {/* Ramadan Suhoor/Iftar — only during Ramadan */}
          {isRamadan() && todayPrayerTimes.length > 0 && (() => {
            const fajr = todayPrayerTimes.find(p => p.name === 'Fajr');
            const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
            if (!fajr || !maghrib) return null;
            return <RamadanTimesCard fajrTime={fajr.time} maghribTime={maghrib.time} />;
          })()}

          {/* Garden Teaser — subtle entry point to Reflection Garden */}
          <GardenTeaser />

          {/* Today's Prayer Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Prayers</Text>
            <View style={styles.prayerGrid}>
              {todayPrayerTimes.map((prayer, index) => {
                const record = todayPrayerRecords.find(
                  (r) => r.prayer === prayer.name
                );
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

          {/* Optional Prayers (Taraweeh during Ramadan, Tahajjud after Isha) */}
          <OptionalPrayersSection onPrepare={handleOptionalPrayerPrepare} />

          {/* Daily Verse */}
          <DailyVerse />

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* 4c: Mosque mode activation overlay */}
      <MosqueModeOverlay />
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  noNextPrayer: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing['2xl'],
  },
  allPrayersComplete: {
    fontSize: 28,
    fontWeight: '300',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  allPrayersSubtext: {
    fontSize: 18,
    fontWeight: '300',
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  secondaryContent: {
    paddingTop: theme.spacing.lg,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '500',
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
  date: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
});

export default HomeScreen;
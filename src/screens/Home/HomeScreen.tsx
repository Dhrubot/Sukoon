import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

// Store and Services
import { useStore } from '../../store/useStore';
import PrayerTimeService from '../../services/PrayerTimeService';
import StorageService from '../../services/StorageService';

// Components (we'll create these next)
import PrayerCard from '../../components/prayer/PrayerCard';
import NextPrayerCard from '../../components/prayer/NextPrayerCard';
import DailyVerse from '../../components/common/DailyVerse';
import QuickStats from '../../components/stats/QuickStats';

// Types
import { PrayerTime } from '../../types';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }: any) => {
  const {
    userSettings,
    location,
    todayPrayerTimes,
    setTodayPrayerTimes,
    nextPrayer,
    setNextPrayer,
    todayPrayerRecords,
    setTodayPrayerRecords,
    currentStreak,
    isRefreshing,
    setIsRefreshing,
  } = useStore();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadPrayerTimes();
    loadTodayRecords();
    
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      updateGreeting();
    }, 60000);

    updateGreeting();

    return () => clearInterval(timer);
  }, [location, userSettings?.calculationMethod]);

  const loadPrayerTimes = async () => {
    if (!location) return;

    try {
      const times = await PrayerTimeService.getPrayerTimesList(
        location,
        new Date(),
        userSettings?.calculationMethod || 'MWL',
        userSettings?.adjustments
      );
      
      setTodayPrayerTimes(times);
      
      const next = times.find(t => t.isNext);
      setNextPrayer(next || null);
    } catch (error) {
      console.error('Error loading prayer times:', error);
    }
  };

  const loadTodayRecords = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const records = StorageService.getDayPrayerRecords(today);
    setTodayPrayerRecords(records);
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    const name = userSettings?.name || '';
    
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

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPrayerTimes();
    loadTodayRecords();
    setIsRefreshing(false);
  }, []);

  const handlePrayerComplete = (prayerTime: PrayerTime) => {
    navigation.navigate('MindfulnessFlow', { prayer: prayerTime });
  };

  const getBackgroundGradient = (): readonly [ColorValue, ColorValue]  => {
    const hour = currentTime.getHours();
    
    if (hour >= 4 && hour < 6) {
      return ['#1a237e', '#3949ab']; // Fajr
    } else if (hour >= 11 && hour < 15) {
      return ['#fff59d', '#ffeb3b']; // Dhuhr
    } else if (hour >= 15 && hour < 18) {
      return ['#ffcc80', '#ff9800']; // Asr
    } else if (hour >= 18 && hour < 20) {
      return ['#e91e63', '#880e4f']; // Maghrib
    } else {
      return ['#1a237e', '#000051']; // Isha/Night
    }
  };

  const completedToday = todayPrayerRecords.filter(r => r.status === 'prayed').length;

  return (
    <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>
              {format(currentTime, 'EEEE, dd MMMM yyyy')}
            </Text>
            {location && (
              <Text style={styles.location}>
                📍 {location.city}, {location.country}
              </Text>
            )}
          </View>

          {/* Next Prayer Card */}
          {nextPrayer && (
            <NextPrayerCard
              prayer={nextPrayer}
              onPrepare={() => handlePrayerComplete(nextPrayer)}
            />
          )}

          {/* Quick Stats */}
          <QuickStats
            prayersToday={completedToday}
            streak={currentStreak}
            nextMilestone={currentStreak > 0 ? Math.ceil(currentStreak / 7) * 7 : 7}
          />

          {/* Today's Prayers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Prayers</Text>
            {todayPrayerTimes.map((prayer) => {
              const record = todayPrayerRecords.find(r => r.prayer === prayer.name);
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

          {/* Daily Verse */}
          <DailyVerse />

          {/* Spacing at bottom */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
});

export default HomeScreen;
// src/screens/Home/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ColorValue,
  ActivityIndicator,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { format, addMinutes } from "date-fns";

// Store and Services
import { useStore } from "../../store/useStore";
import StorageService from "../../services/StorageService";
import { useTheme } from "../../providers/ThemeProvider";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { AppTheme } from "../../theme";

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from "../../providers/PrayerTimesProvider";
import { useMosqueMode } from "../../hooks/useMosqueMode";

// Components
import PrayerCard from "../../components/prayer/PrayerCard";
import SanctuaryView from "../../components/prayer/SanctuaryView";
import DailyVerse from "../../components/common/DailyVerse";
import { SunTimesDisplay } from "../../components/common/SunTimesDisplay";
import { MosqueModeOverlay, MosqueModePrompt } from "../../components/mosque";
import RamadanTimesCard from "../../components/prayer/RamadanTimesCard";
import OptionalPrayersSection from "../../components/prayer/OptionalPrayersSection";
import GardenTeaser from "../../components/garden/GardenTeaser";
import CatchUpCard from "../../components/prayer/CatchUpCard";

// Types
import { PrayerTime, OptionalPrayerTime } from "../../types";

import { isRamadan, getRamadanDay, isEidDay, getEidName, isTashreeqDays, getTashreeqDayLabel } from "../../utils/ramadan";
import { getMoonSightingEvent, getDeferredMoonSightingEvent, getHijriNudgeEvent, MoonSightingEvent, HijriNudgeEvent } from "../../utils/moonSighting";
import MoonSightingPrompt from "../../components/MoonSightingPrompt";
import MoonSightingCard from "../../components/MoonSightingCard";
import HijriNudgeCard from "../../components/HijriNudgeCard";

const { width } = Dimensions.get("window");

const HomeScreen = ({ navigation }: any) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  
  // 🎯 NEW: Replace complex prayer time logic with simple hook
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    tomorrowFajr,
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
    todaySunset,
    todayMidnight,
  } = useStore();

  // Mosque mode state for focus mode + pill badge
  const { isActive: isMosqueModeActive, activeState: mosqueModeState, isEnabled: isMosqueModeEnabled, settings: mosqueModeSettings, getIqamahTime, scheduleSilentMode } = useMosqueMode();

  // Mosque mode prompt (confirm mode)
  const pendingMosquePromptPrayer = useStore((s) => s.pendingMosquePromptPrayer);
  const setPendingMosquePromptPrayer = useStore((s) => s.setPendingMosquePromptPrayer);
  const [mosquePromptPrayer, setMosquePromptPrayer] = useState<PrayerTime | null>(null);
  const [dismissedMosquePrompts, setDismissedMosquePrompts] = useState<Set<string>>(new Set());

  // Local state for UI features
  const [currentTime, setCurrentTime] = useState(new Date());
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [moonSightingEvent, setMoonSightingEvent] = useState<MoonSightingEvent | null>(null);
  const [deferredMoonEvent, setDeferredMoonEvent] = useState<MoonSightingEvent | null>(null);
  const [hijriNudge, setHijriNudge] = useState<HijriNudgeEvent | null>(null);

  // Mosque mode prompt: notification tap path
  useEffect(() => {
    if (!pendingMosquePromptPrayer) return;
    const prayer = todayPrayerTimes.find(p => p.name === pendingMosquePromptPrayer);
    if (prayer) {
      setMosquePromptPrayer(prayer);
    }
    setPendingMosquePromptPrayer(null);
  }, [pendingMosquePromptPrayer, todayPrayerTimes]);

  // 🎯 REMOVED: loadPrayerTimes function - now handled by provider!
  // 🎯 REMOVED: location checks - now handled by provider!
  // 🎯 REMOVED: prayer time error handling - now handled by provider!

  // AppState-aware timer: pause on background, immediate sync on foreground
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Only load non-prayer-time related data
    loadTodayRecords();

    const startTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);
    };

    startTimer();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Immediately sync stale time and restart interval
        setCurrentTime(new Date());
        loadTodayRecords();
        startTimer();
      } else {
        // Pause interval when backgrounded/inactive
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      subscription.remove();
    };
  }, []);

  // Check for moon sighting prompt — gates on Maghrib time for eve dates
  // Re-checks every minute (via currentTime) to catch the Maghrib crossover
  useEffect(() => {
    if (todayPrayerTimes.length === 0) return;

    // Find today's Maghrib time
    const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
    const maghribTime = maghrib?.time;

    // Check for active prompt (not yet shown or deferred wanting re-trigger)
    if (!moonSightingEvent) {
      const event = getMoonSightingEvent(maghribTime);
      if (event) {
        setMoonSightingEvent(event);
        setDeferredMoonEvent(null);
        return;
      }
    }

    // Check for deferred card (user said "Not yet" previously)
    const deferred = getDeferredMoonSightingEvent();
    setDeferredMoonEvent(deferred);

    // Check for expanded hijri nudge (days 1-3 of critical months)
    if (!moonSightingEvent && !deferred) {
      setHijriNudge(getHijriNudgeEvent());
    } else {
      setHijriNudge(null);
    }
  }, [todayPrayerTimes, currentTime]);

  const loadTodayRecords = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const records = StorageService.getDayPrayerRecords(today);
    setTodayPrayerRecords(records);
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
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer, isSunnah: true });
  };

  const handleSunnahPrayer = () => {
    const prayerName = nextPrayer?.name ?? 'Fajr';
    const sunnahPrayer = {
      name: prayerName,
      time: new Date().toISOString(),
      timestamp: Date.now(),
      isNext: false,
    };
    navigation.navigate("MindfulnessFlow", { prayer: sunnahPrayer, isSunnah: true });
  };

  const getBackgroundGradient = (): readonly [ColorValue, ColorValue] => {
    return [theme.colors.background.primary, theme.colors.background.secondary];
  };


  const completedToday = todayPrayerRecords.filter(r => r.status === 'prayed').length;

  // Prayer-aware hero: if the user already prayed the current fiqh-window prayer,
  // advance the hero to the next unprayed prayer. Returns null when all are prayed.
  // Extract first name for gold rendering in SanctuaryView greeting
  const heroUserName = useMemo(() => {
    const fullName = userSettings?.name?.trim() || 'Friend';
    const firstName = fullName.split(/\s+/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }, [userSettings?.name]);

  const heroPrayer = useMemo(() => {
    if (!nextPrayer) return tomorrowFajr ? { ...tomorrowFajr, isNext: true } : null;

    // After Islamic midnight and Isha is the current prayer → transition hero to Fajr
    const now = new Date();
    if (
      nextPrayer.name === 'Isha' &&
      todayMidnight &&
      now >= todayMidnight &&
      tomorrowFajr
    ) {
      return { ...tomorrowFajr, isNext: true };
    }

    const isCurrentPrayed = todayPrayerRecords.some(
      r => r.prayer === nextPrayer.name && r.status === 'prayed'
    );
    if (!isCurrentPrayed) return nextPrayer;

    // Walk forward to find the next unprayed prayer
    const currentIdx = todayPrayerTimes.findIndex(p => p.name === nextPrayer.name);
    for (let i = currentIdx + 1; i < todayPrayerTimes.length; i++) {
      const p = todayPrayerTimes[i];
      const prayed = todayPrayerRecords.some(
        r => r.prayer === p.name && r.status === 'prayed'
      );
      if (!prayed) return { ...p, isNext: true };
    }

    // All remaining prayers prayed → show tomorrow's Fajr
    return tomorrowFajr ? { ...tomorrowFajr, isNext: true } : null;
  }, [nextPrayer, todayPrayerTimes, todayPrayerRecords, tomorrowFajr, todayMidnight]);

  // Previous prayer time for inter-prayer ring progress
  const previousPrayerTime = useMemo(() => {
    if (!heroPrayer) return undefined;
    const heroIdx = todayPrayerTimes.findIndex(p => p.name === heroPrayer.name);
    if (heroIdx > 0) return todayPrayerTimes[heroIdx - 1].time;
    return undefined;
  }, [heroPrayer, todayPrayerTimes]);

  // Unified mosque mode info for the hero pill — scoped to heroPrayer
  const mosqueModeHeroInfo = useMemo(() => {
    if (!isMosqueModeEnabled) return null;

    // Path 1: Storage-backed active state (manual scheduling via "heading to mosque")
    if (isMosqueModeActive && mosqueModeState) {
      return {
        iqamahTime: mosqueModeState.iqamahTime,
        restoreTime: mosqueModeState.restoreTime,
      };
    }

    // Path 2: Compute active window from settings — show pill during iqamah→restore window
    if (mosqueModeSettings) {
      const now = new Date();
      for (const p of todayPrayerTimes) {
        const iq = getIqamahTime(p);
        if (!iq) continue;
        const restore = addMinutes(iq, mosqueModeSettings.silentDuration);
        if (now >= iq && now < restore) {
          return { iqamahTime: iq, restoreTime: restore };
        }
      }
    }

    // Path 3: Show hero prayer's own iqamah (SanctuaryView handles past vs future text)
    if (!heroPrayer) return null;
    const iqamah = getIqamahTime(heroPrayer);
    if (!iqamah) return null;
    return { iqamahTime: iqamah };
  }, [isMosqueModeEnabled, isMosqueModeActive, mosqueModeState, mosqueModeSettings, heroPrayer, todayPrayerTimes, getIqamahTime, currentTime]);

  // Focus Mode: sanctuary expands during prayer window or active mosque mode
  const isFocusMode = useMemo(() => {
    // Mosque mode active window (iqamah → restore): keep sanctuary expanded
    if (mosqueModeHeroInfo?.restoreTime) {
      return true;
    }

    // General prayer window: 15 min before → 30 min after prayer time
    if (!heroPrayer) return false;
    const minutesUntil = Math.floor(
      (heroPrayer.time.getTime() - currentTime.getTime()) / (1000 * 60)
    );
    return minutesUntil >= -30 && minutesUntil <= 15;
  }, [heroPrayer, currentTime, mosqueModeHeroInfo]);

  // Find the record for the current hero prayer (if already prayed)
  const heroPrayerRecord = useMemo(() => {
    if (!heroPrayer) return undefined;
    return todayPrayerRecords.find(
      r => r.prayer === heroPrayer.name && r.status === 'prayed'
    );
  }, [heroPrayer, todayPrayerRecords]);

  // Check if the hero prayer's adhan has actually happened
  const isHeroPrayerTimeEntered = useMemo(() => {
    if (!heroPrayer) return false;
    return heroPrayer.time <= currentTime;
  }, [heroPrayer, currentTime]);

  // Find the most recent MISSED prayer (before the hero prayer) for qada prompt
  const missedPreviousPrayer = useMemo(() => {
    if (!heroPrayer || isHeroPrayerTimeEntered) return undefined;
    const heroIdx = todayPrayerTimes.findIndex(p => p.name === heroPrayer.name);
    // Walk backwards to find the first unprayed prayer
    for (let i = heroIdx - 1; i >= 0; i--) {
      const p = todayPrayerTimes[i];
      const prayed = todayPrayerRecords.some(
        r => r.prayer === p.name && r.status === 'prayed'
      );
      if (!prayed) return p;
    }
    return undefined;
  }, [heroPrayer, todayPrayerTimes, todayPrayerRecords, isHeroPrayerTimeEntered]);

  // All missed prayers today (past time, no record, next prayer started)
  const missedPrayersToday = useMemo(() => {
    return todayPrayerTimes.filter((prayer, index) => {
      if (prayer.time > currentTime) return false; // future
      const hasRecord = todayPrayerRecords.some(
        r => r.prayer === prayer.name && r.status === 'prayed'
      );
      if (hasRecord) return false;
      // Fajr: missed after sunrise
      if (prayer.name === 'Fajr' && todaySunrise && todaySunrise <= currentTime) return true;
      // Others: missed when next prayer has started
      const nextInList = index < todayPrayerTimes.length - 1 ? todayPrayerTimes[index + 1] : null;
      return nextInList ? nextInList.time <= currentTime : false;
    });
  }, [todayPrayerTimes, todayPrayerRecords, currentTime, todaySunrise]);

  // Mosque mode prompt: in-app auto-show when iqamah is ≤5 min away
  useEffect(() => {
    if (!isMosqueModeEnabled || !mosqueModeSettings?.promptBeforeEnable) return;
    if (isMosqueModeActive) return; // Already active
    if (mosquePromptPrayer) return; // Already showing
    if (!heroPrayer) return;

    const iqamah = getIqamahTime(heroPrayer);
    if (!iqamah) return;

    const minsUntil = (iqamah.getTime() - currentTime.getTime()) / (1000 * 60);
    if (minsUntil > 0 && minsUntil <= 5 && !dismissedMosquePrompts.has(heroPrayer.name)) {
      setMosquePromptPrayer(heroPrayer);
    }
  }, [isMosqueModeEnabled, mosqueModeSettings?.promptBeforeEnable, isMosqueModeActive, heroPrayer, currentTime, mosquePromptPrayer, dismissedMosquePrompts]);

  // 1c: Prayer-aware greeting
  const getGreeting = (): string => {
    const fullName = userSettings?.name?.trim() || 'Friend';
    const firstName = fullName.split(/\s+/)[0];
    const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const now = currentTime;

    if (heroPrayer) {
      const minutesUntil = Math.floor(
        (heroPrayer.time.getTime() - now.getTime()) / (1000 * 60)
      );

      // Within 30 minutes of next prayer — approaching
      if (minutesUntil > 0 && minutesUntil <= 30) {
        return `${heroPrayer.name} is approaching, ${name}`;
      }

      // Within active prayer window (past the time, within grace)
      if (minutesUntil <= 0 && minutesUntil > -60) {
        return `بِسْمِ اللَّهِ — Time for ${heroPrayer.name}`;
      }
    }

    // Eid greeting (day 1 only)
    const eidName = getEidName();
    if (eidName) {
      return `Eid Mubarak, ${name}! 🌙`;
    }

    // Takbirat during Ayyam al-Tashreeq (9-13 Dhul Hijjah)
    const tashreeqLabel = getTashreeqDayLabel();
    if (tashreeqLabel) {
      return `${tashreeqLabel} — Allahu Akbar, ${name}`;
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

  // 🎯 NEW: Handle invalid location state
  if (!hasValidLocation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
          <View style={styles.locationSetupContainer}>
            <Text style={styles.setupTitle}>Welcome to Sukoon</Text>
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
        {/* 1a: SanctuaryView — full-screen next prayer hero (always rendered) */}
        {heroPrayer && (
          <SanctuaryView
            prayer={heroPrayer}
            greeting={getGreeting()}
            userName={heroUserName}
            previousPrayerTime={previousPrayerTime}
            record={heroPrayerRecord}
            isTimeEntered={isHeroPrayerTimeEntered}
            missedPrayer={missedPreviousPrayer}
            onPrepare={() => handlePrayerComplete(heroPrayer)}
            onPrepareQada={missedPreviousPrayer ? () => handlePrayerComplete(missedPreviousPrayer) : undefined}
            onPraySunnah={handleSunnahPrayer}
            isFocusMode={isFocusMode}
            mosqueModeInfo={mosqueModeHeroInfo ?? undefined}
            onMosqueModeTap={() => navigation.navigate('MosqueMode' as never)}
          />
        )}

        {/* Secondary content — collapsed in Focus Mode */}
        {isFocusMode && !focusExpanded && (
          <TouchableOpacity
            style={styles.focusRevealButton}
            onPress={() => setFocusExpanded(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.focusRevealText}>See today's prayers ↓</Text>
          </TouchableOpacity>
        )}
        <View style={[
          styles.secondaryContent,
          { backgroundColor: theme.colors.background.primary },
          isFocusMode && !focusExpanded && styles.secondaryContentHidden,
        ]}>
          {/* Offline Banner */}
          {isOffline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Offline — times are estimated
              </Text>
            </View>
          )}


          {/* Ramadan Suhoor/Iftar — only during Ramadan */}
          {isRamadan() && todayPrayerTimes.length > 0 && (() => {
            const fajr = todayPrayerTimes.find(p => p.name === 'Fajr');
            const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
            if (!fajr || !maghrib) return null;
            return <RamadanTimesCard fajrTime={fajr.time} maghribTime={maghrib.time} />;
          })()}

          {/* 🌙 Deferred moon sighting card — re-trigger prompt */}
          {deferredMoonEvent && !moonSightingEvent && (
            <MoonSightingCard
              title={deferredMoonEvent.title.replace('The Crescent of ', '')}
              onPress={() => {
                setMoonSightingEvent(deferredMoonEvent);
                setDeferredMoonEvent(null);
              }}
            />
          )}

          {/* 🌙 Hijri date nudge — persistent card during first 3 days of critical months */}
          {hijriNudge && !moonSightingEvent && !deferredMoonEvent && (
            <HijriNudgeCard
              nudge={hijriNudge}
              onDismissed={() => setHijriNudge(null)}
            />
          )}

          {/* Sunrise & Sunset */}
          <SunTimesDisplay sunrise={todaySunrise} sunset={todaySunset} />

          {/* Garden Teaser — subtle entry point to Reflection Garden */}
          <GardenTeaser />


          {/* Catch-up card — warm prompt when ≥3 prayers missed */}
          <CatchUpCard
            missedPrayers={missedPrayersToday}
            onCatchUp={(prayer) => handlePrayerComplete(prayer)}
          />

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

      {/* Mosque mode prompt — "Heading to the mosque?" */}
      {mosquePromptPrayer && (
        <MosqueModePrompt
          visible={!!mosquePromptPrayer}
          prayer={mosquePromptPrayer}
          onConfirm={async () => {
            await scheduleSilentMode(mosquePromptPrayer);
            setDismissedMosquePrompts(prev => new Set(prev).add(mosquePromptPrayer.name));
            setMosquePromptPrayer(null);
          }}
          onCancel={() => {
            setDismissedMosquePrompts(prev => new Set(prev).add(mosquePromptPrayer.name));
            setMosquePromptPrayer(null);
          }}
        />
      )}

      {/* Moon sighting confirmation — shows once per critical Hijri transition */}
      {moonSightingEvent && (
        <MoonSightingPrompt
          event={moonSightingEvent}
          onDismiss={() => {
            setMoonSightingEvent(null);
            // Refresh deferred state after modal closes
            const deferred = getDeferredMoonSightingEvent();
            setDeferredMoonEvent(deferred);
          }}
        />
      )}
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
  focusRevealButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
  },
  focusRevealText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  secondaryContentHidden: {
    display: 'none',
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  secondaryContent: {
    paddingTop: theme.spacing.xs,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.headingMedium,
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
    padding: theme.spacing['4xl'],
  },
  setupTitle: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  setupSubtitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
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
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
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
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['4xl'],
  },
  errorTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
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
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  date: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
  },
  offlineBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.status.warning,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
});

export default HomeScreen;
// src/screens/Home/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ColorValue,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { format, addMinutes } from "date-fns";
import { useShallow } from "zustand/react/shallow";

// Store and Services
import { useStore } from "../../store/useStore";
import StorageService from "../../services/StorageService";
import { useTheme } from "../../providers/ThemeProvider";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { AppTheme } from "../../theme";

// NEW: Use our centralized prayer times hook
import { usePrayerTimes } from "../../providers/PrayerTimesProvider";
import { useMosqueMode } from "../../hooks/useMosqueMode";
import { useAppStateChange } from "../../hooks/useAppStateChange";

// Components
import PrayerCard from "../../components/prayer/PrayerCard";
import SanctuaryView from "../../components/prayer/SanctuaryView";
import DailyVerse from "../../components/common/DailyVerse";
import { SunTimesDisplay } from "../../components/common/SunTimesDisplay";
import { MosqueModeOverlay, MosqueModePrompt } from "../../components/mosque";
import RamadanTimesCard from "../../components/prayer/RamadanTimesCard";
import OptionalPrayersSection from "../../components/prayer/OptionalPrayersSection";
import GardenTeaser from "../../components/garden/GardenTeaser";
import QuickLogSheet from "../../components/prayer/QuickLogSheet";
import CatchUpSheet from "../../components/prayer/CatchUpSheet";
import HijriNudgeSheet from "../../components/HijriNudgeSheet";
import AutoDeduceSheet from "../../components/AutoDeduceSheet";

// Types
import { PrayerTime, PrayerRecord, OptionalPrayerTime, PrayerName } from "../../types";

import { isRamadan, getRamadanDay, isEidDay, getEidName, isTashreeqDays, getTashreeqDayLabel } from "../../utils/ramadan";
import { getMoonSightingEvent, getDeferredMoonSightingEvent, getHijriNudgeEvent, getAutoDeduceEndOfMonthEvent, MoonSightingEvent, HijriNudgeEvent, AutoDeduceEvent } from "../../utils/moonSighting";
import * as Haptics from "expo-haptics";
import { useRoute, CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { StackNavigationProp } from "@react-navigation/stack";
import { TabParamList, RootStackParamList } from "../../types/navigation";
import ReminderStateService from "../../services/ReminderStateService";
import NotificationService from "../../services/NotificationService";
import WidgetService from "../../services/WidgetService";
import TreeGrowthStateService from "../../services/TreeGrowthStateService";
import { getLocalDateKey } from "../../utils/dateHelpers";
import MoonSightingPrompt from "../../components/MoonSightingPrompt";

import { HERO_ADVANCE_MINUTES } from "../../constants/NotificationConstants";

const { width } = Dimensions.get("window");

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

const HomeScreen = ({ navigation }: { navigation: HomeScreenNavigationProp }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  
  // 🎯 NEW: Replace complex prayer time logic with simple hook
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    tomorrowFajr,
    isLoading: prayerTimesLoading, 
    hasValidLocation, 
    isOffline,
    usingHardcodedDefaults,
    highLatitudeWarning,
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
  } = useStore(useShallow((state) => ({
    userSettings: state.userSettings,
    todayPrayerRecords: state.todayPrayerRecords,
    setTodayPrayerRecords: state.setTodayPrayerRecords,
    todaySunrise: state.todaySunrise,
    todaySunset: state.todaySunset,
    todayMidnight: state.todayMidnight,
  })));

  // Mosque mode state for focus mode + pill badge
  const { isActive: isMosqueModeActive, activeState: mosqueModeState, isEnabled: isMosqueModeEnabled, settings: mosqueModeSettings, getIqamahTime, scheduleSilentMode } = useMosqueMode();

  // Mosque mode prompt (confirm mode)
  const pendingMosquePromptPrayer = useStore((s) => s.pendingMosquePromptPrayer);
  const setPendingMosquePromptPrayer = useStore((s) => s.setPendingMosquePromptPrayer);
  const [mosquePromptPrayer, setMosquePromptPrayer] = useState<PrayerTime | null>(null);
  const [dismissedMosquePrompts, setDismissedMosquePrompts] = useState<Set<string>>(new Set());

  // Shared clock from PrayerTimesProvider's single 60s tick
  const currentTime = useStore((s) => s.currentTime);

  // Local state for UI features
  const [secondaryContentVisible, setSecondaryContentVisible] = useState(false);
  const [moonSightingEvent, setMoonSightingEvent] = useState<MoonSightingEvent | null>(null);
  const [hijriNudge, setHijriNudge] = useState<HijriNudgeEvent | null>(null);
  const [autoDeduceEvent, setAutoDeduceEvent] = useState<AutoDeduceEvent | null>(null);

  // Session flags — sheets shown at most once per app foreground
  const catchUpSheetShownRef = useRef(false);
  const [showCatchUpSheet, setShowCatchUpSheet] = useState(false);
  const [showHijriNudgeSheet, setShowHijriNudgeSheet] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingRevealScrollRef = useRef(false);

  // Quick-log state
  const [quickLogPrayer, setQuickLogPrayer] = useState<PrayerTime | null>(null);
  const route = useRoute<any>();
  const addPrayerRecord = useStore((state) => state.addPrayerRecord);

  // Handle notification tap → auto-show QuickLogSheet
  const VALID_PRAYER_NAMES_SET = useMemo(() => new Set(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']), []);
  useEffect(() => {
    const rawParam = route.params?.quickLogPrayer;
    if (!rawParam || !VALID_PRAYER_NAMES_SET.has(rawParam) || todayPrayerTimes.length === 0) return;
    const prayerName = rawParam as PrayerName;

    const prayer = todayPrayerTimes.find(p => p.name === prayerName);
    const existing = todayPrayerRecords.find(r => r.prayer === prayerName);

    if (prayer && existing?.status !== 'prayed') {
      setQuickLogPrayer(prayer);
    }

    // Clear the param so it doesn't re-trigger
    navigation.setParams({ quickLogPrayer: undefined });
  }, [route.params?.quickLogPrayer, todayPrayerTimes]);

  const handleQuickLogTrigger = useCallback((prayer: PrayerTime) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickLogPrayer(prayer);
  }, []);

  const handleQuickLogConfirm = useCallback(() => {
    if (!quickLogPrayer) return;

    const dateKey = getLocalDateKey();
    const existing = StorageService.getPrayerRecord(dateKey, quickLogPrayer.name);

    if (!existing || existing.status !== 'prayed') {
      const record: PrayerRecord = {
        id: `prayer_${Date.now()}`,
        date: dateKey,
        prayer: quickLogPrayer.name,
        status: 'prayed',
        prayedAt: new Date(),
        mindfulnessCompleted: false,
        reflectionAdded: false,
      };
      StorageService.savePrayerRecordWithTracking(record);
      addPrayerRecord(record);
      WidgetService.reloadWidgets();
      loadTodayRecords();

      // Update permanent tree growth state (quick-log defaults to mood 3 = sprout leaf)
      TreeGrowthStateService.recordReflection(quickLogPrayer.name, 3, dateKey);
    }

    // Close reminder flow + cancel pending notifications
    const prayerId = `${quickLogPrayer.name}-${dateKey}`;
    ReminderStateService.markPrayerCompleted(prayerId);
    NotificationService.cancelPrayerReminderFlow(prayerId).catch(() => {});

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuickLogPrayer(null);
  }, [quickLogPrayer, addPrayerRecord]);

  const handleQuickLogOpenFlow = useCallback(() => {
    const prayer = quickLogPrayer;
    setQuickLogPrayer(null);
    if (prayer) {
      handlePrayerComplete(prayer);
    }
  }, [quickLogPrayer]);

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

  // Load records on mount
  useEffect(() => {
    loadTodayRecords();
    checkNotificationPermission();
  }, []);

  // Notification permission denied banner
  const [notificationsDenied, setNotificationsDenied] = useState(false);
  const checkNotificationPermission = useCallback(() => {
    const denied = StorageService.getValue('notification_permission_denied') === 'true';
    setNotificationsDenied(denied);
  }, []);

  // Reload on foreground via shared AppState listener
  useAppStateChange((nextState) => {
    if (nextState === 'active') {
      loadTodayRecords();
      checkNotificationPermission();
    }
  });

  // Check for moon sighting prompt — gates on Maghrib time for eve dates
  // Re-checks every minute (via currentTime) to catch the Maghrib crossover
  useEffect(() => {
    if (todayPrayerTimes.length === 0) return;

    // Auto-deduce end-of-month (Ramadan 30 → Eid, etc.)
    if (!autoDeduceEvent) {
      const deduce = getAutoDeduceEndOfMonthEvent();
      if (deduce) {
        setAutoDeduceEvent(deduce);
        return;
      }
    }

    // Find today's Maghrib time
    const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
    const maghribTime = maghrib?.time;

    // Check for active prompt (not yet shown or deferred wanting re-trigger)
    if (!moonSightingEvent) {
      const event = getMoonSightingEvent(maghribTime);
      if (event) {
        setMoonSightingEvent(event);
        return;
      }
    }

    // Check for deferred state — re-show the prompt sheet on next app open
    if (!moonSightingEvent) {
      const deferred = getDeferredMoonSightingEvent();
      if (deferred) {
        setMoonSightingEvent(deferred);
        return;
      }
    }

    // Check for hijri nudge sheet (days 1-3 of critical months)
    if (!moonSightingEvent) {
      const nudge = getHijriNudgeEvent();
      setHijriNudge(nudge);
      if (nudge && !showHijriNudgeSheet) {
        setShowHijriNudgeSheet(true);
      }
    } else {
      setHijriNudge(null);
    }
  }, [todayPrayerTimes, currentTime]);

  const loadTodayRecords = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const records = StorageService.getDayPrayerRecords(today);
    // Shallow comparison: skip setState if records haven't changed (avoids PrayerCard re-renders)
    const { todayPrayerRecords: current } = useStore.getState();
    const changed =
      records.length !== current.length ||
      records.some((r, i) => r.prayer !== current[i]?.prayer || r.status !== current[i]?.status);
    if (changed) {
      setTodayPrayerRecords(records);
    }
  }, [setTodayPrayerRecords]);


  const handlePrayerComplete = useCallback((prayerTime: PrayerTime) => {
    // Create a serializable version of prayerTime by converting Date to ISO string
    const serializablePrayer = {
      ...prayerTime,
      time: prayerTime.time.toISOString(),  // Convert Date to string
    };
    
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer });
  }, [navigation]);

  const handleOptionalPrayerPrepare = useCallback((prayer: OptionalPrayerTime) => {
    const serializablePrayer = {
      name: prayer.name,
      time: prayer.time.toISOString(),
      timestamp: prayer.time.getTime(),
      isNext: false,
    };
    navigation.navigate("MindfulnessFlow", { prayer: serializablePrayer, isSunnah: true });
  }, [navigation]);

  const handleSunnahPrayer = useCallback(() => {
    const prayerName = nextPrayer?.name ?? 'Fajr';
    const sunnahPrayer = {
      name: prayerName,
      time: new Date().toISOString(),
      timestamp: Date.now(),
      isNext: false,
    };
    navigation.navigate("MindfulnessFlow", { prayer: sunnahPrayer, isSunnah: true });
  }, [navigation, nextPrayer?.name]);

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

    // Determine base hero prayer from fiqh-window logic
    let base: PrayerTime | null = null;

    if (!isCurrentPrayed) {
      base = nextPrayer;
    } else {
      // Walk forward to find the next unprayed prayer
      const currentIdx = todayPrayerTimes.findIndex(p => p.name === nextPrayer.name);
      for (let i = currentIdx + 1; i < todayPrayerTimes.length; i++) {
        const p = todayPrayerTimes[i];
        const prayed = todayPrayerRecords.some(
          r => r.prayer === p.name && r.status === 'prayed'
        );
        if (!prayed) {
          base = { ...p, isNext: true };
          break;
        }
      }
    }

    // All remaining prayers prayed → show tomorrow's Fajr
    if (!base) return tomorrowFajr ? { ...tomorrowFajr, isNext: true } : null;

    // Early advance: if the next chronological prayer is ≤15 min away, show it instead.
    // This makes the hero ring transition before the fiqh window officially ends,
    // aligning with focus mode activation timing.
    const baseIdx = todayPrayerTimes.findIndex(p => p.name === base!.name);
    const nextChronoPrayer = baseIdx >= 0 && baseIdx < todayPrayerTimes.length - 1
      ? todayPrayerTimes[baseIdx + 1]
      : tomorrowFajr;

    if (nextChronoPrayer) {
      const msUntilNext = nextChronoPrayer.time.getTime() - now.getTime();
      const minutesUntilNext = msUntilNext / (1000 * 60);
      if (minutesUntilNext <= HERO_ADVANCE_MINUTES && minutesUntilNext > 0) {
        return { ...nextChronoPrayer, isNext: true };
      }
    }

    return base;
  }, [nextPrayer, todayPrayerTimes, todayPrayerRecords, tomorrowFajr, todayMidnight, currentTime]);

  // Stable identity key — only changes when the hero prayer actually transitions.
  // Downstream memos use this instead of heroPrayer (which rebuilds every 60s tick).
  const heroPrayerName = heroPrayer?.name ?? null;

  // Previous prayer time for inter-prayer ring progress
  const previousPrayerTime = useMemo(() => {
    if (!heroPrayer) return undefined;
    const heroIdx = todayPrayerTimes.findIndex(p => p.name === heroPrayer.name);
    if (heroIdx > 0) return todayPrayerTimes[heroIdx - 1].time;
    return undefined;
  }, [heroPrayerName, todayPrayerTimes]);

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
  }, [isMosqueModeEnabled, isMosqueModeActive, mosqueModeState, mosqueModeSettings, heroPrayerName, todayPrayerTimes, getIqamahTime, currentTime]);

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

  const isHeroImmersive = isFocusMode || !secondaryContentVisible;

  useEffect(() => {
    setSecondaryContentVisible(false);
    pendingRevealScrollRef.current = false;
  }, [heroPrayerName]);

  // Find the record for the current hero prayer (if already prayed)
  const heroPrayerRecord = useMemo(() => {
    if (!heroPrayer) return undefined;
    return todayPrayerRecords.find(
      r => r.prayer === heroPrayer.name && r.status === 'prayed'
    );
  }, [heroPrayerName, todayPrayerRecords]);

  // Check if the hero prayer's adhan has actually happened
  const isHeroPrayerTimeEntered = useMemo(() => {
    if (!heroPrayer) return false;
    return heroPrayer.time <= currentTime;
  }, [heroPrayer, currentTime]);

  // Find the most recent MISSED prayer (before the hero prayer) for qada prompt
  const missedPreviousPrayer = useMemo(() => {
    if (!heroPrayer || isHeroPrayerTimeEntered) return undefined;
    const heroIdx = todayPrayerTimes.findIndex(p => p.name === heroPrayer.name);
    // When hero is Fajr (idx 0) or tomorrowFajr (idx -1), search from end (Isha)
    const startIdx = heroIdx <= 0 ? todayPrayerTimes.length - 1 : heroIdx - 1;
    for (let i = startIdx; i >= 0; i--) {
      const p = todayPrayerTimes[i];
      const prayed = todayPrayerRecords.some(
        r => r.prayer === p.name && r.status === 'prayed'
      );
      if (!prayed) return p;
    }
    return undefined;
  }, [heroPrayerName, todayPrayerTimes, todayPrayerRecords, isHeroPrayerTimeEntered]);

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

  // Show catch-up sheet once per session when ≥3 prayers missed
  useEffect(() => {
    if (catchUpSheetShownRef.current) return;
    if (missedPrayersToday.length >= 3) {
      catchUpSheetShownRef.current = true;
      setShowCatchUpSheet(true);
    }
  }, [missedPrayersToday]);

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

  // Re-lock focus mode when user scrolls back to top
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (secondaryContentVisible && e.nativeEvent.contentOffset.y <= 20) {
      setSecondaryContentVisible(false);
    }
  };

  const handleToggleSecondaryContent = useCallback(() => {
    setSecondaryContentVisible((visible) => {
      const nextVisible = !visible;

      if (!nextVisible) {
        pendingRevealScrollRef.current = false;
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
        return nextVisible;
      }

      pendingRevealScrollRef.current = true;
      return nextVisible;
    });
  }, []);

  // 🎯 NEW: Handle invalid location state
  if (!hasValidLocation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
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
            onPrepare={() => handleQuickLogTrigger(heroPrayer)}
            onPrepareQada={missedPreviousPrayer ? () => handlePrayerComplete(missedPreviousPrayer) : undefined}
            onPraySunnah={handleSunnahPrayer}
            onRepeatPrayer={() => handlePrayerComplete(heroPrayer)}
            onLongPress={() => handlePrayerComplete(heroPrayer)}
            isFocusMode={isHeroImmersive}
            mosqueModeInfo={mosqueModeHeroInfo ?? undefined}
            onMosqueModeTap={() => navigation.navigate('MosqueMode' as never)}
          />
        )}

        <TouchableOpacity
          style={styles.focusRevealButton}
          onPress={handleToggleSecondaryContent}
          activeOpacity={0.7}
        >
          <Text style={styles.focusRevealText}>
            {secondaryContentVisible ? 'Return to sanctuary ↑' : "See today's prayers ↓"}
          </Text>
        </TouchableOpacity>

        {secondaryContentVisible && (
          <View style={[
            styles.secondaryContent,
            { backgroundColor: theme.colors.background.primary },
          ]}
          onLayout={(event) => {
            if (!pendingRevealScrollRef.current) return;
            pendingRevealScrollRef.current = false;
            const revealClearance = insets.top + theme.spacing.lg;
            const targetY = Math.max(event.nativeEvent.layout.y - revealClearance, 0);
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
            });
          }}
          >
          {/* Offline / Hardcoded Defaults Banner */}
          {usingHardcodedDefaults && (
            <View style={[styles.offlineBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Text style={[styles.offlineBannerText, { color: theme.colors.status.error }]}>
                Unable to calculate prayer times — please check your connection
              </Text>
            </View>
          )}
          {isOffline && !usingHardcodedDefaults && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Offline — times are estimated
              </Text>
            </View>
          )}
          {highLatitudeWarning && !usingHardcodedDefaults && (
            <View style={[styles.offlineBanner, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.25)' }]}>
              <Text style={[styles.offlineBannerText, { color: theme.colors.status.info || '#3b82f6' }]}>
                High-latitude location — Fajr/Isha times may be approximate
              </Text>
            </View>
          )}

          {/* Notification Permission Denied Banner */}
          {notificationsDenied && userSettings?.notifications?.enabled && (
            <TouchableOpacity
              style={styles.permissionBanner}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionBannerText}>
                Prayer reminders are off — tap to re-enable
              </Text>
            </TouchableOpacity>
          )}


          {/* Ramadan Suhoor/Iftar — only during Ramadan */}
          {isRamadan() && todayPrayerTimes.length > 0 && (() => {
            const fajr = todayPrayerTimes.find(p => p.name === 'Fajr');
            const maghrib = todayPrayerTimes.find(p => p.name === 'Maghrib');
            if (!fajr || !maghrib) return null;
            return <RamadanTimesCard fajrTime={fajr.time} maghribTime={maghrib.time} />;
          })()}

          {/* Sunrise & Sunset */}
          <SunTimesDisplay sunrise={todaySunrise} sunset={todaySunset} />

          {/* Garden Teaser — subtle entry point to Reflection Garden */}
          <GardenTeaser />

          {/* Today's Prayer Times */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{"Today's Prayers"}</Text>
            <View style={styles.prayerListCard}>
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
                    compact
                    isLast={index === todayPrayerTimes.length - 1}
                    onComplete={() => handleQuickLogTrigger(prayer)}
                    onLongPress={() => handlePrayerComplete(prayer)}
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
        )}
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
          onDismiss={() => setMoonSightingEvent(null)}
        />
      )}

      {/* Hijri date nudge — "Is today X?" sheet during days 1–3 of critical months */}
      {showHijriNudgeSheet && !!hijriNudge && !moonSightingEvent && (
        <HijriNudgeSheet
          visible
          nudge={hijriNudge}
          onDismissed={() => {
            setShowHijriNudgeSheet(false);
            setHijriNudge(null);
          }}
        />
      )}

      {/* Auto-deduce celebration — Ramadan 30 → Eid, Dhul Qi'dah 30 → Dhul Hijjah */}
      {!!autoDeduceEvent && (
        <AutoDeduceSheet
          visible
          event={autoDeduceEvent}
          onDismiss={() => setAutoDeduceEvent(null)}
        />
      )}

      {/* Catch-up sheet — once per session when ≥3 prayers missed */}
      {showCatchUpSheet && (
        <CatchUpSheet
          visible
          missedPrayers={missedPrayersToday}
          onCatchUp={(prayer: PrayerTime) => handlePrayerComplete(prayer)}
          onDismiss={() => setShowCatchUpSheet(false)}
        />
      )}

      {/* Quick-log sheet — long-press or notification tap */}
      {!!quickLogPrayer && (
        <QuickLogSheet
          visible
          prayerName={quickLogPrayer.name}
          onConfirm={handleQuickLogConfirm}
          onOpenFlow={handleQuickLogOpenFlow}
          onDismiss={() => setQuickLogPrayer(null)}
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
    paddingTop: theme.spacing.xs,
    paddingBottom: 0,
    marginTop: -10,
    backgroundColor: 'transparent',
  },
  focusRevealText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  secondaryContent: {
    paddingTop: 0,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  prayerGrid: {
    gap: theme.spacing.md,
  },
  prayerListCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    overflow: 'hidden',
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
  permissionBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center' as const,
  },
  permissionBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: '#ef4444',
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
});

export default HomeScreen;

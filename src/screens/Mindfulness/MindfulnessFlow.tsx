// src/screens/Mindfulness/MindfulnessFlow.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useShallow } from "zustand/react/shallow";

// Components
import BreathingCircle from "../../components/mindfulness/BreathingCircle";
import MoodSelector from "../../components/mindfulness/MoodSelector";
import ReflectionPrompts from "../../components/mindfulness/ReflectionPrompts";
import DhikrCounter from "../../components/mindfulness/DhikrCounter";
import { getRandomKhushuQuote } from "../../constants/khushuQuotes";

// Store and Services
import { useStore } from "../../store/useStore";
import { useTheme } from "../../providers/ThemeProvider";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { AppTheme } from "../../theme";
import StorageService from "../../services/StorageService";
import PrayerTimeService from "../../services/PrayerTimeService";

// NEW: Use centralized prayer times hook
import { usePrayerTimes } from "../../providers/PrayerTimesProvider";

// Types
import { PrayerTime, PrayerName, MindfulnessSession, PrayerRecord } from "../../types";
import { RootStackParamList } from "../../types/navigation";
import AnalyticsService from "../../services/AnalyticsService";
import WidgetService from "../../services/WidgetService";
import NotificationService from "../../services/NotificationService";
import ReminderStateService from "../../services/ReminderStateService";
import TreeGrowthStateService from "../../services/TreeGrowthStateService";
import { getLocalDateKey } from "../../utils/dateHelpers";
import { StillnessLeafSvg } from "../../assets/icons/prayer";

type FlowStep =
  | "transition"
  | "breathing"
  | "niyyah"
  | "settling"
  | "praying"
  | "dhikr"
  | "reflection"
  | "complete";

const MindfulnessFlow: React.FC = () => {
  useKeepAwake(); // Keep screen on during prayer — no dimming mid-salah
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute<RouteProp<RootStackParamList, "MindfulnessFlow">>();
  
  // 🎯 NEW: Access centralized prayer times for validation
  const { 
    todayPrayerTimes, 
    nextPrayer
  } = usePrayerTimes();

  // P0-G: Access sunrise/midnight for fiqh-aware prayer deadlines
  const { todaySunrise, todayMidnight } = useStore(useShallow((state) => ({
    todaySunrise: state.todaySunrise,
    todayMidnight: state.todayMidnight,
  })));
  
  // Parse the serialized prayer object and convert the ISO string back to a Date
  const serializedPrayer = route.params.prayer;
  const prayer: PrayerTime = {
    ...serializedPrayer,
    name: serializedPrayer.name as PrayerName, // Safe: sunnah paths guarded by isSunnah flag
    time: new Date(serializedPrayer.time), // Convert ISO string back to Date object
    timestamp: serializedPrayer.timestamp,
  };
  const isSunnah = route.params.isSunnah ?? false;
  const displayName = isSunnah ? 'Sunnah / Nafl' : PrayerTimeService.getPrayerDisplayName(prayer.name);

  const { setCurrentMindfulnessSession, addPrayerRecord } = useStore(useShallow((state) => ({
    setCurrentMindfulnessSession: state.setCurrentMindfulnessSession,
    addPrayerRecord: state.addPrayerRecord,
  })));

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>("transition");
  const [breathCount, setBreathCount] = useState(1);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [sessionStartTime] = useState(new Date());
  const [isBreathingActive, setIsBreathingActive] = useState(true);
  const [hasValidated, setHasValidated] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  // Phase 6: Randomly selected khushu line for praying screen (picked once per session)
  const [khushuLine] = useState(() => getRandomKhushuQuote());

  // Animations — declared before any useEffects that reference them
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(0)).current;
  const transitionFade = useRef(new Animated.Value(0)).current;
  const stillnessPulse = useRef(new Animated.Value(0.3)).current;
  const stillnessLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopStillnessLoop = () => {
    stillnessLoopRef.current?.stop();
    stillnessLoopRef.current = null;
  };


  // Start gentle pulse during "praying" step
  useEffect(() => {
    stopStillnessLoop();

    if (currentStep === 'praying') {
      stillnessPulse.setValue(0.3);
      stillnessLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(stillnessPulse, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(stillnessPulse, {
            toValue: 0.3,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
      stillnessLoopRef.current.start();
    }
    return stopStillnessLoop;
  }, [currentStep, stillnessPulse]);

  useEffect(() => {
    return () => {
      stopStillnessLoop();
      if (settlingTimerRef.current) {
        clearTimeout(settlingTimerRef.current);
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  // Fade-in when step changes — decoupled from animation callbacks
  // so React renders the new step content BEFORE the fade-in targets native views
  // Skips: transition (own effect), breathing (entered from transition with own anim),
  //        complete (completeReflection handles it with scale spring)
  useEffect(() => {
    if (['transition', 'breathing', 'complete'].includes(currentStep)) return;

    // Praying and dhikr steps get a slower, gentler fade (no slide)
    if (currentStep === 'settling' || currentStep === 'praying' || currentStep === 'dhikr') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      return;
    }

    // niyyah, reflection — standard slide-up fade-in
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // 4a: Entry transition — "digital wudu" fade-in then auto-advance
  useEffect(() => {
    if (currentStep === 'transition') {
      // Fade in the transition text
      Animated.timing(transitionFade, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start();

      // After 4 seconds, fade out and move to breathing
      const timer = setTimeout(() => {
        Animated.timing(transitionFade, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setCurrentStep('breathing');
          fadeAnim.setValue(1);
          slideAnim.setValue(0);
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 'settling') {
      if (settlingTimerRef.current) {
        clearTimeout(settlingTimerRef.current);
        settlingTimerRef.current = null;
      }
      return;
    }

    settlingTimerRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep('praying');
      });
    }, 3200);

    return () => {
      if (settlingTimerRef.current) {
        clearTimeout(settlingTimerRef.current);
        settlingTimerRef.current = null;
      }
    };
  }, [currentStep, fadeAnim]);

  // 🎯 Prayer validation effect - run once on mount
  // Skip for sunnah/optional prayers (Taraweeh, Tahajjud, etc.) — no strict fiqh deadline
  useEffect(() => {
    if (!isSunnah) validatePrayerTiming();
    else setHasValidated(true);
  }, []); // Empty deps - only run once on mount

  // 🎯 P0-G FIX: Compute fiqh-aware deadline for this prayer.
  // Fajr → sunrise; Dhuhr/Asr/Maghrib → next prayer's start time.
  // Isha → tomorrow's Fajr (absolute), Islamic midnight (preferred cutoff).
  const getPrayerDeadline = (): Date => {
    const prayerTime = prayer.time;

    if (prayer.name === 'Fajr' && todaySunrise) {
      return todaySunrise;
    }

    // Find the next prayer after this one in today's list
    if (todayPrayerTimes.length > 0) {
      const currentIndex = todayPrayerTimes.findIndex(p => p.name === prayer.name);
      if (currentIndex >= 0 && currentIndex < todayPrayerTimes.length - 1) {
        return todayPrayerTimes[currentIndex + 1].time;
      }
    }

    // Isha (last prayer): use Islamic midnight or a generous fallback.
    // todayMidnight from the Aladhan API = midpoint between sunset & Fajr.
    // We use tomorrow's Fajr as the absolute deadline if available,
    // otherwise Islamic midnight, otherwise 4h fallback.
    if (prayer.name === 'Isha') {
      if (todayMidnight) {
        return todayMidnight;
      }
      // 4h fallback is generous enough for most latitudes
      return new Date(prayerTime.getTime() + 4 * 60 * 60 * 1000);
    }

    // Generic fallback: 2 hours after prayer time (if times not loaded)
    return new Date(prayerTime.getTime() + 2 * 60 * 60 * 1000);
  };

  // 🎯 Validate that the prayer is still within its valid window
  const validatePrayerTiming = () => {
    const now = new Date();
    const deadline = getPrayerDeadline();
    
    // Check if prayer window has passed
    if (now > deadline) {
      // Show alert and navigate back
      Alert.alert(
        "Prayer Time Passed",
        `${PrayerTimeService.getPrayerDisplayName(prayer.name)} prayer time has passed. Would you like to mark it as a makeup prayer?`,
        [
          {
            text: "Go Back",
            style: "cancel",
            onPress: () => navigation.goBack()
          },
          {
            text: "Continue as Makeup",
            onPress: () => setHasValidated(true)
          }
        ]
      );
      return;
    }

    // Mark as validated to allow rendering
    setHasValidated(true);
  };

  const getPrayerGradient = (): readonly [string, string, string] => {
    const gradients = theme.colors.prayerGradients as unknown as Record<string, readonly [string, string, string]>;
    return gradients[prayer.name] || gradients.default;
  };

  const handleBreathComplete = () => {
    if (breathCount >= 3) {
      moveToNiyyah();
    } else {
      setBreathCount(breathCount + 1);
    }
  };

  const animateToStep = (step: FlowStep) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(step); // useEffect handles fade-in after React renders new content
    });
  };

  const moveToNiyyah = () => {
    setIsBreathingActive(false);
    animateToStep("niyyah");
  };

  const skipBreathing = () => {
    moveToNiyyah();
  };

  // ── PRE-PRAYER: Save in_progress record and enter "praying" state ──
  // P0-E FIX: No longer marks prayer as "prayed" before salah begins.
  // Saves as "in_progress" so the app knows a flow is active (crash recovery),
  // but counters/dawam are NOT incremented until finishPrayer.
  const beginPrayer = () => {
    const recordId = `prayer_${Date.now()}`;
    const prayerRecord: PrayerRecord = {
      id: recordId,
      date: getLocalDateKey(),
      prayer: prayer.name,
      status: "in_progress",
      mindfulnessCompleted: true,
      reflectionAdded: false,
      mindfulnessScore: 0,
    };

    // Save in_progress record — if user closes app during prayer,
    // a background job or next open can reconcile incomplete records.
    // Skip record saving for sunnah/nafl prayers (no fard tracking)
    if (!isSunnah) {
      StorageService.savePrayerRecord(prayerRecord);
      addPrayerRecord(prayerRecord);
    }

    setSavedRecordId(recordId);

    // Transition to a short handoff that encourages putting the phone away
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep("settling");
    });
  };

  // ── POST-PRAYER: User finished praying — NOW mark as "prayed" ──
  // P0-E FIX: This is where prayer completion is canonically recorded.
  // P0-F FIX: Also closes the reminder flow so Tier 2/3 notifications stop.
  const finishPrayer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dateKey = getLocalDateKey();

    // Upgrade the in_progress record to "prayed" with full tracking
    // Skip for sunnah/nafl prayers (no fard tracking)
    if (!isSunnah && savedRecordId) {
      const prayerRecord: PrayerRecord = {
        id: savedRecordId,
        date: dateKey,
        prayer: prayer.name,
        status: "prayed",
        prayedAt: new Date(),
        mindfulnessCompleted: true,
        reflectionAdded: false,
        mindfulnessScore: 0,
      };

      StorageService.savePrayerRecordWithTracking(prayerRecord);
      addPrayerRecord(prayerRecord);
      WidgetService.reloadWidgets();

      AnalyticsService.logPrayerCompleted(prayer.name, true);
    }

    if (!isSunnah) {
      // P0-F FIX: Close the reminder flow for this prayer.
      // Mark reminder state as completed + cancel pending Tier2/Tier3/snoozes.
      const prayerId = `${prayer.name}-${dateKey}`;
      ReminderStateService.markPrayerCompleted(prayerId);
      NotificationService.cancelPrayerReminderFlow(prayerId).catch(() => {});
    }

    animateToStep("dhikr");
  };

  // ── POST-DHIKR: Transition from dhikr to reflection ──
  const finishDhikr = () => {
    if (isSunnah) {
      // Sunnah/nafl: skip reflection/garden, go straight to complete
      completeSunnahFlow();
      return;
    }
    animateToStep("reflection");
  };

  // Lightweight completion for sunnah/nafl — no record, no reflection
  const completeSunnahFlow = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep("complete");
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(completeScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }).start(() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            });
          }, 4000);
        });
      });
    });
  };

  // ── SKIP REFLECTION: Save minimal session and go to complete ──
  const skipReflection = () => {
    Keyboard.dismiss();

    const session: MindfulnessSession = {
      id: `mindfulness_${Date.now()}`,
      prayerName: prayer.name,
      startedAt: sessionStartTime,
      completedAt: new Date(),
      duration: Math.floor(
        (new Date().getTime() - sessionStartTime.getTime()) / 1000
      ),
      breathingCompleted: breathCount >= 3,
      reflectionCompleted: false,
      reflection: {
        mood: 3 as 1 | 2 | 3 | 4 | 5,
        text: '',
      },
    };

    StorageService.saveMindfulnessSession(session);
    setCurrentMindfulnessSession(session);

    // Update persistent tree growth state (skipped reflection defaults to mood 3)
    TreeGrowthStateService.recordReflection(prayer.name, 3, getLocalDateKey());


    // Animate to complete screen (same as completeReflection)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep("complete");
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(completeScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }).start(() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            });
          }, 4000);
        });
      });
    });
  };

  // ── POST-PRAYER: Save reflection + session after mood/text ──
  const completeReflection = async () => {
    if (selectedMood === 0) {
      Alert.alert(
        "How was your prayer?",
        "Please select how you felt during prayer."
      );
      return;
    }

    const session: MindfulnessSession = {
      id: `mindfulness_${Date.now()}`,
      prayerName: prayer.name,
      startedAt: sessionStartTime,
      completedAt: new Date(),
      duration: Math.floor(
        (new Date().getTime() - sessionStartTime.getTime()) / 1000
      ),
      breathingCompleted: breathCount >= 3,
      reflectionCompleted: reflectionText.length > 0 || selectedMood > 0,
      reflection: {
        mood: selectedMood as 1 | 2 | 3 | 4 | 5,
        text: reflectionText.trim(),
      },
    };

    // saveMindfulnessSession automatically updates the linked PrayerRecord
    StorageService.saveMindfulnessSession(session);
    setCurrentMindfulnessSession(session);

    // Update persistent tree growth state (additive-only, never regresses)
    TreeGrowthStateService.recordReflection(prayer.name, selectedMood, getLocalDateKey());

    // Save reflection text cross-reference for Reflection Garden journal
    if (reflectionText.trim().length > 0) {
      const dateStr = getLocalDateKey();
      StorageService.saveReflectionText(dateStr, prayer.name, reflectionText.trim());
    }

    // Dismiss keyboard before transitioning (prevents iOS KeyboardAvoidingView interference)
    Keyboard.dismiss();

    // Animate to complete screen
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep("complete");
      // Wait for React to re-render and mount the complete step view
      // before starting the entrance animation. Without this, the native
      // driver has no target view and the animation is silently dropped.
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(completeScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          stopStillnessLoop();
          stillnessLoopRef.current = Animated.loop(
            Animated.sequence([
              Animated.timing(stillnessPulse, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(stillnessPulse, {
                toValue: 0.3,
                duration: 2000,
                useNativeDriver: true,
              }),
            ])
          );
          stillnessLoopRef.current.start();

          if (completionTimerRef.current) {
            clearTimeout(completionTimerRef.current);
          }
          completionTimerRef.current = setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }).start(() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            });
          }, 8000);
        });
      });
    });
  };

  const renderBreathingStep = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.stepTitle}>Prepare Your Heart</Text>
      <Text style={styles.instruction}>
        Take 3 deep breaths to center yourself before prayer
      </Text>

      {/* 🎯 NEW: Show prayer timing context */}
      {nextPrayer?.name === prayer.name && (
        <View style={styles.timingInfoContainer}>
          <Text style={styles.timingText}>
            This is your next prayer
          </Text>
        </View>
      )}

      <View style={styles.breathingContainer}>
        <BreathingCircle
          isActive={isBreathingActive}
          breathCount={breathCount}
          onBreathComplete={handleBreathComplete}
        />
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={skipBreathing}>
        <Text style={styles.skipText}>Skip breathing exercise →</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderNiyyahStep = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.niyyahContainer}>
        <Text style={styles.niyyahText}>
          You are about to stand before the Lord of all the worlds
        </Text>
        <Text style={styles.stepTitle}>Set Your Intention</Text>
        <Text style={styles.niyyahText}>
          I intend to pray{" "}
          {displayName}
          {"\n"}for the sake of Allah
        </Text>

        <Text style={styles.niyyahWhisper}>
          Prepare your heart for conversing with your Lord
        </Text>
        <Text style={styles.niyyahWhisper}>
          Leave every worry at the door. This moment is between you and Him alone.
        </Text>
        <Text style={styles.niyyahWhisper}>
          Pray with the prayer of one who may not get another chance
        </Text>

        <TouchableOpacity
          style={styles.beginPrayerButton}
          onPress={beginPrayer}
          activeOpacity={0.8}
        >
          <Text style={styles.beginPrayerText}>Step Into Prayer</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderSettlingStep = () => (
    <Animated.View
      style={[
        styles.prayingContainer,
        { opacity: fadeAnim },
      ]}
    >
      <Text style={styles.prayingLabel}>{displayName}</Text>
      <Text style={styles.prayingText}>Put your phone away now</Text>
      <Text style={styles.settlingText}>
        Let the next few minutes belong only to Allah.
      </Text>
      <Text style={styles.settlingHint}>
        This screen will fade on its own.
      </Text>
    </Animated.View>
  );

  const renderPrayingStep = () => (
    <Animated.View
      style={[
        styles.prayingContainer,
        { opacity: fadeAnim },
      ]}
    >
      <Text style={styles.prayingLabel}>
        {displayName}
      </Text>
      <Text style={styles.prayingText}>Your phone can wait</Text>
      <Animated.Text style={[styles.prayingSubtext, { opacity: stillnessPulse }]}>
        {khushuLine}
      </Animated.Text>
      <Text style={styles.prayingHint}>
        Return only after salah is complete.
      </Text>

      <TouchableOpacity
        style={styles.returnFromPrayerButton}
        onPress={finishPrayer}
      >
        <Text style={styles.returnFromPrayerText}>I'm back from prayer</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderReflectionStep = () => (
    <Animated.View
      style={[
        styles.stepContent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>Leave a Quiet Note</Text>

        <ReflectionPrompts
          prayerName={prayer.name}
          reflectionText={reflectionText}
          onReflectionChange={setReflectionText}
        />

        <View style={styles.moodSection}>
          <MoodSelector
            selectedMood={selectedMood}
            onMoodSelect={setSelectedMood}
          />
        </View>

        <View style={styles.reflectionButtonRow}>
          <TouchableOpacity
            style={styles.skipReflectionButton}
            onPress={skipReflection}
            activeOpacity={0.7}
          >
            <Text style={styles.skipReflectionText}>Not now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              selectedMood === 0 && styles.completeButtonDisabled,
            ]}
            onPress={completeReflection}
            disabled={selectedMood === 0}
            activeOpacity={0.8}
          >
            <Text style={[styles.completeButtonText, { color: theme.colors.text.primary }]}>
              Save reflection
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const renderTransitionStep = () => (
    <Animated.View
      style={[
        styles.transitionContainer,
        { opacity: transitionFade },
      ]}
    >
      <Text style={styles.transitionText}>Leave the world behind for a moment.</Text>
    </Animated.View>
  );

  const renderCompleteStep = () => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => navigation.goBack()}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.completeContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: completeScale }],
          },
        ]}
      >
        <Animated.View style={[styles.completeGlyph, { opacity: stillnessPulse }]}>
          <StillnessLeafSvg
            size={88}
            color={theme.colors.mindfulness.accent}
            secondaryColor={theme.colors.mindfulness.textPrimary}
          />
        </Animated.View>
        <Text style={styles.completeTitle}>Prayer completed</Text>
        <Text style={styles.completeText}>
          You stepped away, prayed {displayName}, and returned with intention.
          {"\n\n"}
          May Allah accept it and place calm in what comes next.
        </Text>
        <Text style={styles.tapToDismiss}>Tap anywhere to return</Text>
      </Animated.View>
    </TouchableOpacity>
  );

  // Don't render until validation is complete
  if (!hasValidated) {
    return null;
  }

  const showGradient = !['reflection', 'dhikr'].includes(currentStep);
  const showHeader = !['settling', 'praying', 'dhikr'].includes(currentStep);
  const showDots = !['transition', 'settling', 'praying', 'dhikr', 'complete'].includes(currentStep);

  // Progress: breathing=0, niyyah=1, reflection=2 (3 dots)
  const stepIndexMap: Record<string, number> = { breathing: 0, niyyah: 1, reflection: 2 };
  const stepIndex = stepIndexMap[currentStep] ?? -1;

  return (
    <View style={[
      styles.container,
      !showGradient && { backgroundColor: theme.colors.background.primary },
      (currentStep === 'praying' || currentStep === 'dhikr') && { backgroundColor: theme.colors.background.primary },
    ]}>
      {showGradient && currentStep !== 'praying' && currentStep !== 'dhikr' && (
        <LinearGradient colors={getPrayerGradient()} style={StyleSheet.absoluteFill} />
      )}
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          {/* Header — hidden during "praying" minimal screen */}
          {showHeader && (
            <View style={styles.header}>
              <Text style={styles.prayerName}>
                {displayName} Prayer
              </Text>
              {currentStep !== "complete" && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Progress dots — 3 visible steps: Breathe · Intend · Reflect */}
          {showDots && (
            <View style={styles.progressContainer}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i <= stepIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {currentStep === "transition" && renderTransitionStep()}
            {currentStep === "breathing" && renderBreathingStep()}
            {currentStep === "niyyah" && renderNiyyahStep()}
            {currentStep === "settling" && renderSettlingStep()}
            {currentStep === "praying" && renderPrayingStep()}
            {currentStep === "dhikr" && (
              <DhikrCounter onComplete={finishDhikr} onSkip={finishDhikr} />
            )}
            {currentStep === "reflection" && renderReflectionStep()}
            {currentStep === "complete" && renderCompleteStep()}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  prayerName: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.mindfulness.textPrimary,
  },
  closeButton: {
    width: theme.spacing['4xl'],
    height: theme.spacing['4xl'],
    borderRadius: theme.spacing.xl,
    backgroundColor: theme.colors.mindfulness.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textPrimary,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing['2xl'],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.mindfulness.dotInactive,
  },
  progressDotActive: {
    backgroundColor: theme.colors.mindfulness.dotActive,
    width: theme.spacing['2xl'],
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  stepContent: {
    flex: 1,
    paddingTop: theme.spacing['4xl'],
  },
  scrollContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  stepTitle: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.mindfulness.textPrimary,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
  instruction: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing['4xl'],
    lineHeight: 22,
  },
  timingInfoContainer: {
    backgroundColor: theme.colors.mindfulness.timingInfoBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing['2xl'],
    alignSelf: "center",
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.timingInfoBorder,
  },
  timingText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.mindfulness.accent,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing['4xl'],
  },
  skipButton: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['2xl'],
    alignSelf: "center",
  },
  skipText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textMuted,
  },
  moodSection: {
    marginTop: theme.spacing['3xl'],
    marginBottom: theme.spacing['3xl'],
  },
  reflectionButtonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  skipReflectionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl - 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.buttonBorder,
  },
  skipReflectionText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  completeButton: {
    flex: 2,
    backgroundColor: theme.colors.mindfulness.buttonBg,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl - 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.buttonBorder,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mindfulness.textPrimary,
  },
  completeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing['4xl'],
  },
  completeGlyph: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing['2xl'],
  },
  completeTitle: {
    fontSize: theme.typography.fontSize['5xl'] + 4,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.mindfulness.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  completeText: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  tapToDismiss: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textHint,
    textAlign: "center",
    marginTop: theme.spacing['3xl'],
  },
  niyyahContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  niyyahWhisper: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
    opacity: 0.85,
  },
  beginPrayerButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing['4xl'] + 8,
    alignItems: "center",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 220,
  },
  beginPrayerText: {
    fontSize: theme.typography.fontSize.xl + 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mindfulness.textPrimary,
    letterSpacing: 0.5,
  },
  niyyahText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: '300',
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: theme.spacing['4xl'] + 8,
    fontStyle: "italic",
  },
  prayingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing['4xl'],
  },
  prayingLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.secondary,
    letterSpacing: 1,
    marginBottom: theme.spacing['3xl'],
  },
  prayingText: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  prayingSubtext: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: theme.spacing['4xl'] + 20,
  },
  settlingText: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: theme.spacing.lg,
  },
  settlingHint: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: "center",
  },
  prayingHint: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: "center",
    marginBottom: theme.spacing['3xl'],
  },
  returnFromPrayerButton: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    backgroundColor: theme.colors.background.secondary,
  },
  returnFromPrayerText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  transitionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing['4xl'],
  },
  transitionText: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: '300',
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.mindfulness.textPrimary,
    textAlign: "center",
    fontStyle: "italic",
    letterSpacing: 1,
  },
});

export default MindfulnessFlow;

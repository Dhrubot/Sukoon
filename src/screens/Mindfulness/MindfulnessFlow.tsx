// src/screens/Mindfulness/MindfulnessFlow.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

// Components
import BreathingCircle from "../../components/mindfulness/BreathingCircle";
import MoodSelector from "../../components/mindfulness/MoodSelector";
import ReflectionPrompts from "../../components/mindfulness/ReflectionPrompts";

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
import { PrayerTime, MindfulnessSession, PrayerRecord } from "../../types";
import { RootStackParamList } from "../../types/navigation";
import AchievementService from "../../services/AchievementService";
import AnalyticsService from "../../services/AnalyticsService";
import WidgetService from "../../services/WidgetService";

const { width, height } = Dimensions.get("window");

type FlowStep = "transition" | "breathing" | "niyyah" | "praying" | "reflection" | "complete";

const MindfulnessFlow: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute<RouteProp<RootStackParamList, "MindfulnessFlow">>();
  
  // 🎯 NEW: Access centralized prayer times for validation
  const { 
    todayPrayerTimes, 
    nextPrayer, 
    hasValidLocation 
  } = usePrayerTimes();
  
  // Parse the serialized prayer object and convert the ISO string back to a Date
  const serializedPrayer = route.params.prayer;
  const prayer = {
    ...serializedPrayer,
    time: new Date(serializedPrayer.time) // Convert ISO string back to Date object
  };

  const { setCurrentMindfulnessSession, addPrayerRecord } = useStore();

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>("transition");
  const [breathCount, setBreathCount] = useState(1);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [sessionStartTime] = useState(new Date());
  const [isBreathingActive, setIsBreathingActive] = useState(true);
  const [hasValidated, setHasValidated] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [prayerStartTime, setPrayerStartTime] = useState<Date | null>(null);

  // Animations — declared before any useEffects that reference them
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(0)).current;
  const transitionFade = useRef(new Animated.Value(0)).current;
  const stillnessPulse = useRef(new Animated.Value(0.3)).current;

  // Analytics: log mindfulness started
  useEffect(() => {
    AnalyticsService.logEvent('mindfulness_started', { prayer: prayer.name });
  }, []);

  // Start gentle pulse during "praying" step
  useEffect(() => {
    if (currentStep === 'praying') {
      stillnessPulse.setValue(0.3);
      Animated.loop(
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
      ).start();
    }
  }, [currentStep]);

  // Fade-in when step changes — decoupled from animation callbacks
  // so React renders the new step content BEFORE the fade-in targets native views
  // Skips: transition (own effect), breathing (entered from transition with own anim),
  //        praying (beginPrayer handles it), complete (completeReflection handles it)
  useEffect(() => {
    if (['transition', 'breathing', 'praying', 'complete'].includes(currentStep)) return;

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

  // 🎯 Prayer validation effect - run once on mount
  useEffect(() => {
    validatePrayerTiming();
  }, []); // Empty deps - only run once on mount

  // 🎯 Validate that the prayer is still current/upcoming
  const validatePrayerTiming = () => {
    const now = new Date();
    const prayerTime = prayer.time;
    
    // Allow prayers up to 2 hours after their time
    const twoHoursAfterPrayer = new Date(prayerTime.getTime() + 2 * 60 * 60 * 1000);
    
    // Check if prayer time has passed by more than 2 hours
    if (now > twoHoursAfterPrayer) {
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
    const gradients = theme.colors.prayerGradients;
    return (gradients as any)[prayer.name] || gradients.default;
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

  // ── PRE-PRAYER: Save prayer record and enter "praying" state ──
  const beginPrayer = () => {
    const recordId = `prayer_${Date.now()}`;
    const prayerRecord: PrayerRecord = {
      id: recordId,
      date: new Date().toISOString().split("T")[0],
      prayer: prayer.name,
      status: "prayed",
      prayedAt: new Date(),
      mindfulnessCompleted: true,
      reflectionAdded: false,
      mindfulnessScore: 0,
    };

    // Save immediately — if user closes app during prayer, it's still recorded
    StorageService.savePrayerRecordWithTracking(prayerRecord);
    addPrayerRecord(prayerRecord);
    WidgetService.reloadWidgets();

    AnalyticsService.logPrayerCompleted(prayer.name, true);

    setSavedRecordId(recordId);
    setPrayerStartTime(new Date());

    // Transition to minimal "praying" screen
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep("praying");
      // Fade-in for praying step (handled here since useEffect skips 'praying')
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });
  };

  // ── POST-PRAYER: User finished praying, transition to reflection ──
  const finishPrayer = () => {
    animateToStep("reflection");
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

    // Save reflection text cross-reference for Reflection Garden journal
    if (reflectionText.trim().length > 0) {
      const dateStr = new Date().toISOString().split('T')[0];
      StorageService.saveReflectionText(dateStr, prayer.name, reflectionText.trim());
    }

    AnalyticsService.logEvent('mindfulness_completed', {
      prayer: prayer.name,
      duration: session.duration,
      mood: selectedMood,
      breathing_completed: session.breathingCompleted,
      reflection_added: session.reflectionCompleted,
    });

    await AchievementService.checkAchievements();

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

        Animated.loop(
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
        ).start();

        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        }, 8000);
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
            ✨ Perfect timing! This is your next prayer
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
        <Text style={styles.niyyahEmoji}>🤲</Text>
        <Text style={styles.stepTitle}>Set Your Intention</Text>
        <Text style={styles.niyyahText}>
          I intend to pray{" "}
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
          {"\n"}for the sake of Allah
        </Text>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={beginPrayer}
        >
          <Text style={styles.completeButtonText}>Begin Prayer 🤲</Text>
        </TouchableOpacity>
      </View>
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
        {PrayerTimeService.getPrayerDisplayName(prayer.name)}
      </Text>
      <Animated.Text style={[styles.prayingEmoji, { opacity: stillnessPulse }]}>
        🕌
      </Animated.Text>
      <Text style={styles.prayingText}>You are in prayer</Text>
      <Text style={styles.prayingSubtext}>Take your time. Allah is listening.</Text>

      <TouchableOpacity
        style={styles.finishPrayerButton}
        onPress={finishPrayer}
      >
        <Text style={styles.finishPrayerText}>I've Finished My Prayer ✓</Text>
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
        <Text style={styles.stepTitle}>How Was Your Prayer?</Text>

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

        <TouchableOpacity
          style={[
            styles.completeButton,
            selectedMood === 0 && styles.completeButtonDisabled,
          ]}
          onPress={completeReflection}
          disabled={selectedMood === 0}
        >
          <Text style={styles.completeButtonText}>
            Complete ✨
          </Text>
        </TouchableOpacity>
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
      <Text style={styles.transitionText}>Leave the world behind...</Text>
    </Animated.View>
  );

  const renderCompleteStep = () => (
    <Animated.View
      style={[
        styles.completeContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: completeScale }],
        },
      ]}
    >
      <Animated.Text style={[styles.completeEmoji, { opacity: stillnessPulse }]}>✨</Animated.Text>
      <Text style={styles.completeTitle}>Ma sha Allah!</Text>
      <Text style={styles.completeText}>
        You've prepared for{" "}
        {PrayerTimeService.getPrayerDisplayName(prayer.name)} prayer.
        {"\n\n"}
        May your prayer be accepted and bring you peace.
      </Text>
      {reflectionText.length > 0 && (
        <Text style={styles.gardenHint}>A new bloom appeared in your garden 🌱</Text>
      )}
    </Animated.View>
  );

  // Don't render until validation is complete
  if (!hasValidated) {
    return null;
  }

  const showGradient = currentStep !== 'reflection';
  const showHeader = currentStep !== 'praying';
  const showDots = !['transition', 'praying', 'complete'].includes(currentStep);

  // Progress: breathing=1, niyyah=2, reflection=3 (4 dots total)
  const stepIndexMap: Record<string, number> = { breathing: 0, niyyah: 1, reflection: 2 };
  const stepIndex = stepIndexMap[currentStep] ?? -1;

  return (
    <View style={[
      styles.container,
      !showGradient && { backgroundColor: theme.colors.background.primary },
      currentStep === 'praying' && { backgroundColor: theme.colors.background.primary },
    ]}>
      {showGradient && currentStep !== 'praying' && (
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
                {PrayerTimeService.getPrayerDisplayName(prayer.name)} Prayer
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
            {currentStep === "praying" && renderPrayingStep()}
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  prayerName: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.mindfulness.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.mindfulness.inputBg,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 20,
    color: theme.colors.mindfulness.textPrimary,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.mindfulness.dotInactive,
  },
  progressDotActive: {
    backgroundColor: theme.colors.mindfulness.dotActive,
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    flex: 1,
    paddingTop: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.mindfulness.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  timingInfoContainer: {
    backgroundColor: theme.colors.mindfulness.timingInfoBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.timingInfoBorder,
  },
  timingText: {
    fontSize: 14,
    color: theme.colors.mindfulness.accent,
    textAlign: "center",
    fontWeight: "500",
  },
  breathingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: "center",
  },
  skipText: {
    fontSize: 16,
    color: theme.colors.mindfulness.textMuted,
  },
  moodSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  completeButton: {
    backgroundColor: theme.colors.mindfulness.buttonBg,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.buttonBorder,
    marginTop: 20,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.mindfulness.textPrimary,
  },
  completeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.mindfulness.textPrimary,
    marginBottom: 16,
  },
  completeText: {
    fontSize: 18,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    lineHeight: 26,
  },
  gardenHint: {
    fontSize: 14,
    color: theme.colors.mindfulness.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 20,
  },
  niyyahContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  niyyahEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  niyyahText: {
    fontSize: 20,
    fontWeight: "300",
    color: theme.colors.mindfulness.textSecondary,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 48,
    fontStyle: "italic",
  },
  prayingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  prayingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text.secondary,
    letterSpacing: 1,
    marginBottom: 32,
  },
  prayingEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  prayingText: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  prayingSubtext: {
    fontSize: 16,
    fontWeight: "300",
    color: theme.colors.text.secondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 60,
  },
  finishPrayerButton: {
    backgroundColor: theme.colors.mindfulness.buttonBg,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.mindfulness.buttonBorder,
  },
  finishPrayerText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.mindfulness.textPrimary,
  },
  transitionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  transitionText: {
    fontSize: 28,
    fontWeight: "300",
    color: theme.colors.mindfulness.textPrimary,
    textAlign: "center",
    fontStyle: "italic",
    letterSpacing: 1,
  },
});

export default MindfulnessFlow;
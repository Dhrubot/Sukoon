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

type FlowStep = "transition" | "breathing" | "reflection" | "complete";

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

  // Analytics: log mindfulness started
  useEffect(() => {
    AnalyticsService.logEvent('mindfulness_started', { prayer: prayer.name });
  }, []);

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

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(0)).current;
  const transitionFade = useRef(new Animated.Value(0)).current;
  const stillnessPulse = useRef(new Animated.Value(0.3)).current;

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
      moveToReflection();
    } else {
      setBreathCount(breathCount + 1);
    }
  };

  const moveToReflection = () => {
    setIsBreathingActive(false);
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
      setCurrentStep("reflection");
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
    });
  };

  const skipBreathing = () => {
    moveToReflection();
  };

  const completeMindfulness = async () => {
    if (selectedMood === 0) {
      Alert.alert(
        "Please select your mood",
        "How was your focus during prayer?"
      );
      return;
    }

    // 🎯 NEW: Enhanced session tracking with prayer validation context
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

    // Save session
    StorageService.saveMindfulnessSession(session);
    setCurrentMindfulnessSession(session);

    // Save reflection text cross-reference for Reflection Garden journal
    if (reflectionText.trim().length > 0) {
      const dateStr = new Date().toISOString().split('T')[0];
      StorageService.saveReflectionText(dateStr, prayer.name, reflectionText.trim());
    }

    // 🎯 NEW: Enhanced prayer record with validation context
    const prayerRecord: PrayerRecord = {
      id: `prayer_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      prayer: prayer.name,
      status: "prayed",
      prayedAt: new Date(),
      mindfulnessCompleted: true,
      reflectionAdded: reflectionText.length > 0,
      mindfulnessScore: selectedMood * 20, // Convert 1-5 to 20-100
    };

    // 🎯 NEW: Add metadata if prayer was late/makeup
    const now = new Date();
    const prayerTime = prayer.time;
    const minutesLate = Math.floor((now.getTime() - prayerTime.getTime()) / (1000 * 60));
    
    if (minutesLate > 30) {
      // Prayer was significantly late - could be makeup or delayed
      console.log(`Prayer ${prayer.name} was completed ${minutesLate} minutes after time`);
    }

    // Save prayer record
    StorageService.savePrayerRecordWithTracking(prayerRecord);
    addPrayerRecord(prayerRecord);

    // Refresh widget to show updated prayer status
    WidgetService.reloadWidgets();

    // Analytics
    AnalyticsService.logPrayerCompleted(prayer.name, true);
    AnalyticsService.logEvent('mindfulness_completed', {
      prayer: prayer.name,
      duration: session.duration,
      mood: selectedMood,
      breathing_completed: session.breathingCompleted,
      reflection_added: session.reflectionCompleted,
    });

    // Check for unlocked achievements (unlock silently in background)
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
        // Haptic success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 4b: Extended stillness — pulsing light, then gentle fade out
        // Start pulsing glow animation
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

        // Navigate back after 8 seconds of stillness
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
        <Text style={styles.stepTitle}>Reflect & Set Intention</Text>

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
          onPress={completeMindfulness}
          disabled={selectedMood === 0}
        >
          <Text style={styles.completeButtonText}>
            Begin Prayer with Intention 🤲
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
        You've prepared mindfully for{" "}
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

  return (
    <View style={[styles.container, currentStep === 'reflection' && { backgroundColor: theme.colors.background.primary }]}>
      {currentStep !== 'reflection' && (
        <LinearGradient colors={getPrayerGradient()} style={StyleSheet.absoluteFill} />
      )}
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
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

          {/* Progress dots — hidden during transition and complete */}
          {currentStep !== 'transition' && currentStep !== 'complete' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View
                style={[
                  styles.progressDot,
                  currentStep !== "breathing" && styles.progressDotActive,
                ]}
              />
              <View
                style={[
                  styles.progressDot,
                  currentStep === "reflection" && styles.progressDotActive,
                ]}
              />
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {currentStep === "transition" && renderTransitionStep()}
            {currentStep === "breathing" && renderBreathingStep()}
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
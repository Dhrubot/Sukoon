import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ColorValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Store and Services
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import PrayerTimeService from '../../services/PrayerTimeService';

// Types
import { PrayerTime, MindfulnessSession, PrayerRecord } from '../../types';
import { RootStackParamList } from '../../types/navigation';

const { width, height } = Dimensions.get('window');

type FlowStep = 'breathing' | 'reflection' | 'complete';

const MindfulnessFlow: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MindfulnessFlow'>>();
  const prayer = route.params.prayer;

  const { setCurrentMindfulnessSession, addPrayerRecord } = useStore();

  const [currentStep, setCurrentStep] = useState<FlowStep>('breathing');
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCount, setBreathCount] = useState(0);
  const [reflectionText, setReflectionText] = useState('');
  const [selectedMood, setSelectedMood] = useState<number>(3);
  const [sessionStartTime] = useState(new Date());

  // Animations
  const circleScale = useRef(new Animated.Value(0.8)).current;
  const circleOpacity = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Breathing animation cycle
  useEffect(() => {
    if (currentStep !== 'breathing') return;

    const breathingCycle = () => {
      // Inhale (4 seconds)
      Animated.parallel([
        Animated.timing(circleScale, {
          toValue: 1.2,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setBreathPhase('hold');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Hold (4 seconds)
        setTimeout(() => {
          // Exhale (4 seconds)
          Animated.parallel([
            Animated.timing(circleScale, {
              toValue: 0.8,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(circleOpacity, {
              toValue: 0.8,
              duration: 4000,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setBreathPhase('inhale');
            setBreathCount(prev => prev + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          });
          setBreathPhase('exhale');
        }, 4000);
      });
    };

    breathingCycle();
    const interval = setInterval(breathingCycle, 12000); // Full cycle = 12 seconds

    return () => clearInterval(interval);
  }, [currentStep, circleScale, circleOpacity]);

  // Auto-advance after 3 breath cycles
  useEffect(() => {
    if (breathCount >= 3 && currentStep === 'breathing') {
      moveToReflection();
    }
  }, [breathCount]);

  const moveToReflection = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep('reflection');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const completeMindfulness = async () => {
    const session: MindfulnessSession = {
      id: `mindfulness_${Date.now()}`,
      prayerName: prayer.name,
      startedAt: sessionStartTime,
      completedAt: new Date(),
      duration: Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000),
      breathingCompleted: true,
      reflectionCompleted: reflectionText.length > 0,
      reflection: {
        mood: selectedMood as 1 | 2 | 3 | 4 | 5,
        text: reflectionText,
      },
    };

    // Save session
    StorageService.saveMindfulnessSession(session);
    setCurrentMindfulnessSession(session);

    // Create prayer record
    const prayerRecord: PrayerRecord = {
      id: `prayer_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      prayer: prayer.name,
      status: 'prayed',
      prayedAt: new Date(),
      mindfulnessCompleted: true,
      reflectionAdded: reflectionText.length > 0,
      focusScore: selectedMood * 20,
    };

    StorageService.savePrayerRecord(prayerRecord);
    addPrayerRecord(prayerRecord);

    // Check achievements
    checkAchievements();

    setCurrentStep('complete');
    
    // Haptic feedback for completion
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Navigate back after delay
    setTimeout(() => {
      navigation.goBack();
    }, 2000);
  };

  const checkAchievements = () => {
    // Check for first prayer achievement
    const achievements = StorageService.getAchievements();
    const firstPrayer = achievements.find(a => a.id === 'first_prayer');
    if (firstPrayer && !firstPrayer.unlockedAt) {
      StorageService.unlockAchievement('first_prayer');
    }
  };

  const skipBreathing = () => {
    moveToReflection();
  };

  const getBreathingText = (): string => {
    switch (breathPhase) {
      case 'inhale':
        return 'Breathe in slowly...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out gently...';
    }
  };

  const getPrayerGradient = (): readonly [ColorValue, ColorValue] => {
    const gradients: Record<string, readonly [ColorValue, ColorValue] > = {
      fajr: ['#1a237e', '#3949ab'],
      dhuhr: ['#f57c00', '#ffb74d'],
      asr: ['#ff6f00', '#ffca28'],
      maghrib: ['#c2185b', '#f06292'],
      isha: ['#512da8', '#7e57c2'],
    };
    return gradients[prayer.name] || ['#1B5E3F', '#2E7D32'];
  };

  const reflectionPrompts = [
    "What are you grateful for in this moment?",
    "What intentions do you bring to this prayer?",
    "How do you hope to connect with Allah today?",
    "What burdens would you like to leave behind?",
    "What blessings have you noticed today?",
  ];

  const currentPrompt = reflectionPrompts[
    new Date().getDate() % reflectionPrompts.length
  ];

  return (
    <LinearGradient colors={getPrayerGradient()} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.prayerName}>
              {PrayerTimeService.getPrayerDisplayName(prayer.name)} Prayer
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Progress dots */}
          <View style={styles.progressContainer}>
            <View style={[
              styles.progressDot,
              styles.progressDotActive
            ]} />
            <View style={[
              styles.progressDot,
              currentStep !== 'breathing' && styles.progressDotActive
            ]} />
            <View style={[
              styles.progressDot,
              currentStep === 'complete' && styles.progressDotActive
            ]} />
          </View>

          {/* Content */}
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {currentStep === 'breathing' && (
              <>
                <Text style={styles.stepTitle}>Prepare Your Mind</Text>
                <Text style={styles.instruction}>
                  Take a moment to center yourself before prayer
                </Text>

                <View style={styles.breathingContainer}>
                  <Animated.View
                    style={[
                      styles.breathingCircle,
                      {
                        transform: [{ scale: circleScale }],
                        opacity: circleOpacity,
                      },
                    ]}
                  >
                    <Text style={styles.breathCount}>{breathCount + 1}</Text>
                  </Animated.View>
                  <Text style={styles.breathingText}>{getBreathingText()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={skipBreathing}
                >
                  <Text style={styles.skipText}>Skip to reflection →</Text>
                </TouchableOpacity>
              </>
            )}

            {currentStep === 'reflection' && (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.reflectionContent}
              >
                <Text style={styles.stepTitle}>Reflection</Text>
                <Text style={styles.reflectionPrompt}>{currentPrompt}</Text>

                <TextInput
                  style={styles.reflectionInput}
                  placeholder="Type your thoughts... (optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={reflectionText}
                  onChangeText={setReflectionText}
                  multiline
                  maxLength={500}
                />

                <Text style={styles.moodLabel}>How focused do you feel?</Text>
                <View style={styles.moodContainer}>
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      onPress={() => setSelectedMood(mood)}
                      style={[
                        styles.moodButton,
                        selectedMood === mood && styles.moodButtonActive,
                      ]}
                    >
                      <Text style={styles.moodEmoji}>
                        {mood === 1 ? '😔' : mood === 2 ? '😐' : mood === 3 ? '😊' : mood === 4 ? '😇' : '🤲'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={completeMindfulness}
                >
                  <Text style={styles.completeButtonText}>Complete Prayer</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {currentStep === 'complete' && (
              <View style={styles.completeContainer}>
                <Text style={styles.completeEmoji}>🎉</Text>
                <Text style={styles.completeTitle}>Ma sha Allah!</Text>
                <Text style={styles.completeText}>
                  You've completed your {PrayerTimeService.getPrayerDisplayName(prayer.name)} prayer mindfully
                </Text>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  prayerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  breathCount: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  breathingText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 32,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  reflectionContent: {
    paddingBottom: 32,
  },
  reflectionPrompt: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  reflectionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  moodButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  moodButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#FFFFFF',
  },
  moodEmoji: {
    fontSize: 28,
  },
  completeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  completeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 26,
  },
});

export default MindfulnessFlow;
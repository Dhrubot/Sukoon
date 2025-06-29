import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Components
import BreathingCircle from '../../components/mindfulness/BreathingCircle';
import MoodSelector from '../../components/mindfulness/MoodSelector';
import ReflectionPrompts from '../../components/mindfulness/ReflectionPrompts';

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

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep>('breathing');
  const [breathCount, setBreathCount] = useState(1);
  const [reflectionText, setReflectionText] = useState('');
  const [selectedMood, setSelectedMood] = useState<number>(0);
  const [sessionStartTime] = useState(new Date());
  const [isBreathingActive, setIsBreathingActive] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(0)).current;

  const getPrayerGradient = (): [string, string] => {
    const gradients: Record<string, [string, string]> = {
      fajr: ['#1a237e', '#3949ab'],
      dhuhr: ['#fff59d', '#ffeb3b'],
      asr: ['#ffcc80', '#ff9800'],
      maghrib: ['#e91e63', '#880e4f'],
      isha: ['#1a237e', '#000051'],
    };
    return gradients[prayer.name] || ['#1B5E3F', '#0d4f35'];
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
      setCurrentStep('reflection');
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
    Alert.alert(
      'Skip Breathing Exercise?',
      'The breathing exercise helps you focus better during prayer.',
      [
        { text: 'Continue Breathing', style: 'cancel' },
        { text: 'Skip', onPress: moveToReflection },
      ]
    );
  };

  const completeMindfulness = async () => {
    if (selectedMood === 0) {
      Alert.alert('Please select your mood', 'How was your focus during prayer?');
      return;
    }

    const session: MindfulnessSession = {
      id: `mindfulness_${Date.now()}`,
      prayerName: prayer.name,
      startedAt: sessionStartTime,
      completedAt: new Date(),
      duration: Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000),
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

    // Create prayer record
    const prayerRecord: PrayerRecord = {
      id: `prayer_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      prayer: prayer.name,
      status: 'prayed',
      prayedAt: new Date(),
      mindfulnessCompleted: true,
      reflectionAdded: reflectionText.length > 0,
      mindfulnessScore: selectedMood * 20, // Convert 1-5 to 20-100
    };

    // Save prayer record
    StorageService.savePrayerRecord(prayerRecord);
    addPrayerRecord(prayerRecord);

    // Animate to complete screen
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep('complete');
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
        
        // Navigate back after delay
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
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
      <Text style={styles.completeEmoji}>✨</Text>
      <Text style={styles.completeTitle}>Ma sha Allah!</Text>
      <Text style={styles.completeText}>
        You've prepared mindfully for {PrayerTimeService.getPrayerDisplayName(prayer.name)} prayer.
        {'\n\n'}
        May your prayer be accepted and bring you peace.
      </Text>
    </Animated.View>
  );

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
            {currentStep !== 'complete' && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress dots */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View
              style={[
                styles.progressDot,
                currentStep !== 'breathing' && styles.progressDotActive,
              ]}
            />
            <View
              style={[
                styles.progressDot,
                currentStep === 'complete' && styles.progressDotActive,
              ]}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {currentStep === 'breathing' && renderBreathingStep()}
            {currentStep === 'reflection' && renderReflectionStep()}
            {currentStep === 'complete' && renderCompleteStep()}
          </View>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
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
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  moodSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  completeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
  },
  completeButtonDisabled: {
    opacity: 0.5,
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
    paddingHorizontal: 40,
  },
  completeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  completeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },
});

export default MindfulnessFlow;
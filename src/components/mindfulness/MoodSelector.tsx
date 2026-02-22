import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface MoodSelectorProps {
  selectedMood: number;
  onMoodSelect: (mood: number) => void;
}

const moods = [
  { value: 1, emoji: '😔', label: 'Distracted' },
  { value: 2, emoji: '😐', label: 'Neutral' },
  { value: 3, emoji: '😊', label: 'Focused' },
  { value: 4, emoji: '😇', label: 'Peaceful' },
  { value: 5, emoji: '🤲', label: 'Connected' },
];

const MoodSelector: React.FC<MoodSelectorProps> = ({
  selectedMood,
  onMoodSelect,
}) => {
  const styles = useThemedStyles(createStyles);
  const scaleAnims = moods.map(() => React.useRef(new Animated.Value(1)).current);

  const handleMoodPress = (mood: number, index: number) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate the selected mood
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1.1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onMoodSelect(mood);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How was your focus during prayer?</Text>
      
      <View style={styles.moodContainer}>
        {moods.map((mood, index) => (
          <Animated.View
            key={mood.value}
            style={[
              styles.moodWrapper,
              {
                transform: [{ scale: scaleAnims[index] }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.moodButton,
                selectedMood === mood.value && styles.moodButtonActive,
              ]}
              onPress={() => handleMoodPress(mood.value, index)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.moodLabel,
                selectedMood === mood.value && styles.moodLabelActive,
              ]}
            >
              {mood.label}
            </Text>
          </Animated.View>
        ))}
      </View>

      {selectedMood > 0 && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>
            {selectedMood === 1 && "It's okay, tomorrow is a new opportunity"}
            {selectedMood === 2 && "Every prayer is a step forward"}
            {selectedMood === 3 && "Ma sha Allah! Keep building focus"}
            {selectedMood === 4 && "Beautiful! Your khushoo is growing"}
            {selectedMood === 5 && "Alhamdulillah! May Allah accept your prayer"}
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.mindfulness.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing['2xl'],
  },
  moodWrapper: {
    alignItems: 'center',
  },
  moodButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.mindfulness.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.mindfulness.dotInactive,
    marginBottom: theme.spacing.sm,
  },
  moodButtonActive: {
    backgroundColor: theme.colors.mindfulness.timingInfoBg,
    borderColor: theme.colors.mindfulness.accent,
    shadowColor: theme.colors.mindfulness.circleShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  moodEmoji: {
    fontSize: theme.typography.fontSize['5xl'],
  },
  moodLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.mindfulness.textMuted,
    textAlign: 'center',
  },
  moodLabelActive: {
    color: theme.colors.mindfulness.textPrimary,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
  },
  feedbackText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.mindfulness.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MoodSelector;
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
  { value: 1, label: 'Scattered' },
  { value: 2, label: 'Uneven' },
  { value: 3, label: 'Present' },
  { value: 4, label: 'Settled' },
  { value: 5, label: 'Deeply present' },
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
      <Text style={styles.title}>How present did the prayer feel?</Text>
      
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
              <Text style={styles.moodValue}>{mood.value}</Text>
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
            {selectedMood === 1 && 'Return gently next time. Allah sees the effort.'}
            {selectedMood === 2 && 'Even an uneven prayer can soften the heart.'}
            {selectedMood === 3 && 'Presence grows through returning again and again.'}
            {selectedMood === 4 && 'A settled prayer leaves a quiet trace.'}
            {selectedMood === 5 && 'Alhamdulillah. May Allah accept this prayer.'}
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
    color: theme.colors.text.primary,
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
    borderColor: theme.colors.border.secondary,
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
  moodValue: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  moodLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    maxWidth: 72,
  },
  moodLabelActive: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  feedbackContainer: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
  },
  feedbackText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MoodSelector;

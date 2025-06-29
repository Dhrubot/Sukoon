import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface ReflectionPromptsProps {
  prayerName: string;
  onReflectionChange: (text: string) => void;
  reflectionText: string;
}

const reflectionPrompts = {
  fajr: [
    "What are you grateful for as you start this new day?",
    "What intentions do you set for today?",
    "How did waking up for Fajr make you feel?",
    "What blessing would you like to focus on today?",
  ],
  dhuhr: [
    "How has your morning been? What are you thankful for?",
    "What can you improve in the second half of your day?",
    "How can you serve Allah better this afternoon?",
    "What moment from this morning brought you peace?",
  ],
  asr: [
    "As the day progresses, what are you reflecting on?",
    "How have you remembered Allah throughout your day?",
    "What challenge did you overcome with Allah's help?",
    "What act of kindness can you do before Maghrib?",
  ],
  maghrib: [
    "What are you most grateful for from today?",
    "How did Allah's mercy manifest in your day?",
    "What would you like to improve tomorrow?",
    "Which moment today brought you closest to Allah?",
  ],
  isha: [
    "As you end your day, what fills your heart?",
    "What did you learn today that brought you closer to Allah?",
    "How can you make tomorrow better than today?",
    "What do you want to thank Allah for before sleeping?",
  ],
};

const quickReflections = [
  "Alhamdulillah for this moment of peace 🤲",
  "May Allah accept my prayer and forgive my shortcomings",
  "I seek Allah's guidance for the rest of my day",
  "Grateful for the opportunity to connect with my Creator",
  "Ya Allah, grant me khushoo in all my prayers",
];

const ReflectionPrompts: React.FC<ReflectionPromptsProps> = ({
  prayerName,
  onReflectionChange,
  reflectionText,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Get prayer-specific prompts or use general ones
    const prompts = reflectionPrompts[prayerName as keyof typeof reflectionPrompts] || [
      "What are you grateful for in this moment?",
      "How do you hope to connect with Allah?",
      "What intentions do you bring to this prayer?",
    ];
    
    // Select a prompt based on the day
    const promptIndex = new Date().getDate() % prompts.length;
    setCurrentPrompt(prompts[promptIndex]);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [prayerName]);

  const handleQuickReflection = (text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReflectionChange(text);
    setShowQuickOptions(false);
  };

  const handleTextChange = (text: string) => {
    onReflectionChange(text);
    if (text.length > 0) {
      setShowQuickOptions(false);
    } else {
      setShowQuickOptions(true);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>{currentPrompt}</Text>
        <TouchableOpacity
          onPress={() => {
            const prompts = reflectionPrompts[prayerName as keyof typeof reflectionPrompts] || [];
            const newIndex = Math.floor(Math.random() * prompts.length);
            setCurrentPrompt(prompts[newIndex]);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text style={styles.changePrompt}>Try another prompt →</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.reflectionInput}
        multiline
        placeholder="Share your thoughts... (optional)"
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        value={reflectionText}
        onChangeText={handleTextChange}
        numberOfLines={4}
        textAlignVertical="top"
      />

      {showQuickOptions && reflectionText.length === 0 && (
        <View style={styles.quickOptionsContainer}>
          <Text style={styles.quickOptionsTitle}>Or choose a quick reflection:</Text>
          {quickReflections.map((reflection, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickOption}
              onPress={() => handleQuickReflection(reflection)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickOptionText}>{reflection}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {reflectionText.length > 0 && (
        <View style={styles.characterCount}>
          <Text style={styles.characterCountText}>
            {reflectionText.length} characters
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  promptContainer: {
    marginBottom: 20,
  },
  promptText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  changePrompt: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  reflectionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickOptionsContainer: {
    marginTop: 20,
  },
  quickOptionsTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 12,
  },
  quickOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickOptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: -12,
  },
  characterCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default ReflectionPrompts;
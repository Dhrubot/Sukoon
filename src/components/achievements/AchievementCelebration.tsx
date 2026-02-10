import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Achievement } from '../../types';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';

const { width, height } = Dimensions.get('window');

interface AchievementCelebrationProps {
  achievement: Achievement | null;
  isVisible: boolean;
  onClose: () => void;
}

const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  achievement,
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array(12).fill(0).map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (isVisible && achievement) {
      animateIn();
    } else {
      animateOut();
    }
  }, [isVisible, achievement]);

  const animateIn = () => {
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Main animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Confetti animation
    confettiAnims.forEach((anim, index) => {
      const delay = index * 50;
      const angle = (index / 12) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: Math.cos(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: Math.sin(angle) * distance - 50,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getTierGradient = (tier?: string): [string, string] => {
    const tiers = theme.colors.achievement.tiers;
    const t = (tier && tiers[tier as keyof typeof tiers]) || tiers.default;
    return [t.from, t.to];
  };

  const getConfettiColor = (index: number): string => {
    const colors = theme.colors.achievement.confetti;
    return colors[index % colors.length];
  };

  if (!achievement) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.overlayTouch} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.celebrationContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Confetti */}
            {confettiAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.confetti,
                  {
                    backgroundColor: getConfettiColor(index),
                    opacity: anim.opacity,
                    transform: [
                      { translateX: anim.translateX },
                      { translateY: anim.translateY },
                      {
                        rotate: anim.rotate.interpolate({
                          inputRange: [0, 4],
                          outputRange: ['0deg', '1440deg'],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}

            <LinearGradient
              colors={getTierGradient(achievement.tier)}
              style={styles.achievementCard}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              >
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              </Animated.View>

              <Text style={styles.unlockedText}>ACHIEVEMENT UNLOCKED!</Text>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>

              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>
                  {achievement.tier?.toUpperCase() || 'SPECIAL'}
                </Text>
              </View>

              <TouchableOpacity style={styles.continueButton} onPress={onClose}>
                <Text style={styles.continueText}>Alhamdulillah! 🤲</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.achievement.overlayBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  achievementCard: {
    width: width * 0.85,
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  achievementIcon: {
    fontSize: 80,
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.achievement.textSecondary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.achievement.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 16,
    color: theme.colors.achievement.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  tierBadge: {
    backgroundColor: theme.colors.achievement.badgeBg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.achievement.textPrimary,
    letterSpacing: 1,
  },
  continueButton: {
    backgroundColor: theme.colors.achievement.continueBg,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.achievement.continueBorder,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.achievement.textPrimary,
  },
});

export default AchievementCelebration;
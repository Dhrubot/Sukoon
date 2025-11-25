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
    switch (tier) {
      case 'bronze': return ['#CD7F32', '#8B4513'];
      case 'silver': return ['#C0C0C0', '#808080'];
      case 'gold': return ['#FFD700', '#FFA500'];
      case 'platinum': return ['#E5E4E2', '#BCC6CC'];
      default: return ['#1B5E3F', '#2E7D32'];
    }
  };

  const getConfettiColor = (index: number): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E',
      '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E',
      '#55A3FF', '#F8B500', '#FC5C65', '#26DE81',
    ];
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    shadowColor: '#000',
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
    fontSize: 14,  // md
    fontWeight: '700',  // bold
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 24,  // 3xl
    fontWeight: '700',  // bold
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDescription: {
    fontSize: 16,  // lg
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  tierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  tierText: {
    fontSize: 13,  // sm (adjusted up)
    fontWeight: '700',  // bold
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  continueText: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#FFFFFF',
  },
});

export default AchievementCelebration;
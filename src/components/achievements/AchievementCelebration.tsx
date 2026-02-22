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
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

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

    // Gentle slide-up + fade
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Soft pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getTierGradient = (tier?: string): [string, string] => {
    const tiers = theme.colors.achievement.tiers;
    const t = (tier && tiers[tier as keyof typeof tiers]) || tiers.default;
    return [t.from, t.to];
  };

  if (!achievement) return null;

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
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Soft glow behind card */}
            <Animated.View style={[styles.glow, { opacity: glowAnim }]} />

            <LinearGradient
              colors={getTierGradient(achievement.tier)}
              style={styles.achievementCard}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              </View>

              <Text style={styles.unlockedText}>Milestone Reached</Text>
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
  glow: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
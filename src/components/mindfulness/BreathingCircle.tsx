import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface BreathingCircleProps {
  isActive: boolean;
  breathCount: number;
  onBreathComplete: () => void;
}

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.6;

const BreathingCircle: React.FC<BreathingCircleProps> = ({
  isActive,
  breathCount,
  onBreathComplete,
}) => {
  const styles = useThemedStyles(createStyles);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerWidth = useRef(new Animated.Value(0)).current;
  
  // State to track breathing phase
  const [breathingPhase, setBreathingPhase] = useState('Inhale slowly...');
  
  // Refs to track animation state and timeouts
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startBreathingAnimation = useCallback(() => {
    // Reset animations
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0.8);
    timerWidth.setValue(0);

    // 1. Inhale phase
    animationRef.current = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 4000,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      Animated.timing(timerWidth, {
        toValue: 0.33,
        duration: 4000,
        useNativeDriver: false,
      }),
    ]);

    animationRef.current.start(({ finished }) => {
      if (!finished || !isMounted.current) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setBreathingPhase('Hold...');

      // 2. Hold phase
      Animated.timing(timerWidth, {
        toValue: 0.66,
        duration: 4000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished || !isMounted.current) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBreathingPhase('Exhale completely...');
        
        // 3. Exhale phase
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 2,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(timerWidth, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: false,
          }),
        ]).start(({ finished }) => {
          if (!finished || !isMounted.current) return;

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setBreathingPhase('Pause...');
          
          // 4. Pause phase
          timeoutRef.current = setTimeout(() => {
            if (!isMounted.current || !isActive) return;
            
            rotateAnim.setValue(0);
            setBreathingPhase('Inhale slowly...');
            onBreathComplete();
          }, 2000);
        });
      });
    });
  }, [scaleAnim, opacityAnim, rotateAnim, timerWidth, onBreathComplete, isActive]);

  // Effect for Pulse Animation (Background)
  useEffect(() => {
    if (!isActive) {
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
      return;
    }

    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimationRef.current.start();

    return () => {
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
      }
    };
  }, [isActive, pulseAnim]);

  // Effect for Main Breathing Cycle
  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Start the cycle
    startBreathingAnimation();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isActive, breathCount, startBreathingAnimation]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '120deg', '240deg'],
  });

  return (
    <View style={styles.container}>
      {/* Outer decorative rings */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            transform: [
              { scale: scaleAnim },
              { rotate: rotateInterpolate },
            ],
            opacity: opacityAnim.interpolate({
              inputRange: [0.8, 1],
              outputRange: [0.2, 0.4],
            }),
          },
        ]}
      />
      
      {/* Progress ring */}
      <View style={styles.progressRing}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: timerWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Main breathing circle */}
      <Animated.View
        style={[
          styles.breathingCircle,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Inner pulse circle */}
        <Animated.View
          style={[
            styles.innerCircle,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Text style={styles.breathNumber}>{breathCount}</Text>
          <Text style={styles.breathLabel}>of 3</Text>
        </Animated.View>
      </Animated.View>

      {/* Phase text */}
      <Animated.Text
        style={[
          styles.phaseText,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        {breathingPhase}
      </Animated.Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 1.2,
    height: CIRCLE_SIZE * 1.2,
    borderRadius: CIRCLE_SIZE * 0.6,
    borderWidth: 2,
    borderColor: theme.colors.mindfulness.outerRingBorder,
    borderStyle: 'dashed',
  },
  progressRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    borderRadius: (CIRCLE_SIZE + 20) / 2,
    backgroundColor: theme.colors.mindfulness.progressRingBg,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: theme.colors.mindfulness.progressFill,
  },
  breathingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: theme.colors.mindfulness.circleBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.mindfulness.circleBorder,
    elevation: 5,
    shadowColor: theme.colors.mindfulness.circleShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.4,
    height: CIRCLE_SIZE * 0.4,
    borderRadius: CIRCLE_SIZE * 0.2,
    backgroundColor: theme.colors.mindfulness.innerCircleBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathNumber: {
    fontSize: 48,
    fontWeight: '300',
    color: theme.colors.mindfulness.textPrimary,
  },
  breathLabel: {
    fontSize: 16,
    color: theme.colors.mindfulness.textSecondary,
    marginTop: -4,
  },
  phaseText: {
    position: 'absolute',
    bottom: -50,
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.mindfulness.textPrimary,
    textAlign: 'center',
  },
});

export default BreathingCircle;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';

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
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerWidth = useRef(new Animated.Value(0)).current;
  
  // State to track breathing phase
  const [breathingPhase, setBreathingPhase] = useState('Inhale slowly...');
  
  // Ref to track if animation is running
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // 🔧 FIX: Wrap the breathing animation in useCallback to prevent recreating it
  const startBreathingAnimation = useCallback(() => {
    // Reset animations
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0.8);
    timerWidth.setValue(0);

    // Inhale phase
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

    animationRef.current.start(() => {
      // 🔧 FIX: Use queueMicrotask to defer state updates
      queueMicrotask(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBreathingPhase('Hold...');
      });

      // Hold phase
      Animated.timing(timerWidth, {
        toValue: 0.66,
        duration: 4000,
        useNativeDriver: false,
      }).start(() => {
        // 🔧 FIX: Use queueMicrotask for exhale phase
        queueMicrotask(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setBreathingPhase('Exhale completely...');
        });
        
        // Exhale phase
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
        ]).start(() => {
          // 🔧 FIX: Use queueMicrotask for pause phase
          queueMicrotask(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setBreathingPhase('Pause...');
          });
          
          setTimeout(() => {
            queueMicrotask(() => {
              rotateAnim.setValue(0);
              setBreathingPhase('Inhale slowly...');
              onBreathComplete();
            });
          }, 2000);
        });
      });
    });
  }, [scaleAnim, opacityAnim, rotateAnim, timerWidth, onBreathComplete]);

  // 🔧 FIX: Use separate effect for pulse animation
  useEffect(() => {
    if (!isActive) {
      // Stop pulse animation when inactive
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
      return;
    }

    // Start pulse animation
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
        pulseAnimationRef.current = null;
      }
    };
  }, [isActive, pulseAnim]);

  // 🔧 FIX: Use separate effect for breathing animation with proper cleanup
  useEffect(() => {
    if (!isActive) {
      // Stop breathing animation when inactive
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      return;
    }

    // 🔧 FIX: Use requestAnimationFrame to defer animation start
    const animationFrameId = requestAnimationFrame(() => {
      startBreathingAnimation();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
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

const styles = StyleSheet.create({
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  progressRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    borderRadius: (CIRCLE_SIZE + 20) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  breathingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.4,
    height: CIRCLE_SIZE * 0.4,
    borderRadius: CIRCLE_SIZE * 0.2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathNumber: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  breathLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: -4,
  },
  phaseText: {
    position: 'absolute',
    bottom: -50,
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default BreathingCircle;
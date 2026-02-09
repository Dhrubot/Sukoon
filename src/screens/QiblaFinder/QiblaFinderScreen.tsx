// src/screens/QiblaFinder/QiblaFinderScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Linking,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { useTheme } from '../../providers/ThemeProvider';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';
import AnalyticsService from '../../services/AnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 64, 300);

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

// Pure utility functions (outside component to avoid re-creation)
const normalizeAngle = (deg: number) => {
  const n = deg % 360;
  return n < 0 ? n + 360 : n;
};

const shortestAngleDelta = (fromDeg: number, toDeg: number) => {
  let diff = normalizeAngle(toDeg) - normalizeAngle(fromDeg);
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
};

const smoothAngle = (prevDeg: number, nextDeg: number, alpha: number) => {
  const delta = shortestAngleDelta(prevDeg, nextDeg);
  return normalizeAngle(prevDeg + delta * alpha);
};

const calculateQiblaDirection = (lat: number, lng: number): number => {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
  const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

  const dLng = kaabaLngRad - lngRad;

  const y = Math.sin(dLng) * Math.cos(kaabaLatRad);
  const x =
    Math.cos(latRad) * Math.sin(kaabaLatRad) -
    Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLng);

  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  bearing = (bearing + 360) % 360;

  return bearing;
};

const calculateDistanceToKaaba = (lat: number, lng: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
  const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat * Math.PI) / 180) *
      Math.cos((KAABA_LAT * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Configuration constants
const CONFIG = {
  // Smoothing
  SMOOTH_ALPHA_STABLE: 0.12,
  SMOOTH_ALPHA_MOVING: 0.25,
  VELOCITY_THRESHOLD: 15, // deg/sec to switch between stable/moving
  DEAD_ZONE: 0.5, // ignore changes smaller than this
  
  // Throttling (adaptive)
  UPDATE_INTERVAL_STABLE: 150, // ms when stable
  UPDATE_INTERVAL_MOVING: 80, // ms when rotating
  UI_UPDATE_INTERVAL: 150, // ms for React state updates
  
  // Alignment
  ALIGNMENT_THRESHOLD: 3, // degrees
  
  // Calibration
  ACCURACY_GOOD: 10, // degrees
  ACCURACY_FAIR: 20, // degrees
  
  // Animation (spring config)
  SPRING_STIFFNESS: 90,
  SPRING_DAMPING: 14,
  SPRING_MASS: 1,
};

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionOffset, setDirectionOffset] = useState<number>(0);
  const [isAligned, setIsAligned] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState<'good' | 'fair' | 'poor'>('good');
  const [distanceToKaaba, setDistanceToKaaba] = useState<number | null>(null);
  const isFocused = useIsFocused();
  const { userSettings, location: storeLocation } = useStore();

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const alignGlowAnim = useRef(new Animated.Value(0)).current;
  const alignPulseAnim = useRef(new Animated.Value(1)).current;

  // Refs for sensor processing
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastUpdateMsRef = useRef<number>(0);
  const lastUiUpdateMsRef = useRef<number>(0);
  const alignedRef = useRef<boolean>(false);
  const lastHeadingRef = useRef<number>(0);
  const lastHeadingTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  // Ref for qibla direction so heading callback always has latest without restarting subscription
  const qiblaDirectionRef = useRef<number>(0);
  // Ref to track calibration status and avoid unnecessary setState calls
  const calibrationStatusRef = useRef<'good' | 'fair' | 'poor'>('good');

  // Sensor refs for tilt-compensated compass
  const magSubscription = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);
  const accelSubscription = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const latestMag = useRef({ x: 0, y: 0, z: 0 });
  const latestAccel = useRef({ x: 0, y: 0, z: 0 });

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
      return;
    }
    Linking.openSettings();
  };

  const stopHeading = useCallback(() => {
    if (headingSubscription.current) {
      headingSubscription.current.remove();
      headingSubscription.current = null;
    }
    if (magSubscription.current) {
      magSubscription.current.remove();
      magSubscription.current = null;
    }
    if (accelSubscription.current) {
      accelSubscription.current.remove();
      accelSubscription.current = null;
    }
  }, []);

  // Phase 1: Spring animation for smoother needle movement
  // Uses qiblaDirectionRef so this callback is stable and doesn't restart subscription
  const updateNeedle = useCallback(
    (heading: number) => {
      const diff = shortestAngleDelta(heading, qiblaDirectionRef.current);

      // Use spring animation instead of timing for natural feel
      Animated.spring(rotateAnim, {
        toValue: diff,
        stiffness: CONFIG.SPRING_STIFFNESS,
        damping: CONFIG.SPRING_DAMPING,
        mass: CONFIG.SPRING_MASS,
        useNativeDriver: true,
      }).start();

      // Throttle UI state updates
      const now = Date.now();
      if (now - lastUiUpdateMsRef.current < CONFIG.UI_UPDATE_INTERVAL) return;
      lastUiUpdateMsRef.current = now;

      setDirectionOffset(diff);
      const aligned = Math.abs(diff) <= CONFIG.ALIGNMENT_THRESHOLD;
      setIsAligned(aligned);

      // Haptic feedback and glow animation on alignment
      if (aligned && !alignedRef.current) {
        alignedRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Glow animation (opacity only — can use native driver)
        Animated.timing(alignGlowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        // Pulse animation (scale — native driver)
        Animated.sequence([
          Animated.timing(alignPulseAnim, {
            toValue: 1.05,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(alignPulseAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
      if (!aligned && alignedRef.current) {
        alignedRef.current = false;
        Animated.timing(alignGlowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [rotateAnim, alignGlowAnim, alignPulseAnim]
  );

  /**
   * Tilt-compensated heading from raw magnetometer + accelerometer.
   * Works in any phone orientation (held upright, tilted, or flat).
   */
  const computeTiltCompensatedHeading = useCallback(
    (mag: { x: number; y: number; z: number }, accel: { x: number; y: number; z: number }): number => {
      const { x: ax, y: ay, z: az } = accel;
      const { x: mx, y: my, z: mz } = mag;

      // Normalize accelerometer
      const aNorm = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      const nax = ax / aNorm;
      const nay = ay / aNorm;
      const naz = az / aNorm;

      // East = Mag x Gravity (cross product)
      const ex = my * naz - mz * nay;
      const ey = mz * nax - mx * naz;
      const ez = mx * nay - my * nax;

      // Normalize East
      const eNorm = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
      const nex = ex / eNorm;
      const ney = ey / eNorm;
      const nez = ez / eNorm;

      // North = Gravity x NormalizedEast (cross product)
      const ny = naz * nex - nax * nez;

      // Heading = atan2(East.y, North.y) — Y is the device forward axis
      let heading = Math.atan2(ney, ny) * (180 / Math.PI);

      // iOS accelerometer z-axis is inverted relative to Android,
      // which mirrors the East vector and thus the heading
      if (Platform.OS === 'ios') {
        heading = -heading;
      }

      return normalizeAngle(heading);
    },
    []
  );

  // Process a new heading sample with smoothing + throttling
  const processHeading = useCallback(
    (rawHeading: number) => {
      const now = Date.now();
      const timeDelta = now - lastHeadingTimeRef.current;

      if (lastHeadingTimeRef.current > 0 && timeDelta > 0) {
        const angleDelta = Math.abs(shortestAngleDelta(lastHeadingRef.current, rawHeading));
        velocityRef.current = (angleDelta / timeDelta) * 1000;
      }
      lastHeadingRef.current = rawHeading;
      lastHeadingTimeRef.current = now;

      const isMovingFast = velocityRef.current > CONFIG.VELOCITY_THRESHOLD;
      const updateInterval = isMovingFast
        ? CONFIG.UPDATE_INTERVAL_MOVING
        : CONFIG.UPDATE_INTERVAL_STABLE;

      if (now - lastUpdateMsRef.current < updateInterval) return;
      lastUpdateMsRef.current = now;

      const smoothAlpha = isMovingFast
        ? CONFIG.SMOOTH_ALPHA_MOVING
        : CONFIG.SMOOTH_ALPHA_STABLE;

      const prev = smoothedHeadingRef.current;
      const next = prev == null ? rawHeading : smoothAngle(prev, rawHeading, smoothAlpha);

      if (prev != null && Math.abs(shortestAngleDelta(prev, next)) < CONFIG.DEAD_ZONE) return;

      smoothedHeadingRef.current = next;
      updateNeedle(next);
    },
    [updateNeedle]
  );

  // Phase 2 & 3: Start heading — try tilt-compensated sensors first, fall back to Location heading
  const startHeading = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        setIsLoading(false);
        return;
      }

      if (headingSubscription.current || magSubscription.current) return;

      // Try tilt-compensated approach first (Magnetometer + Accelerometer)
      const magAvailable = await Magnetometer.isAvailableAsync();
      const accelAvailable = await Accelerometer.isAvailableAsync();

      if (magAvailable && accelAvailable) {
        Magnetometer.setUpdateInterval(CONFIG.UPDATE_INTERVAL_MOVING);
        Accelerometer.setUpdateInterval(CONFIG.UPDATE_INTERVAL_MOVING);

        accelSubscription.current = Accelerometer.addListener((data) => {
          latestAccel.current = data;
        });

        magSubscription.current = Magnetometer.addListener((data) => {
          latestMag.current = data;
          const heading = computeTiltCompensatedHeading(data, latestAccel.current);
          processHeading(heading);
        });

        // Sensors don't give accuracy, assume good when available
        if (calibrationStatusRef.current !== 'good') {
          calibrationStatusRef.current = 'good';
          setCalibrationStatus('good');
        }
      } else {
        // Fallback: expo-location heading (requires phone flat)
        headingSubscription.current = await Location.watchHeadingAsync((newHeading) => {
          const rawHeading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magHeading;
          const accuracy = newHeading.accuracy;

          if (accuracy !== undefined && accuracy >= 0) {
            const newStatus: 'good' | 'fair' | 'poor' =
              accuracy <= CONFIG.ACCURACY_GOOD ? 'good' :
              accuracy <= CONFIG.ACCURACY_FAIR ? 'fair' : 'poor';
            if (newStatus !== calibrationStatusRef.current) {
              calibrationStatusRef.current = newStatus;
              setCalibrationStatus(newStatus);
            }
          }

          processHeading(rawHeading);
        });
      }

      setIsLoading(false);
    } catch {
      setError('Unable to get location or compass data. Please check settings.');
      setIsLoading(false);
    }
  }, [computeTiltCompensatedHeading, processHeading]);

  const resolveLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stored =
        (storeLocation && storeLocation.latitude !== 0 && storeLocation.longitude !== 0
          ? storeLocation
          : userSettings?.location) || null;

      if (stored && stored.latitude !== 0 && stored.longitude !== 0) {
        setLocation({ latitude: stored.latitude, longitude: stored.longitude });
        setIsLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setIsLoading(false);
    } catch {
      setError('Unable to get location or compass data. Please check settings.');
      setIsLoading(false);
    }
  }, [storeLocation, userSettings?.location]);

  useEffect(() => {
    resolveLocation();
    return () => {
      stopHeading();
    };
  }, [resolveLocation, stopHeading]);

  // Update Qibla direction and distance when location is found
  useEffect(() => {
    if (location) {
      const direction = calculateQiblaDirection(location.latitude, location.longitude);
      setQiblaDirection(direction);
      qiblaDirectionRef.current = direction;
      const distance = calculateDistanceToKaaba(location.latitude, location.longitude);
      setDistanceToKaaba(distance);
    }
  }, [location]);

  useEffect(() => {
    if (!isFocused) {
      stopHeading();
      return;
    }
    AnalyticsService.logEvent('qibla_opened');
    // Reset sensor refs on re-focus to prevent stale catch-up animation
    smoothedHeadingRef.current = null;
    lastUpdateMsRef.current = 0;
    lastUiUpdateMsRef.current = 0;
    lastHeadingRef.current = 0;
    lastHeadingTimeRef.current = 0;
    velocityRef.current = 0;

    startHeading();
    return () => {
      stopHeading();
    };
  }, [isFocused, startHeading, stopHeading]);

  const turnText = useMemo(() => {
    const abs = Math.abs(directionOffset);
    if (abs <= CONFIG.ALIGNMENT_THRESHOLD) return 'Aligned with Qibla';
    const dir = directionOffset > 0 ? 'Turn right' : 'Turn left';
    return `${dir} • ${Math.round(abs)}°`;
  }, [directionOffset]);

  // Format distance for display
  const distanceText = useMemo(() => {
    if (!distanceToKaaba) return null;
    if (distanceToKaaba < 1) {
      return `${Math.round(distanceToKaaba * 1000)} m`;
    }
    return `${Math.round(distanceToKaaba).toLocaleString()} km`;
  }, [distanceToKaaba]);

  // Phase 4: Calibration banner text
  const calibrationBanner = useMemo(() => {
    if (calibrationStatus === 'good') return null;
    if (calibrationStatus === 'fair') {
      return { text: 'Compass accuracy is fair', color: '#F59E0B' };
    }
    return { text: 'Calibration needed - Move phone in figure 8', color: '#EF4444' };
  }, [calibrationStatus]);

  // Phase 4: Generate degree tick marks
  const degreeMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i < 360; i += 30) {
      const angle = (i * Math.PI) / 180;
      const isCardinal = i % 90 === 0;
      const innerRadius = isCardinal ? COMPASS_SIZE / 2 - 28 : COMPASS_SIZE / 2 - 18;
      const outerRadius = COMPASS_SIZE / 2 - 8;
      marks.push({
        angle: i,
        x1: Math.sin(angle) * innerRadius,
        y1: -Math.cos(angle) * innerRadius,
        x2: Math.sin(angle) * outerRadius,
        y2: -Math.cos(angle) * outerRadius,
        isCardinal,
      });
    }
    return marks;
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.content}>
          <Animated.Text style={styles.loadingIcon}>🧭</Animated.Text>
          <Text style={[styles.loadingText, { color: theme.colors.text.primary }]}>
            Finding Qibla direction...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.content}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
            Location Access Required
          </Text>
          <Text style={[styles.errorText, { color: theme.colors.text.secondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: theme.colors.primary.DEFAULT }]}
            onPress={openAppSettings}
            activeOpacity={0.8}
          >
            <Text style={[styles.settingsButtonText, { color: theme.colors.primary.contrast }]}>
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Qibla Finder</Text>
        {distanceText && (
          <Text style={[styles.headerDistance, { color: theme.colors.text.secondary }]}>
            🕋 {distanceText} to Kaaba
          </Text>
        )}
      </View>

      {/* Phase 4: Calibration warning banner */}
      {calibrationBanner && (
        <View style={[styles.calibrationBanner, { backgroundColor: calibrationBanner.color + '20' }]}>
          <Text style={[styles.calibrationText, { color: calibrationBanner.color }]}>
            ⚠️ {calibrationBanner.text}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.compassContainer}>
          {/* Phase 4: Animated compass with glow effect */}
          <Animated.View
            style={[
              styles.compassWrapper,
              {
                transform: [{ scale: alignPulseAnim }],
              },
            ]}
          >
            {/* Glow effect when aligned */}
            <Animated.View
              style={[
                styles.compassGlow,
                {
                  opacity: alignGlowAnim,
                  backgroundColor: theme.colors.primary.DEFAULT,
                  shadowColor: theme.colors.primary.DEFAULT,
                },
              ]}
            />

            <View
              style={[
                styles.compassCircle,
                {
                  borderColor: isAligned ? theme.colors.primary.DEFAULT : theme.colors.border.primary,
                  borderWidth: isAligned ? 3 : 2,
                },
              ]}
            >
              {/* Phase 4: Degree tick marks */}
              {degreeMarks.map((mark) => (
                <View
                  key={mark.angle}
                  style={[
                    styles.tickMark,
                    {
                      width: mark.isCardinal ? 3 : 1,
                      height: mark.isCardinal ? 12 : 8,
                      backgroundColor: mark.isCardinal
                        ? theme.colors.text.secondary
                        : theme.colors.border.primary,
                      transform: [
                        { translateX: mark.x2 },
                        { translateY: mark.y2 },
                        { rotate: `${mark.angle}deg` },
                      ],
                    },
                  ]}
                />
              ))}

              {/* Cardinal directions */}
              <Text style={[styles.cardinal, styles.cardinalN, { color: theme.colors.text.primary, fontWeight: '700' }]}>
                N
              </Text>
              <Text style={[styles.cardinal, styles.cardinalE, { color: theme.colors.text.muted }]}>E</Text>
              <Text style={[styles.cardinal, styles.cardinalS, { color: theme.colors.text.muted }]}>S</Text>
              <Text style={[styles.cardinal, styles.cardinalW, { color: theme.colors.text.muted }]}>W</Text>

              {/* Animated needle */}
              <Animated.View
                style={[
                  styles.needleContainer,
                  {
                    transform: [
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [-360, 360],
                          outputRange: ['-360deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.needle, { backgroundColor: theme.colors.primary.DEFAULT }]} />
                <View style={[styles.needleBase, { backgroundColor: theme.colors.primary.light }]} />
              </Animated.View>

              {/* Center dot */}
              <View
                style={[
                  styles.centerDot,
                  {
                    backgroundColor: isAligned ? theme.colors.primary.DEFAULT : theme.colors.text.muted,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Direction info */}
          <View style={styles.directionInfo}>
            <Text style={[styles.directionLabel, { color: theme.colors.text.secondary }]}>
              Qibla Direction
            </Text>
            <Text style={[styles.directionValue, { color: theme.colors.primary.DEFAULT }]}>
              {Math.round(qiblaDirection)}°
            </Text>
            <View style={styles.turnHintContainer}>
              {isAligned && <Text style={styles.alignedIcon}>✓</Text>}
              <Text
                style={[
                  styles.turnHint,
                  {
                    color: isAligned ? theme.colors.primary.DEFAULT : theme.colors.text.secondary,
                    fontWeight: isAligned ? '700' : '500',
                  },
                ]}
              >
                {turnText}
              </Text>
            </View>
          </View>

          {/* Instructions */}
          <View
            style={[
              styles.instructions,
              { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary },
            ]}
          >
            <Text style={[styles.instructionText, { color: theme.colors.text.secondary }]}>
              Point your phone in any direction and rotate slowly until the needle aligns
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerDistance: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  settingsButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  compassContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  compassCircle: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cardinal: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
  },
  cardinalN: {
    top: 10,
  },
  cardinalE: {
    right: 12,
  },
  cardinalS: {
    bottom: 10,
  },
  cardinalW: {
    left: 12,
  },
  needleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  needle: {
    width: 8,
    height: COMPASS_SIZE * 0.4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginTop: 20,
  },
  needleBase: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -8,
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
  },
  directionInfo: {
    alignItems: 'center',
    marginTop: 32,
  },
  directionLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  directionValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  turnHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 32,
    marginHorizontal: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Phase 4: New styles
  calibrationBanner: {
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  calibrationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    marginTop: 4,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassGlow: {
    position: 'absolute',
    width: COMPASS_SIZE + 20,
    height: COMPASS_SIZE + 20,
    borderRadius: (COMPASS_SIZE + 20) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  tickMark: {
    position: 'absolute',
    borderRadius: 1,
  },
  turnHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  alignedIcon: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '700',
  },
});

export default QiblaFinderScreen;
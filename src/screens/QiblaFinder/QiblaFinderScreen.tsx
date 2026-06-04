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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Magnetometer } from 'expo-sensors';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import LocationService from '../../services/LocationService';
import AnalyticsService from '../../services/AnalyticsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 48, SCREEN_HEIGHT * 0.42, 340);

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

// SVG arc path from startAngle to endAngle (degrees, 0° = up/north, clockwise).
// Used to draw the "acceptable Qibla range" sector on the compass rose.
const describeArc = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string => {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const startX = cx + r * Math.cos(startRad);
  const startY = cy + r * Math.sin(startRad);
  const endX = cx + r * Math.cos(endRad);
  const endY = cy + r * Math.sin(endRad);
  const sweep = endAngle - startAngle;
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
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
  SMOOTH_ALPHA_STABLE: 0.18,
  SMOOTH_ALPHA_MOVING: 0.30,
  VELOCITY_THRESHOLD: 15, // deg/sec to switch between stable/moving
  DEAD_ZONE: 0.3, // ignore changes smaller than this
  
  // Throttling (adaptive)
  UPDATE_INTERVAL_STABLE: 100, // ms when stable
  UPDATE_INTERVAL_MOVING: 60, // ms when rotating
  UI_UPDATE_INTERVAL: 120, // ms for React state updates
  
  // Alignment (hysteresis: enter at ENTER, exit at EXIT to prevent flicker).
  // Widened from 3°/6° to match (a) real phone-compass accuracy (~±5–10°) and
  // (b) classical fiqh tolerance for jihat al-qibla when far from the Kaaba.
  // EXIT matches ACCEPTABLE_RANGE_HALF so the user is "aligned" iff their heading
  // sits inside the visible green arc.
  ALIGNMENT_ENTER: 8,  // degrees — snap into aligned
  ALIGNMENT_EXIT: 15,  // degrees — must move this far to un-align
  // Half-width of the visible "facing Qibla is fine" sector drawn on the compass.
  // ±15° matches the EXIT threshold above; total visible arc = 30°.
  ACCEPTABLE_RANGE_HALF: 15,
  
  // Calibration
  ACCURACY_GOOD: 10, // degrees
  ACCURACY_FAIR: 20, // degrees
  
  // Magnetic interference (microTesla)
  INTERFERENCE_HIGH: 100, // > 100 µT = metal/electronics nearby
  INTERFERENCE_LOW: 15,   // < 15 µT = sensor anomaly
  
  // Animation (spring config)
  SPRING_STIFFNESS: 120,
  SPRING_DAMPING: 20,
  SPRING_MASS: 1,
};

type InterferenceLevel = 'none' | 'high' | 'anomaly';

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Locating...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionOffset, setDirectionOffset] = useState<number>(0);
  const [isAligned, setIsAligned] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState<'good' | 'fair' | 'poor'>('good');
  const [interference, setInterference] = useState<InterferenceLevel>('none');
  const [distanceToKaaba, setDistanceToKaaba] = useState<number | null>(null);
  const [displayHeading, setDisplayHeading] = useState<number>(0);
  const isFocused = useIsFocused();

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const compassRotateAnim = useRef(new Animated.Value(0)).current; // rotates the entire compass rose
  const alignGlowAnim = useRef(new Animated.Value(0)).current;
  const alignPulseAnim = useRef(new Animated.Value(1)).current;
  const kaabaOpacityAnim = useRef(new Animated.Value(0)).current;
  const kaabaScaleAnim = useRef(new Animated.Value(0.85)).current;

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
  // Ref to track interference level and avoid unnecessary setState calls
  const interferenceRef = useRef<InterferenceLevel>('none');
  // Cumulative compass rose rotation (avoids 360° wrap-around spin)
  const compassTargetRef = useRef<number>(0);
  const prevHeadingForCompassRef = useRef<number | null>(null);
  // Sensor ref for magnetometer (interference detection only)
  const magSubscription = useRef<ReturnType<typeof Magnetometer.addListener> | null>(null);
  // Flipped by stopHeading; checked after each await in startHeading to defeat the
  // classic "navigate away before async sensor setup resolves" subscription leak.
  const cancelledRef = useRef<boolean>(false);
  // Prevents two startHeading() invocations from racing past the null-check on
  // headingSubscription during rapid focus toggles.
  const isStartingRef = useRef<boolean>(false);
  // Guards qibla_opened analytics to fire once per mount, not on every re-focus.
  const analyticsLoggedRef = useRef<boolean>(false);

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
      return;
    }
    Linking.openSettings();
  };

  const stopHeading = useCallback(() => {
    cancelledRef.current = true;
    if (headingSubscription.current) {
      headingSubscription.current.remove();
      headingSubscription.current = null;
    }
    if (magSubscription.current) {
      magSubscription.current.remove();
      magSubscription.current = null;
    }
  }, []);

  // Spring animation for smoother needle + compass rose movement
  // Uses qiblaDirectionRef so this callback is stable and doesn't restart subscription
  const updateNeedle = useCallback(
    (heading: number) => {
      const diff = shortestAngleDelta(heading, qiblaDirectionRef.current);

      // Animate the Qibla needle (offset from heading to Qibla)
      Animated.spring(rotateAnim, {
        toValue: diff,
        stiffness: CONFIG.SPRING_STIFFNESS,
        damping: CONFIG.SPRING_DAMPING,
        mass: CONFIG.SPRING_MASS,
        useNativeDriver: true,
      }).start();

      // Animate the compass rose (rotates opposite to heading so N tracks true north)
      // Use cumulative tracking to avoid 360° reverse-spin when heading wraps past north
      if (prevHeadingForCompassRef.current != null) {
        const headingDelta = shortestAngleDelta(prevHeadingForCompassRef.current, heading);
        compassTargetRef.current -= headingDelta;
        // Strip whole rotations to keep float precision bounded. Visually a no-op
        // (rotation by N*360° looks identical) but resets the spring's working range.
        if (Math.abs(compassTargetRef.current) > 3600) {
          const wraps = Math.trunc(compassTargetRef.current / 360);
          compassTargetRef.current -= wraps * 360;
          compassRotateAnim.setValue(compassTargetRef.current);
        }
      } else {
        compassTargetRef.current = -heading;
      }
      prevHeadingForCompassRef.current = heading;
      Animated.spring(compassRotateAnim, {
        toValue: compassTargetRef.current,
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
      setDisplayHeading(Math.round(normalizeAngle(heading)));

      // Alignment hysteresis: enter at ENTER threshold, exit at EXIT threshold
      const absDiff = Math.abs(diff);
      const wasAligned = alignedRef.current;
      const aligned = wasAligned
        ? absDiff <= CONFIG.ALIGNMENT_EXIT   // must exceed EXIT to un-align
        : absDiff <= CONFIG.ALIGNMENT_ENTER; // must be within ENTER to align
      setIsAligned(aligned);

      // Haptic feedback, glow, and Kaaba lock-in on alignment
      if (aligned && !wasAligned) {
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
        // Kaaba lock-in: fade in + scale up
        Animated.parallel([
          Animated.spring(kaabaScaleAnim, {
            toValue: 1,
            stiffness: 120,
            damping: 12,
            useNativeDriver: true,
          }),
          Animated.timing(kaabaOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
      if (!aligned && wasAligned) {
        alignedRef.current = false;
        Animated.timing(alignGlowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        // Kaaba fade out
        Animated.parallel([
          Animated.timing(kaabaScaleAnim, {
            toValue: 0.85,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(kaabaOpacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [rotateAnim, compassRotateAnim, alignGlowAnim, alignPulseAnim, kaabaScaleAnim, kaabaOpacityAnim]
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

  // Start heading — use OS-level watchHeadingAsync for accurate trueHeading,
  // optionally subscribe to Magnetometer for interference detection only.
  // Cancellation-aware: after every await we check cancelledRef and tear down
  // anything we just installed, so leaving the screen mid-setup doesn't leak.
  const startHeading = useCallback(async () => {
    if (headingSubscription.current || isStartingRef.current) return;
    isStartingRef.current = true;
    cancelledRef.current = false;
    try {
      // Primary: OS heading via expo-location (trueHeading with sensor fusion)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelledRef.current) return;
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        return;
      }

      const headingSub = await Location.watchHeadingAsync((newHeading) => {
        const usingMagFallback = newHeading.trueHeading < 0;
        const rawHeading = usingMagFallback ? newHeading.magHeading : newHeading.trueHeading;
        const accuracy = newHeading.accuracy;

        // When trueHeading is unavailable, magHeading is uncorrected for magnetic
        // declination — can be off by 10–15° in high-declination regions. Mark
        // calibration as "poor" so the user sees the figure-8 banner.
        let newStatus: 'good' | 'fair' | 'poor';
        if (usingMagFallback) {
          newStatus = 'poor';
        } else if (accuracy !== undefined && accuracy >= 0) {
          newStatus =
            accuracy <= CONFIG.ACCURACY_GOOD ? 'good' :
            accuracy <= CONFIG.ACCURACY_FAIR ? 'fair' : 'poor';
        } else {
          newStatus = calibrationStatusRef.current;
        }
        if (newStatus !== calibrationStatusRef.current) {
          calibrationStatusRef.current = newStatus;
          setCalibrationStatus(newStatus);
        }

        processHeading(rawHeading);
      });
      if (cancelledRef.current) {
        headingSub.remove();
        return;
      }
      headingSubscription.current = headingSub;

      // Auxiliary: Magnetometer for interference detection only (no heading computation)
      const magAvailable = await Magnetometer.isAvailableAsync();
      if (cancelledRef.current) return;
      if (magAvailable) {
        Magnetometer.setUpdateInterval(CONFIG.UPDATE_INTERVAL_STABLE);
        const magSub = Magnetometer.addListener((data) => {
          const bTotal = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
          let newInterference: InterferenceLevel = 'none';
          if (bTotal > CONFIG.INTERFERENCE_HIGH) {
            newInterference = 'high';
          } else if (bTotal < CONFIG.INTERFERENCE_LOW) {
            newInterference = 'anomaly';
          }
          if (newInterference !== interferenceRef.current) {
            interferenceRef.current = newInterference;
            setInterference(newInterference);
          }
        });
        if (cancelledRef.current) {
          magSub.remove();
          return;
        }
        magSubscription.current = magSub;
      }

      setIsLoading(false);
    } catch {
      if (cancelledRef.current) return;
      setError('Unable to get location or compass data. Please check settings.');
      setIsLoading(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [processHeading]);

  const resolveLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Try saved location first (instant, no GPS)
      const saved = LocationService.getCurrentSavedLocation();
      if (saved) {
        setLocation({ latitude: saved.latitude, longitude: saved.longitude });
        setLocationName(saved.city || 'Current Location');
        setIsLoading(false);
        return;
      }

      // 2. Fall back to GPS via LocationService (handles permissions + geocoding)
      const freshLoc = await LocationService.getCurrentLocation();
      if (freshLoc) {
        setLocation({ latitude: freshLoc.latitude, longitude: freshLoc.longitude });
        setLocationName(freshLoc.city || 'Current Location');
        setIsLoading(false);
        return;
      }

      setError('Location permission is required to find Qibla direction');
      setIsLoading(false);
    } catch {
      setError('Unable to get location. Please check settings.');
      setIsLoading(false);
    }
  }, []);

  // Unmount cleanup only. resolveLocation runs from the focus effect below to
  // avoid two concurrent geocoding calls on mount.
  useEffect(() => {
    return () => {
      stopHeading();
    };
  }, [stopHeading]);

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
    if (!analyticsLoggedRef.current) {
      AnalyticsService.logEvent('qibla_opened');
      analyticsLoggedRef.current = true;
    }
    // Reset sensor refs on re-focus to prevent stale catch-up animation
    smoothedHeadingRef.current = null;
    lastUpdateMsRef.current = 0;
    lastUiUpdateMsRef.current = 0;
    lastHeadingRef.current = 0;
    lastHeadingTimeRef.current = 0;
    velocityRef.current = 0;
    prevHeadingForCompassRef.current = null;

    // Re-resolve location on every focus so settings changes are picked up
    resolveLocation();
    startHeading();
    return () => {
      stopHeading();
    };
  }, [isFocused, startHeading, stopHeading, resolveLocation]);

  const turnText = useMemo(() => {
    const abs = Math.abs(directionOffset);
    // Inside the visible arc — counts as facing Qibla. Show a tighter "exact"
    // label near dead-centre to reward precision without faking it elsewhere.
    if (abs <= CONFIG.ALIGNMENT_EXIT) {
      return abs <= CONFIG.ALIGNMENT_ENTER ? 'Facing Qibla' : "You're facing Qibla";
    }
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

  // Calibration / interference banner
  const calibrationBanner = useMemo(() => {
    if (interference === 'high') {
      return {
        text: 'Magnetic interference detected — move away from metal or electronics',
        bgColor: theme.colors.qibla.interferenceWarningBg,
        textColor: theme.colors.qibla.interferenceWarningText,
      };
    }
    if (interference === 'anomaly') {
      return {
        text: 'Weak magnetic signal — move to a different spot',
        bgColor: theme.colors.qibla.anomalyWarningBg,
        textColor: theme.colors.qibla.anomalyWarningText,
      };
    }
    if (calibrationStatus === 'fair') {
      return {
        text: 'Compass accuracy is fair',
        bgColor: theme.colors.qibla.anomalyWarningBg,
        textColor: theme.colors.qibla.anomalyWarningText,
      };
    }
    if (calibrationStatus === 'poor') {
      return {
        text: 'Calibration needed — move phone in figure 8',
        bgColor: theme.colors.qibla.interferenceWarningBg,
        textColor: theme.colors.qibla.interferenceWarningText,
      };
    }
    return null;
  }, [calibrationStatus, interference, theme.colors.qibla]);

  // Generate degree tick marks — every 10° with three visual tiers
  const degreeMarks = useMemo(() => {
    const marks = [];
    for (let i = 0; i < 360; i += 10) {
      const angle = (i * Math.PI) / 180;
      const isCardinal = i % 90 === 0;
      const isIntercardinal = i % 45 === 0 && !isCardinal;
      const innerRadius = isCardinal
        ? COMPASS_SIZE / 2 - 28
        : isIntercardinal
          ? COMPASS_SIZE / 2 - 22
          : COMPASS_SIZE / 2 - 16;
      const outerRadius = COMPASS_SIZE / 2 - 8;
      marks.push({
        angle: i,
        x1: Math.sin(angle) * innerRadius,
        y1: -Math.cos(angle) * innerRadius,
        x2: Math.sin(angle) * outerRadius,
        y2: -Math.cos(angle) * outerRadius,
        isCardinal,
        isIntercardinal,
      });
    }
    return marks;
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
        <View style={styles.centeredContent}>
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
        <View style={styles.centeredContent}>
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
      {/* Compact header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Qibla</Text>
          <Text style={[styles.headerCity, { color: theme.colors.qibla.hintText }]}>
            {locationName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {distanceText && (
            <Text style={[styles.headerDistance, { color: theme.colors.text.secondary }]}>
              🕋 {distanceText}
            </Text>
          )}
        </View>
      </View>

      {/* Interference / calibration warning banner */}
      {calibrationBanner && (
        <View style={[styles.calibrationBanner, { backgroundColor: calibrationBanner.bgColor }]}>
          <Text style={[styles.calibrationText, { color: calibrationBanner.textColor }]}>
            ⚠️ {calibrationBanner.text}
          </Text>
        </View>
      )}

      {/* Full-screen compass area */}
      <View style={styles.compassArea}>
        <Animated.View
          style={[
            styles.compassWrapper,
            { transform: [{ scale: alignPulseAnim }] },
          ]}
        >
          {/* Glow effect when aligned */}
          <Animated.View
            style={[
              styles.compassGlow,
              {
                opacity: alignGlowAnim,
                backgroundColor: theme.colors.qibla.alignedGlow,
                shadowColor: theme.colors.qibla.alignedGlowShadow,
              },
            ]}
          />

          <View
            style={[
              styles.compassCircle,
              {
                backgroundColor: theme.colors.qibla.compassBg,
                borderColor: isAligned
                  ? theme.colors.qibla.compassRingAligned
                  : theme.colors.qibla.compassRing,
                borderWidth: isAligned ? 3 : 2,
              },
            ]}
          >
            {/* Rotating compass rose — tracks true north */}
            <Animated.View
              style={[
                styles.compassRoseRotator,
                {
                  transform: [
                    {
                      rotate: compassRotateAnim.interpolate({
                        inputRange: [-1, 0, 1],
                        outputRange: ['-1deg', '0deg', '1deg'],
                        extrapolate: 'extend',
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Degree tick marks */}
              {degreeMarks.map((mark) => (
                <View
                  key={mark.angle}
                  style={[
                    styles.tickMark,
                    {
                      width: mark.isCardinal ? 3 : mark.isIntercardinal ? 2 : 1,
                      height: mark.isCardinal ? 12 : mark.isIntercardinal ? 10 : 6,
                      backgroundColor: mark.isCardinal
                        ? theme.colors.qibla.tickCardinal
                        : mark.isIntercardinal
                          ? theme.colors.qibla.tickCardinal
                          : theme.colors.qibla.tickMinor,
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
              <Text style={[styles.cardinal, styles.cardinalN, { color: theme.colors.qibla.cardinalN, fontWeight: '700' }]}>
                N
              </Text>
              <Text style={[styles.cardinal, styles.cardinalE, { color: theme.colors.qibla.cardinalMuted }]}>E</Text>
              <Text style={[styles.cardinal, styles.cardinalS, { color: theme.colors.qibla.cardinalMuted }]}>S</Text>
              <Text style={[styles.cardinal, styles.cardinalW, { color: theme.colors.qibla.cardinalMuted }]}>W</Text>
              {/* Intercardinal directions */}
              <Text style={[styles.intercardinal, styles.intercardinalNE, { color: theme.colors.qibla.cardinalMuted }]}>NE</Text>
              <Text style={[styles.intercardinal, styles.intercardinalSE, { color: theme.colors.qibla.cardinalMuted }]}>SE</Text>
              <Text style={[styles.intercardinal, styles.intercardinalSW, { color: theme.colors.qibla.cardinalMuted }]}>SW</Text>
              <Text style={[styles.intercardinal, styles.intercardinalNW, { color: theme.colors.qibla.cardinalMuted }]}>NW</Text>

              {/* Acceptable Qibla range — translucent arc on the inner ring spanning
                  ±ACCEPTABLE_RANGE_HALF around exact Qibla. Anywhere inside this arc
                  is a valid facing direction (jihat al-qibla). */}
              {location !== null && (
                <Svg
                  width={COMPASS_SIZE}
                  height={COMPASS_SIZE}
                  style={styles.acceptableRangeSvg}
                  pointerEvents="none"
                >
                  <Path
                    d={describeArc(
                      COMPASS_SIZE / 2,
                      COMPASS_SIZE / 2,
                      COMPASS_SIZE / 2 - 12,
                      qiblaDirection - CONFIG.ACCEPTABLE_RANGE_HALF,
                      qiblaDirection + CONFIG.ACCEPTABLE_RANGE_HALF,
                    )}
                    stroke={
                      isAligned
                        ? theme.colors.qibla.acceptableRangeBright
                        : theme.colors.qibla.acceptableRange
                    }
                    strokeWidth={10}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
              )}

              {/* Qibla bearing marker — dot at the exact bearing, sitting on the arc */}
              {location !== null && (
                <View
                  style={[
                    styles.qiblaMarker,
                    {
                      backgroundColor: theme.colors.qibla.compassRingAligned,
                      transform: [
                        { translateX: Math.sin((qiblaDirection * Math.PI) / 180) * (COMPASS_SIZE / 2 - 12) },
                        { translateY: -Math.cos((qiblaDirection * Math.PI) / 180) * (COMPASS_SIZE / 2 - 12) },
                      ],
                    },
                  ]}
                />
              )}
            </Animated.View>

            {/* Animated gradient beam needle — rotates to Qibla offset */}
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
              {/* Beam body — gradient from transparent to colored */}
              <LinearGradient
                colors={[
                  'transparent',
                  isAligned ? theme.colors.qibla.needleBeamAligned : theme.colors.qibla.needleBeam,
                ]}
                start={{ x: 0.5, y: 1 }}
                end={{ x: 0.5, y: 0 }}
                style={styles.beamBody}
              />
              {/* Arrow tip */}
              <View
                style={[
                  styles.beamTip,
                  {
                    borderBottomColor: isAligned
                      ? theme.colors.qibla.needleBeamAligned
                      : theme.colors.qibla.needleTip,
                  },
                ]}
              />
            </Animated.View>

            {/* Kaaba lock-in icon (center) */}
            <Animated.View
              style={[
                styles.kaabaContainer,
                {
                  opacity: kaabaOpacityAnim,
                  transform: [{ scale: kaabaScaleAnim }],
                },
              ]}
            >
              <View style={[styles.kaabaCube, { backgroundColor: theme.colors.qibla.kaabaIcon, borderColor: theme.colors.qibla.kaabaGold }]} />
              <Text style={[styles.kaabaLabel, { color: theme.colors.qibla.kaabaGold }]}>Qibla</Text>
            </Animated.View>

            {/* Center dot (hidden when Kaaba is visible) */}
            <Animated.View
              style={[
                styles.centerDot,
                {
                  backgroundColor: isAligned
                    ? theme.colors.qibla.compassRingAligned
                    : theme.colors.text.muted,
                  opacity: kaabaOpacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* Direction info — overlaid below compass */}
        <View style={styles.directionInfo}>
          <View style={styles.bearingRow}>
            <View style={styles.bearingItem}>
              <Text style={[styles.bearingLabel, { color: theme.colors.qibla.hintText }]}>Heading</Text>
              <Text style={[styles.directionValue, { color: theme.colors.text.primary }]}>
                {displayHeading}°
              </Text>
            </View>
            <View style={[styles.bearingDivider, { backgroundColor: theme.colors.qibla.tickMinor }]} />
            <View style={styles.bearingItem}>
              <Text style={[styles.bearingLabel, { color: theme.colors.qibla.hintText }]}>Qibla</Text>
              <Text style={[styles.directionValue, { color: theme.colors.qibla.bearingText }]}>
                {Math.round(qiblaDirection)}°
              </Text>
            </View>
          </View>
          <View style={styles.turnHintContainer}>
            {isAligned && <Text style={[styles.alignedIcon, { color: theme.colors.qibla.compassRingAligned }]}>✓</Text>}
            <Text
              style={[
                styles.turnHint,
                {
                  color: isAligned ? theme.colors.qibla.compassRingAligned : theme.colors.qibla.hintText,
                  fontWeight: isAligned ? '700' : '500',
                },
              ]}
            >
              {turnText}
            </Text>
          </View>
        </View>
      </View>

      {/* Subtle footer hint */}
      <View style={styles.footer}>
        <Text style={[styles.footerHint, { color: theme.colors.text.muted }]}>
          Rotate slowly to find Qibla
        </Text>
      </View>
    </SafeAreaView>
  );
};
const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexShrink: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.heading,
  },
  headerCity: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    marginTop: 2,
  },
  headerDistance: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    marginTop: 4,
  },
  centeredContent: {
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
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.bodyBold,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.body,
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
    fontFamily: theme.typography.fontFamily.bodyBold,
  },
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
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  compassArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassRoseRotator: {
    position: 'absolute',
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
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
  compassCircle: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tickMark: {
    position: 'absolute',
    borderRadius: 1,
  },
  acceptableRangeSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  qiblaMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardinal: {
    position: 'absolute',
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bodyBold,
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
  intercardinal: {
    position: 'absolute',
    fontSize: 9,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    opacity: 0.7,
  },
  intercardinalNE: {
    top: 28,
    right: 24,
  },
  intercardinalSE: {
    bottom: 28,
    right: 24,
  },
  intercardinalSW: {
    bottom: 28,
    left: 24,
  },
  intercardinalNW: {
    top: 28,
    left: 24,
  },
  needleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  beamBody: {
    width: 6,
    height: COMPASS_SIZE * 0.35,
    borderRadius: 3,
    marginTop: 24,
  },
  beamTip: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  kaabaContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaabaCube: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  kaabaLabel: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bodyBold,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
  },
  directionInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  bearingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bearingItem: {
    alignItems: 'center',
  },
  bearingLabel: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bearingDivider: {
    width: 1,
    height: 28,
    opacity: 0.3,
  },
  directionValue: {
    fontSize: 28,
    fontFamily: theme.typography.fontFamily.bodyBold,
  },
  turnHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  alignedIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  turnHint: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerHint: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.body,
  },
});

export default QiblaFinderScreen;
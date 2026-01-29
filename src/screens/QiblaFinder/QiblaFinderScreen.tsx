// src/screens/QiblaFinder/QiblaFinderScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../providers/ThemeProvider';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../store/useStore';

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [directionOffset, setDirectionOffset] = useState<number>(0);
  const [isAligned, setIsAligned] = useState(false);
  const isFocused = useIsFocused();
  const { userSettings, location: storeLocation } = useStore();
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastUpdateMsRef = useRef<number>(0);
  const lastUiUpdateMsRef = useRef<number>(0);
  const alignedRef = useRef<boolean>(false);

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

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
  }, []);

  const updateNeedle = useCallback(
    (heading: number) => {
      const diff = shortestAngleDelta(heading, qiblaDirection);

      rotateAnim.stopAnimation();
      Animated.timing(rotateAnim, {
        toValue: diff,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      const now = Date.now();
      if (now - lastUiUpdateMsRef.current < 200) return;
      lastUiUpdateMsRef.current = now;

      setDirectionOffset(diff);
      const aligned = Math.abs(diff) <= 3;
      setIsAligned(aligned);
      if (aligned && !alignedRef.current) {
        alignedRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (!aligned && alignedRef.current) {
        alignedRef.current = false;
      }
    },
    [qiblaDirection, rotateAnim]
  );

  const startHeading = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        setIsLoading(false);
        return;
      }

      if (headingSubscription.current) return;

      headingSubscription.current = await Location.watchHeadingAsync((newHeading) => {
        const rawHeading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magHeading;

        const now = Date.now();
        if (now - lastUpdateMsRef.current < 90) return;
        lastUpdateMsRef.current = now;

        const prev = smoothedHeadingRef.current;
        const next = prev == null ? rawHeading : smoothAngle(prev, rawHeading, 0.18);
        if (prev != null && Math.abs(shortestAngleDelta(prev, next)) < 0.35) return;

        smoothedHeadingRef.current = next;
        updateNeedle(next);
      });

      setIsLoading(false);
    } catch {
      setError('Unable to get location or compass data. Please check settings.');
      setIsLoading(false);
    }
  }, [stopHeading, updateNeedle]);

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

  // Update Qibla direction when location is found
  useEffect(() => {
    if (location) {
      const direction = calculateQiblaDirection(location.latitude, location.longitude);
      setQiblaDirection(direction);
    }
  }, [location]);

  useEffect(() => {
    if (!isFocused) {
      stopHeading();
      return;
    }
    startHeading();
    return () => {
      stopHeading();
    };
  }, [isFocused, startHeading, stopHeading]);

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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.content}>
          <Text style={styles.loadingIcon}>🧭</Text>
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

  const turnText = useMemo(() => {
    const abs = Math.abs(directionOffset);
    if (abs <= 3) return '✅ Aligned with Qibla';
    const dir = directionOffset > 0 ? 'Turn right' : 'Turn left';
    return `${dir} • ${Math.round(abs)}°`;
  }, [directionOffset]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Qibla Finder</Text>
      </View>

      <View style={styles.compassContainer}>
        <View style={styles.kaabaIconContainer}>
          <Text style={styles.kaabaIcon}>🕋</Text>
          <Text style={[styles.kaabaText, { color: theme.colors.text.secondary }]}>Kaaba</Text>
        </View>

        <View style={[styles.compassCircle, { borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.cardinal, styles.cardinalN, { color: theme.colors.text.muted }]}>N</Text>
          <Text style={[styles.cardinal, styles.cardinalE, { color: theme.colors.text.muted }]}>E</Text>
          <Text style={[styles.cardinal, styles.cardinalS, { color: theme.colors.text.muted }]}>S</Text>
          <Text style={[styles.cardinal, styles.cardinalW, { color: theme.colors.text.muted }]}>W</Text>

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

          <View style={[styles.centerDot, { backgroundColor: theme.colors.primary.DEFAULT }]} />
        </View>

        <View style={styles.directionInfo}>
          <Text style={[styles.directionLabel, { color: theme.colors.text.secondary }]}>Qibla Direction</Text>
          <Text style={[styles.directionValue, { color: theme.colors.primary.DEFAULT }]}>
            {Math.round(qiblaDirection)}°
          </Text>
          <Text
            style={[
              styles.turnHint,
              { color: isAligned ? theme.colors.primary.DEFAULT : theme.colors.text.secondary },
            ]}
          >
            {turnText}
          </Text>
        </View>

        {location && (
          <View style={styles.locationInfo}>
            <Text style={[styles.locationText, { color: theme.colors.text.muted }]}
            >
              📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </Text>
          </View>
        )}

        <View
          style={[
            styles.instructions,
            { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary },
          ]}
        >
          <Text style={[styles.instructionText, { color: theme.colors.text.secondary }]}
          >
            Hold your phone flat and rotate slowly. If the compass feels jumpy, move your phone in a “figure 8” to calibrate.
          </Text>
        </View>
      </View>
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
    paddingVertical: 40,
  },
  kaabaIconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  kaabaIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  kaabaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  compassCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    height: 120,
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
  locationInfo: {
    marginTop: 16,
  },
  locationText: {
    fontSize: 13,
  },
  instructions: {
    marginTop: 32,
    marginHorizontal: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default QiblaFinderScreen;
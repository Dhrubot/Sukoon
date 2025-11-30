// src/screens/QiblaFinder/QiblaFinderScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useTheme } from '../../providers/ThemeProvider';

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  useEffect(() => {
    setupLocationAndCompass();
    return () => {
      // Cleanup heading subscription
      if (headingSubscription.current) {
        headingSubscription.current.remove();
      }
    };
  }, []);

  // Update Qibla direction when location is found
  useEffect(() => {
    if (location) {
      const direction = calculateQiblaDirection(location.latitude, location.longitude);
      setQiblaDirection(direction);
    }
  }, [location]);

  // Handle smooth animation with shortest path rotation
  useEffect(() => {
    let diff = qiblaDirection - compassHeading;

    // Normalize rotation to take shortest path (avoid 360° spins)
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    Animated.timing(rotateAnim, {
      toValue: diff,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [qiblaDirection, compassHeading, rotateAnim]);

  const setupLocationAndCompass = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        setIsLoading(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Start watching compass heading
      headingSubscription.current = await Location.watchHeadingAsync((newHeading) => {
        // Use trueHeading if available (more accurate), otherwise use magHeading
        const heading = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magHeading;
        setCompassHeading(heading);
      });

      setIsLoading(false);
    } catch (err) {
      setError('Unable to get location or compass data. Please check settings.');
      setIsLoading(false);
    }
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
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Qibla Finder
        </Text>
      </View>

      <View style={styles.compassContainer}>
        <View style={styles.kaabaIconContainer}>
          <Text style={styles.kaabaIcon}>🕋</Text>
          <Text style={[styles.kaabaText, { color: theme.colors.text.secondary }]}>
            Kaaba
          </Text>
        </View>

        <View style={[styles.compassCircle, { borderColor: theme.colors.border.primary }]}>
          <Animated.View
            style={[
              styles.needleContainer,
              {
                transform: [
                  { 
                    rotate: rotateAnim.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg']
                    }) 
                  }
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
          <Text style={[styles.directionLabel, { color: theme.colors.text.secondary }]}>
            Qibla Direction
          </Text>
          <Text style={[styles.directionValue, { color: theme.colors.primary.DEFAULT }]}>
            {Math.round(qiblaDirection)}°
          </Text>
        </View>

        {location && (
          <View style={styles.locationInfo}>
            <Text style={[styles.locationText, { color: theme.colors.text.muted }]}>
              📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </Text>
          </View>
        )}

        <View style={[styles.instructions, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.instructionText, { color: theme.colors.text.secondary }]}>
            Hold your phone flat and rotate until the needle points upward
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
// src/screens/QiblaFinder/QiblaFinderScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useTheme } from '../../providers/ThemeProvider';

const QiblaFinderScreen: React.FC = () => {
  const { theme } = useTheme();
  const [qiblaDirection, setQiblaDirection] = useState<number>(0);
  const [magnetometerData, setMagnetometerData] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rotateAnim = new Animated.Value(0);

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LNG = 39.8262;

  useEffect(() => {
    requestPermissions();
    return () => {
      Magnetometer.removeAllListeners();
    };
  }, []);

  useEffect(() => {
    if (location) {
      const direction = calculateQiblaDirection(location.latitude, location.longitude);
      setQiblaDirection(direction);
    }
  }, [location]);

  useEffect(() => {
    let subscription: any;
    if (location) {
      subscription = Magnetometer.addListener((data: { x: number; y: number; z: number }) => {
        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
        angle = angle >= 0 ? angle : angle + 360;
        setMagnetometerData(angle);
      });
      Magnetometer.setUpdateInterval(100);
    }
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [location]);

  const requestPermissions = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find Qibla direction');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setIsLoading(false);
    } catch (err) {
      setError('Unable to get your location. Please check your settings.');
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

  const compassRotation = qiblaDirection - magnetometerData;

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Qibla Finder
        </Text>
      </View>

      {/* Main Compass */}
      <View style={styles.compassContainer}>
        {/* Kaaba Icon */}
        <View style={styles.kaabaIconContainer}>
          <Text style={styles.kaabaIcon}>🕋</Text>
          <Text style={[styles.kaabaText, { color: theme.colors.text.secondary }]}>
            Kaaba
          </Text>
        </View>

        {/* Compass Circle */}
        <View style={[styles.compassCircle, { borderColor: theme.colors.border.primary }]}>
          {/* Compass Needle */}
          <Animated.View
            style={[
              styles.needleContainer,
              {
                transform: [{ rotate: `${compassRotation}deg` }],
              },
            ]}
          >
            <View style={[styles.needle, { backgroundColor: theme.colors.primary.DEFAULT }]} />
            <View style={[styles.needleBase, { backgroundColor: theme.colors.primary.light }]} />
          </Animated.View>

          {/* Center Dot */}
          <View style={[styles.centerDot, { backgroundColor: theme.colors.primary.DEFAULT }]} />
        </View>

        {/* Direction Info */}
        <View style={styles.directionInfo}>
          <Text style={[styles.directionLabel, { color: theme.colors.text.secondary }]}>
            Direction
          </Text>
          <Text style={[styles.directionValue, { color: theme.colors.primary.DEFAULT }]}>
            {Math.round(qiblaDirection)}°
          </Text>
        </View>

        {/* Location Info */}
        {location && (
          <View style={styles.locationInfo}>
            <Text style={[styles.locationText, { color: theme.colors.text.muted }]}>
              📍 {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </Text>
          </View>
        )}

        {/* Instructions */}
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
    paddingHorizontal: 24,           // 2xl
    paddingTop: 20,                  // xl
    paddingBottom: 16,               // lg
  },
  headerTitle: {
    fontSize: 28,                    // 4xl
    fontWeight: '700',               // bold
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,           // 4xl
  },
  loadingIcon: {
    fontSize: 60,
    marginBottom: 24,                // 2xl
  },
  loadingText: {
    fontSize: 16,                    // lg
    fontWeight: '500',               // medium
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 24,                // 2xl
  },
  errorTitle: {
    fontSize: 20,                    // 2xl
    fontWeight: '700',               // bold
    marginBottom: 12,                // md
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,                    // base
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,           // xl
  },
  compassContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,             // 4xl
  },
  kaabaIconContainer: {
    alignItems: 'center',
    marginBottom: 40,                // 4xl
  },
  kaabaIcon: {
    fontSize: 48,                    // icon 4xl
    marginBottom: 8,                 // sm
  },
  kaabaText: {
    fontSize: 14,                    // md
    fontWeight: '500',               // medium
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
    marginTop: 32,                   // 3xl
  },
  directionLabel: {
    fontSize: 14,                    // md
    marginBottom: 8,                 // sm
  },
  directionValue: {
    fontSize: 32,                    // 5xl
    fontWeight: '700',               // bold
  },
  locationInfo: {
    marginTop: 16,                   // lg
  },
  locationText: {
    fontSize: 13,                    // sm
  },
  instructions: {
    marginTop: 32,                   // 3xl
    marginHorizontal: 32,            // 3xl
    padding: 16,                     // lg
    borderRadius: 12,                // md
    borderWidth: 1,
  },
  instructionText: {
    fontSize: 14,                    // md
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default QiblaFinderScreen;
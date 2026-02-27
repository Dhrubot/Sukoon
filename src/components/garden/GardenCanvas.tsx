// src/components/garden/GardenCanvas.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { GardenPlant } from '../../types/garden';
import GardenPlantView from './GardenPlantView';

interface GardenCanvasProps {
  plants: GardenPlant[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_HEIGHT = 280;
const CANVAS_PADDING = 16;
const PLANT_SIZE = 48;

// Deterministic hash for positioning
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const GardenCanvas: React.FC<GardenCanvasProps> = ({ plants }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Get current time-of-day gradient
  const skyGradient = useMemo(() => {
    const hour = new Date().getHours();
    const gradients = theme.colors.prayerGradients;
    if (hour < 5 || hour >= 21) return gradients.Isha;
    if (hour < 7) return gradients.Fajr;
    if (hour < 14) return gradients.Dhuhr;
    if (hour < 17) return gradients.Asr;
    if (hour < 19) return gradients.Maghrib;
    return gradients.Isha;
  }, [theme]);

  // Position plants organically using hash-based deterministic scatter
  const positionedPlants = useMemo(() => {
    const usableWidth = SCREEN_WIDTH - (CANVAS_PADDING * 2) - PLANT_SIZE;
    const usableHeight = CANVAS_HEIGHT - PLANT_SIZE - 20; // bottom margin for soil

    return plants.slice(0, 24).map((plant, index) => {
      const hash = simpleHash(`${plant.date}-${plant.prayer}-${index}`);
      const x = CANVAS_PADDING + (hash % Math.floor(usableWidth));
      const y = 10 + ((hash * 7) % Math.floor(usableHeight));

      return { plant, x, y, delay: index * 80 };
    });
  }, [plants]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={skyGradient as readonly string[] as any}
        style={styles.gradient}
      >
        {/* Soil ground at the bottom */}
        <View style={[styles.soilStrip, { backgroundColor: theme.colors.garden.soil }]} />

        {/* Plants scattered organically */}
        {positionedPlants.map(({ plant, x, y, delay }, i) => (
          <View
            key={`${plant.date}-${plant.prayer}-${i}`}
            style={[styles.plantPosition, { left: x, top: y }]}
          >
            <GardenPlantView plant={plant} delay={delay} />
          </View>
        ))}

        {/* Empty garden message */}
        {plants.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Waiting for your first reflection...
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    height: CANVAS_HEIGHT,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  soilStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    opacity: 0.6,
  },
  plantPosition: {
    position: 'absolute',
  },
  emptyOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: theme.typography.fontSize['5xl'] + 16,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
  },
});

export default React.memo(GardenCanvas);

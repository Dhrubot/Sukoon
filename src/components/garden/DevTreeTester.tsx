// src/components/garden/DevTreeTester.tsx
//
// DEV-ONLY: Renders TubaTreeCanvas with dummy data for each tree stage.
// Provides buttons to cycle through seedling → sapling → growing → flourishing → ancient.
// Writes matching TreeGrowthState to MMKV so the canvas picks it up correctly.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GardenPlant } from '../../types/garden';
import { TreeStage } from '../../types/tubaTree';
import { TreeGrowthState, TREE_GROWTH_STATE_VERSION } from '../../types/treeGrowthState';
import { PrayerName } from '../../types';
import { computeG, computeStage } from '../../constants/tubaTree';
import TreeGrowthStateService from '../../services/TreeGrowthStateService';
import TubaTreeCanvas from './TubaTreeCanvas';

// ─── Stage presets ──────────────────────────────────────────────────
// Each preset defines the total reflections to simulate for that stage.
// Leaves are distributed across 5 prayers with varied moods.

interface StagePreset {
  stage: TreeStage;
  label: string;
  totalReflections: number;
  emoji: string;
}

const STAGE_PRESETS: StagePreset[] = [
  { stage: 'seedling',    label: 'Seedling',    totalReflections: 8,    emoji: '🌱' },
  { stage: 'sapling',     label: 'Sapling',     totalReflections: 45,   emoji: '🌿' },
  { stage: 'growing',     label: 'Growing',     totalReflections: 160,  emoji: '🌳' },
  { stage: 'flourishing', label: 'Flourishing', totalReflections: 500,  emoji: '🌸' },
  { stage: 'ancient',     label: 'Ancient',     totalReflections: 1100, emoji: '🏛️' },
];

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function generateDummyPlants(totalReflections: number): GardenPlant[] {
  const plants: GardenPlant[] = [];
  const today = new Date();

  for (let i = 0; i < totalReflections; i++) {
    const prayer = PRAYERS[i % 5];
    const dayOffset = Math.floor(i / 5);
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    // Vary moods: mix of 2, 3, 4, 5 for visual diversity
    const moodPattern = [3, 4, 3, 5, 2, 3, 4, 3, 3, 5];
    const mood = moodPattern[i % moodPattern.length];

    const growthStage = mood <= 2 ? 'seed' : mood === 3 ? 'sprout' : 'bloom';

    plants.push({
      prayer,
      date: dateStr,
      growthStage,
      mood,
      hasText: mood >= 4,
      emoji: growthStage === 'bloom' ? '🌸' : growthStage === 'sprout' ? '🌿' : '🌱',
    });
  }

  return plants;
}

function buildGrowthState(totalReflections: number): TreeGrowthState {
  const perBranch = Math.floor(totalReflections / 5);
  const remainder = totalReflections % 5;

  const branchLifetimeLeaves: Record<PrayerName, number> = {
    Fajr: perBranch + (remainder > 0 ? 1 : 0),
    Dhuhr: perBranch + (remainder > 1 ? 1 : 0),
    Asr: perBranch + (remainder > 2 ? 1 : 0),
    Maghrib: perBranch + (remainder > 3 ? 1 : 0),
    Isha: perBranch,
  };

  return {
    version: TREE_GROWTH_STATE_VERSION,
    totalLifetimeReflections: totalReflections,
    g: computeG(totalReflections),
    stage: computeStage(totalReflections),
    branchLifetimeLeaves,
    lifetimeBlooms: Math.floor(totalReflections * 0.3),
    firstReflectionDate: '2025-01-01',
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Component ──────────────────────────────────────────────────────

interface DevTreeTesterProps {
  onClose: () => void;
}

const DevTreeTester: React.FC<DevTreeTesterProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const activeStageColor = theme.mode === 'light' ? '#98d5c7' : '#2eaaa1';

  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [plants, setPlants] = useState<GardenPlant[]>(() => {
    const preset = STAGE_PRESETS[0];
    const state = buildGrowthState(preset.totalReflections);
    TreeGrowthStateService.devSetState(state);
    return generateDummyPlants(preset.totalReflections);
  });

  const selectStage = useCallback((index: number) => {
    const preset = STAGE_PRESETS[index];
    const state = buildGrowthState(preset.totalReflections);
    TreeGrowthStateService.devSetState(state);
    setPlants(generateDummyPlants(preset.totalReflections));
    setActivePresetIndex(index);
  }, []);

  const handleClose = useCallback(() => {
    TreeGrowthStateService.devReset();
    onClose();
  }, [onClose]);

  const activePreset = STAGE_PRESETS[activePresetIndex];
  const g = computeG(activePreset.totalReflections);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Tree Stage Tester</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>
            {activePreset.emoji} {activePreset.label} — {activePreset.totalReflections} reflections — g={g.toFixed(3)}
          </Text>
        </View>

        {/* Stage buttons */}
        <View style={styles.buttonRow}>
          {STAGE_PRESETS.map((preset, index) => (
            <TouchableOpacity
              key={preset.stage}
              style={[
                styles.stageButton,
                index === activePresetIndex && {
                  backgroundColor: activeStageColor,
                  borderColor: activeStageColor,
                },
              ]}
              onPress={() => selectStage(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.stageEmoji}>{preset.emoji}</Text>
              <Text
                style={[
                  styles.stageLabel,
                  index === activePresetIndex && { color: theme.colors.primary.contrast },
                ]}
              >
                {preset.label}
              </Text>
              <Text
                style={[
                  styles.stageCount,
                  index === activePresetIndex && { color: theme.colors.primary.contrast, opacity: 0.7 },
                ]}
              >
                {preset.totalReflections}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tree canvas */}
        <TubaTreeCanvas
          plants={plants}
          isRamadan={false}
          ramadanDay={null}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    title: {
      fontSize: 18,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
    },
    closeBtnText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    infoBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    infoText: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    stageButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 10,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
    },
    stageEmoji: {
      fontSize: 18,
      marginBottom: 2,
    },
    stageLabel: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    stageCount: {
      fontSize: 9,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      marginTop: 1,
    },
  });

export default DevTreeTester;

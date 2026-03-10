// src/screens/Tasbih/TasbihScreen.tsx
//
// Standalone Tasbih (dhikr counter) — full-screen, distraction-free.
// Configurable dhikr presets with target counts and haptic feedback.

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { withAlpha } from '../../utils/color';

interface TasbihPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  defaultTarget: number;
}

const TASBIH_PRESETS: TasbihPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    translation: 'Glory be to Allah',
    defaultTarget: 33,
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    translation: 'All praise is due to Allah',
    defaultTarget: 33,
  },
  {
    id: 'allahu-akbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    translation: 'Allah is the Greatest',
    defaultTarget: 33,
  },
  {
    id: 'la-ilaha-illallah',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illallah',
    translation: 'There is no god but Allah',
    defaultTarget: 100,
  },
  {
    id: 'subhanallah-wa-bihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhanAllahi wa bihamdihi',
    translation: 'Glory be to Allah and praise Him',
    defaultTarget: 100,
  },
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    translation: 'I seek forgiveness from Allah',
    defaultTarget: 100,
  },
  {
    id: 'hawqala',
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    translation: 'There is no power nor strength except with Allah',
    defaultTarget: 100,
  },
];

const TARGET_OPTIONS = [33, 99, 100, 500, 1000];

const TasbihScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();

  const [selectedPreset, setSelectedPreset] = useState<TasbihPreset>(TASBIH_PRESETS[0]);
  const [target, setTarget] = useState(TASBIH_PRESETS[0].defaultTarget);
  const [count, setCount] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [loopMode, setLoopMode] = useState(false);
  const countRef = useRef(0);

  const progress = target > 0 ? Math.min(count / target, 1) : 0;
  const isComplete = count >= target;

  const handleTap = useCallback(() => {
    if (isComplete && !loopMode) return;

    if (isComplete && loopMode) {
      // Reset for next loop
      countRef.current = 0;
      setCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    countRef.current += 1;
    const next = countRef.current;
    setCount(next);
    setSessionTotal((s) => s + 1);

    // Milestone haptics
    if (next >= target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (next % 33 === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isComplete, loopMode, target]);

  const handleReset = useCallback(() => {
    countRef.current = 0;
    setCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleSelectPreset = useCallback((preset: TasbihPreset) => {
    setSelectedPreset(preset);
    setTarget(preset.defaultTarget);
    countRef.current = 0;
    setCount(0);
    setSessionTotal(0);
    setShowPresets(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSelectTarget = useCallback((t: number) => {
    setTarget(t);
    countRef.current = 0;
    setCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (showPresets) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.presetsScroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.presetsTitle}>Choose Dhikr</Text>
          {TASBIH_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetCard,
                preset.id === selectedPreset.id && styles.presetCardActive,
              ]}
              onPress={() => handleSelectPreset(preset)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetArabic}>{preset.arabic}</Text>
              <Text style={styles.presetTransliteration}>
                {preset.transliteration}
              </Text>
              <Text style={styles.presetTranslation}>{preset.translation}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Dhikr selector button */}
      <TouchableOpacity
        style={styles.dhikrSelector}
        onPress={() => setShowPresets(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dhikrSelectorText}>
          {selectedPreset.transliteration}
        </Text>
        <Text style={styles.chevron}>{'>'}</Text>
      </TouchableOpacity>

      {/* Target selector */}
      <View style={styles.targetRow}>
        {TARGET_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.targetPill,
              t === target && styles.targetPillActive,
            ]}
            onPress={() => handleSelectTarget(t)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.targetPillText,
                t === target && styles.targetPillTextActive,
              ]}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main tap area */}
      <TouchableOpacity
        style={styles.tapArea}
        onPress={handleTap}
        activeOpacity={0.9}
      >
        {/* Progress ring background */}
        <View style={styles.progressRingOuter}>
          <View
            style={[
              styles.progressRingFill,
              {
                height: `${progress * 100}%`,
                backgroundColor: isComplete
                  ? theme.colors.primary.DEFAULT
                  : withAlpha(theme.colors.primary.DEFAULT, 0.25),
              },
            ]}
          />
        </View>

        {/* Arabic text */}
        <Text style={styles.arabicText}>{selectedPreset.arabic}</Text>

        {/* Count display */}
        <Text style={styles.countText}>{count}</Text>
        <Text style={styles.targetText}>/ {target}</Text>

        {isComplete && !loopMode && (
          <Text style={styles.completeHint}>Target reached</Text>
        )}
        {isComplete && loopMode && (
          <Text style={styles.completeHint}>Tap to continue</Text>
        )}
      </TouchableOpacity>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              loopMode && styles.controlButtonActive,
            ]}
            onPress={() => setLoopMode((l) => !l)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.controlButtonText,
                loopMode && styles.controlButtonTextActive,
              ]}
            >
              Loop
            </Text>
          </TouchableOpacity>
        </View>

        {sessionTotal > target && (
          <Text style={styles.sessionTotal}>
            Session total: {sessionTotal}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    // Dhikr selector
    dhikrSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    dhikrSelectorText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.primary.DEFAULT,
    },
    chevron: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary.DEFAULT,
    },
    // Target selector
    targetRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing.md,
    },
    targetPill: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    targetPillActive: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    targetPillText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
    },
    targetPillTextActive: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    // Main tap area
    tapArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['3xl'],
      position: 'relative',
      overflow: 'hidden',
    },
    progressRingOuter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      justifyContent: 'flex-end',
    },
    progressRingFill: {
      width: '100%',
      borderTopLeftRadius: theme.borderRadius.lg,
      borderTopRightRadius: theme.borderRadius.lg,
    },
    arabicText: {
      fontSize: theme.typography.fontSize['5xl'] + 4,
      color: theme.colors.text.primary,
      textAlign: 'center',
      lineHeight: 56,
      marginBottom: theme.spacing['2xl'],
      fontFamily: theme.typography.fontFamily.arabic,
      zIndex: 1,
    },
    countText: {
      fontSize: 72,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.primary,
      textAlign: 'center',
      zIndex: 1,
    },
    targetText: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      zIndex: 1,
    },
    completeHint: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.primary.DEFAULT,
      marginTop: theme.spacing.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      zIndex: 1,
    },
    // Bottom controls
    bottomControls: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    controlsRow: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
    },
    controlButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      backgroundColor: theme.colors.card.background,
    },
    controlButtonActive: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    controlButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
    },
    controlButtonTextActive: {
      color: '#FFFFFF',
    },
    sessionTotal: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      marginTop: theme.spacing.md,
    },
    // Presets screen
    presetsScroll: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['4xl'],
    },
    presetsTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    presetCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      alignItems: 'center',
    },
    presetCardActive: {
      borderColor: theme.colors.primary.DEFAULT,
      borderWidth: 2,
    },
    presetArabic: {
      fontSize: theme.typography.fontSize['3xl'],
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.arabic,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    presetTransliteration: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    presetTranslation: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      fontStyle: 'italic',
    },
  });

export default TasbihScreen;

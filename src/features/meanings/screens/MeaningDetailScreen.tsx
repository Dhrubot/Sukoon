// MeaningDetailScreen — deep view of a single Meaning.
//
// Receives the meaning id via route params, looks it up via MeaningsService.
// Renders Arabic + transliteration + translation + reflection + source.
// If the meaning has word-by-word data (Fatihah in v1.1), the WordByWord
// component is rendered below the reflection.
//
// Audio button is a placeholder in Phase 3 — Phase 6 wires real playback.

import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import type { MenuStackParamList } from '../../../navigation/MenuStackNavigator';
import MeaningsService from '../services/MeaningsService';
import { WordByWord, MeaningAudioButton } from '../components';
import { MEANINGS_CONSTANTS } from '../constants';

const POSITION_LABELS: Record<string, string> = {
  opening: 'OPENING',
  standing: 'STANDING',
  transition: 'TRANSITION',
  ruku: 'RUKU',
  rising: 'RISING FROM RUKU',
  sujood: 'SUJOOD',
  between_sajdahs: 'BETWEEN SAJDAHS',
  sitting: 'SITTING',
  taslim: 'TASLIM',
};

type NavProp = StackNavigationProp<MenuStackParamList, 'MeaningDetail'>;
type RouteProps = RouteProp<MenuStackParamList, 'MeaningDetail'>;

const MeaningDetailScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { id } = route.params;

  const source = route.params.source ?? 'direct';
  const meaning = useMemo(() => MeaningsService.getById(id), [id]);
  const t = meaning?.translations[MEANINGS_CONSTANTS.DEFAULT_LANGUAGE]
    ?? meaning?.translations.en;

  // Dynamic header title based on the meaning's own title.
  useLayoutEffect(() => {
    if (meaning) {
      navigation.setOptions({ title: meaning.title });
    }
  }, [meaning, navigation]);

  // Record screen-open with the originating surface so analytics can
  // attribute engagement to Garden / Menu / direct.
  useEffect(() => {
    MeaningsService.recordScreenOpen(source);
  }, [source]);

  if (!meaning || !t) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>This reflection is not available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Position label */}
        <Text style={styles.positionLabel}>{POSITION_LABELS[meaning.position]}</Text>

        {/* Arabic — large, RTL, full poem-style formatting */}
        <Text style={styles.arabic}>{meaning.arabic}</Text>

        {/* Transliteration */}
        <Text style={styles.transliteration}>{meaning.transliteration}</Text>

        {/* Recommended reps badge */}
        {meaning.recommendedReps && meaning.recommendedReps > 1 ? (
          <View style={styles.repsRow}>
            <Text style={styles.repsBadge}>
              Recited {meaning.recommendedReps}×
            </Text>
          </View>
        ) : null}

        <MeaningAudioButton meaningId={meaning.id} />

        {/* Translation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TRANSLATION</Text>
          <Text style={styles.translation}>{t.translation}</Text>
        </View>

        {/* Reflection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REFLECTION</Text>
          <Text style={styles.reflection}>{t.reflection}</Text>
        </View>

        {/* Word-by-word (Fatihah only in v1.1) */}
        {meaning.wordByWord && meaning.wordByWord.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WORD BY WORD</Text>
            <WordByWord entries={meaning.wordByWord} />
          </View>
        ) : null}

        {/* Source citation */}
        <View style={styles.sourceWrap}>
          <Text style={styles.source}>
            Arabic: {meaning.source.arabicReference ?? meaning.source.arabic}
          </Text>
          <Text style={styles.source}>Translation: {meaning.source.translation}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing['2xl'],
    },
    positionLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.sectionLabel,
      letterSpacing: 1.4,
      marginBottom: theme.spacing.md,
    },
    arabic: {
      fontSize: 26,
      color: theme.colors.meanings.arabicText,
      textAlign: 'right',
      writingDirection: 'rtl',
      lineHeight: 48,
      marginBottom: theme.spacing.md,
    },
    transliteration: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.transliterationText,
      fontStyle: 'italic',
      lineHeight: 26,
      marginBottom: theme.spacing.md,
    },
    repsRow: { marginBottom: theme.spacing.lg },
    repsBadge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.meanings.chipBg,
      color: theme.colors.meanings.chipText,
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: 'hidden',
    },
    section: { marginTop: theme.spacing.xl },
    sectionLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.sectionLabel,
      letterSpacing: 1.4,
      marginBottom: theme.spacing.sm,
    },
    translation: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.translationText,
      lineHeight: 26,
    },
    reflection: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.reflectionText,
      lineHeight: 26,
    },
    sourceWrap: {
      marginTop: theme.spacing['2xl'],
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.meanings.rootDivider,
    },
    source: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.sourceText,
      lineHeight: 18,
      marginBottom: 2,
    },
    notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    notFoundText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default MeaningDetailScreen;

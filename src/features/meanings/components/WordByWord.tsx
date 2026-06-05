// WordByWord — interactive word-by-word breakdown.
//
// Renders the Arabic words in RTL order as tappable chips. Tapping a chip
// highlights it and displays its root + meaning + note in a card below.
// Used by MeaningDetailScreen for Fatihah only in v1.1.
//
// Three-theme aware via theme.colors.meanings.* tokens (chip and word-card
// surfaces have distinct tokens across dark / light / midnight).

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import type { WordByWordEntry } from '../content/schema';

export interface WordByWordProps {
  entries: WordByWordEntry[];
}

export const WordByWord: React.FC<WordByWordProps> = ({ entries }) => {
  const styles = useThemedStyles(createStyles);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const active = entries[activeIdx] ?? entries[0];

  if (!entries.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.helper}>
        Tap each word to see its root and meaning.
      </Text>

      {/* RTL-ordered word strip. flexDirection 'row-reverse' lays out
          words right-to-left while keeping the iteration order natural. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.wordStrip}
      >
        {entries.map((entry, idx) => {
          const isActive = idx === activeIdx;
          return (
            <TouchableOpacity
              key={entry.position}
              style={[styles.wordChip, isActive && styles.wordChipActive]}
              onPress={() => setActiveIdx(idx)}
              activeOpacity={0.7}
            >
              <Text style={[styles.wordArabic, isActive && styles.wordArabicActive]}>
                {entry.arabic}
              </Text>
              <Text style={[styles.wordIdx, isActive && styles.wordIdxActive]}>
                {entry.position}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail card for the selected word */}
      <View style={styles.detail}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailArabic}>{active.arabic}</Text>
          <Text style={styles.detailTransliteration}>{active.transliteration}</Text>
        </View>

        {active.root ? (
          <View style={styles.rootRow}>
            <Text style={styles.rootLabel}>ROOT</Text>
            <Text style={styles.rootValue}>{active.root}</Text>
            {active.rootMeaning ? (
              <Text style={styles.rootMeaning}> · {active.rootMeaning}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.meaningRow}>
          <Text style={styles.meaningLabel}>MEANING</Text>
          <Text style={styles.meaningValue}>{active.meaning}</Text>
        </View>

        {active.note ? (
          <View style={styles.noteRow}>
            <Text style={styles.noteValue}>{active.note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { marginTop: theme.spacing.md },
    helper: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      marginBottom: theme.spacing.md,
      fontStyle: 'italic',
    },
    wordStrip: {
      flexDirection: 'row-reverse',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
    },
    wordChip: {
      backgroundColor: theme.colors.meanings.wordCardBg,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.meanings.wordCardBorder,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginHorizontal: 4,
      alignItems: 'center',
      minWidth: 48,
    },
    wordChipActive: {
      backgroundColor: theme.colors.meanings.wordCardActiveBg,
      borderColor: theme.colors.meanings.arabicAccent,
    },
    wordArabic: {
      fontSize: 22,
      color: theme.colors.meanings.arabicText,
      textAlign: 'center',
      writingDirection: 'rtl',
      lineHeight: 30,
    },
    wordArabicActive: { color: theme.colors.meanings.arabicAccent },
    wordIdx: {
      fontSize: 10,
      color: theme.colors.text.muted,
      marginTop: 2,
    },
    wordIdxActive: { color: theme.colors.meanings.arabicAccent },
    detail: {
      marginTop: theme.spacing.lg,
      backgroundColor: theme.colors.meanings.wordCardBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.meanings.wordCardBorder,
      padding: theme.spacing.lg,
    },
    detailHeader: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.meanings.rootDivider,
    },
    detailArabic: {
      fontSize: 30,
      color: theme.colors.meanings.arabicAccent,
      writingDirection: 'rtl',
      lineHeight: 44,
    },
    detailTransliteration: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.transliterationText,
      marginTop: 4,
      fontStyle: 'italic',
    },
    rootRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      marginBottom: theme.spacing.md,
    },
    rootLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.sectionLabel,
      letterSpacing: 1.2,
      marginRight: theme.spacing.sm,
    },
    rootValue: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.meanings.wordRootText,
      writingDirection: 'rtl',
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    rootMeaning: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.translationText,
    },
    meaningRow: { marginBottom: theme.spacing.md },
    meaningLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.sectionLabel,
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    meaningValue: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.translationText,
      lineHeight: 22,
    },
    noteRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.meanings.rootDivider,
      paddingTop: theme.spacing.md,
    },
    noteValue: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.reflectionText,
      lineHeight: 22,
      fontStyle: 'italic',
    },
  });

export default WordByWord;

// MeaningCard — the chameleon component.
//
// Same data, three visual densities. Consumers (Reflection Garden, Menu row,
// browse list) mount the same component with a different `variant` prop and
// receive zero feature-internal logic — keeping decoupling intact.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import { MEANINGS_CONSTANTS } from '../constants';
import type { LanguageCode, Meaning } from '../content/schema';

export type MeaningCardVariant = 'compact' | 'daily';

export interface MeaningCardProps {
  meaning: Meaning;
  variant?: MeaningCardVariant;
  language?: LanguageCode;
  onPress?: () => void;
}

export const MeaningCard: React.FC<MeaningCardProps> = ({
  meaning,
  variant = 'compact',
  language = MEANINGS_CONSTANTS.DEFAULT_LANGUAGE,
  onPress,
}) => {
  const styles = useThemedStyles(createStyles);
  const t = meaning.translations[language] ?? meaning.translations.en;
  const firstArabicLine = meaning.arabic.split('\n')[0];

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactBody}>
          <Text style={styles.compactTitle}>{meaning.title}</Text>
          <Text style={styles.compactArabic} numberOfLines={1}>
            {firstArabicLine}
          </Text>
          {t ? (
            <Text style={styles.compactTranslation} numberOfLines={2}>
              {t.translation.split('. ')[0]}
              {t.translation.includes('. ') ? '.' : ''}
            </Text>
          ) : null}
        </View>
        <Text style={styles.compactChevron}>›</Text>
      </TouchableOpacity>
    );
  }

  // daily variant — used in Reflection Garden today and the Menu row tomorrow.
  return (
    <TouchableOpacity style={styles.dailyCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.dailyHeader}>
        <Text style={styles.dailyLabel}>TODAY'S REFLECTION</Text>
        <Text style={styles.dailyTitle}>{meaning.title}</Text>
      </View>
      <Text style={styles.dailyArabic} numberOfLines={2}>
        {firstArabicLine}
      </Text>
      {t ? (
        <Text style={styles.dailyReflection} numberOfLines={3}>
          {t.reflection}
        </Text>
      ) : null}
      <Text style={styles.dailyCta}>Read more →</Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // ─── compact ───────────────────────────────────────────────────────
    compactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.meanings.cardBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.meanings.cardBorder,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      marginHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
    },
    compactBody: { flex: 1 },
    compactTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: 6,
    },
    compactArabic: {
      fontSize: 20,
      color: theme.colors.meanings.arabicText,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: 6,
      lineHeight: 32,
    },
    compactTranslation: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.translationText,
      lineHeight: 20,
    },
    compactChevron: {
      fontSize: 24,
      color: theme.colors.text.muted,
      marginLeft: theme.spacing.sm,
    },
    // ─── daily ─────────────────────────────────────────────────────────
    dailyCard: {
      backgroundColor: theme.colors.meanings.cardBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.meanings.cardBorder,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.xl,
      marginVertical: theme.spacing.md,
    },
    dailyHeader: { marginBottom: theme.spacing.md },
    dailyLabel: {
      fontSize: theme.typography.fontSize.xs - 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.sectionLabel,
      letterSpacing: 1.4,
      marginBottom: 4,
    },
    dailyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    dailyArabic: {
      fontSize: 24,
      color: theme.colors.meanings.arabicText,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: theme.spacing.md,
      lineHeight: 40,
    },
    dailyReflection: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.reflectionText,
      lineHeight: 22,
      marginBottom: theme.spacing.sm,
    },
    dailyCta: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.reflectionAccent,
    },
  });

export default MeaningCard;

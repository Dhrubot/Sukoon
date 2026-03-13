import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface OnboardingScaffoldProps {
  progress: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  align?: 'center' | 'start';
  titleVariant?: 'hero' | 'section';
  footer: ReactNode;
  children?: ReactNode;
  scrollable?: boolean;
}

export const OnboardingScaffold: React.FC<OnboardingScaffoldProps> = ({
  progress,
  eyebrow,
  title,
  subtitle,
  description,
  align = 'start',
  titleVariant = 'section',
  footer,
  children,
  scrollable = true,
}) => {
  const styles = useThemedStyles(createStyles);

  const body = (
    <View
      style={[
        styles.bodyContent,
        align === 'center' ? styles.bodyContentCentered : styles.bodyContentStart,
      ]}
    >
      <View style={styles.header}>
        {eyebrow ? (
          <Text
            style={[
              styles.eyebrow,
              align === 'center' ? styles.textCenter : styles.textStart,
            ]}
          >
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={[
            styles.title,
            titleVariant === 'hero' ? styles.titleHero : styles.titleSection,
            align === 'center' ? styles.textCenter : styles.textStart,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, align === 'center' ? styles.textCenter : styles.textStart]}>
            {subtitle}
          </Text>
        ) : null}
        {description ? (
          <Text style={[styles.description, align === 'center' ? styles.textCenter : styles.textStart]}>
            {description}
          </Text>
        ) : null}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <View style={styles.body}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </View>

      <View style={styles.footer}>{footer}</View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    progressContainer: {
      paddingHorizontal: theme.spacing['4xl'],
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.onboarding.progressBg,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: 2,
    },
    body: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    bodyContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing['4xl'],
      paddingTop: theme.spacing.lg,
    },
    bodyContentCentered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    bodyContentStart: {
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    header: {
      width: '100%',
    },
    eyebrow: {
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 0.6,
    },
    title: {
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    titleHero: {
      fontSize: theme.typography.fontSize['4xl'],
      fontFamily: theme.typography.fontFamily.heading,
    },
    titleSection: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textSubtle,
      lineHeight: 25,
    },
    description: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      lineHeight: 22,
    },
    content: {
      width: '100%',
      marginTop: theme.spacing['2xl'],
      gap: theme.spacing.lg,
    },
    footer: {
      paddingHorizontal: theme.spacing['4xl'],
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['3xl'],
      gap: theme.spacing.md,
    },
    textCenter: {
      textAlign: 'center',
    },
    textStart: {
      textAlign: 'left',
    },
  });

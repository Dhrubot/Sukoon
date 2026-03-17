// src/screens/ReflectionGarden/TubaTreeInfoScreen.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { withAlpha } from '../../utils/color';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const TubaTreeInfoScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const prayerColors = [
    theme.colors.prayer?.fajr || '#7986CB',
    theme.colors.prayer?.dhuhr || '#FFD54F',
    theme.colors.prayer?.asr || '#FFB74D',
    theme.colors.prayer?.maghrib || '#CE93D8',
    theme.colors.prayer?.isha || '#5C6BC0',
  ];

  const dawamColor =
    theme.colors.garden?.dawamPillText || theme.colors.primary.DEFAULT;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Tuba Tree</Text>
          <Text style={[styles.heroArabic, { color: dawamColor }]}>طُوبَىٰ</Text>
          <Text style={styles.heroSubtitle}>
            Every prayer with presence leaves a trace.{'\n'}
            Every day of return deepens the roots.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Tuba?</Text>
          <Text style={styles.bodyText}>
            In Islamic tradition, Tuba (طوبى) is a tree in Jannah mentioned by the
            Prophet ﷺ. A rider could travel for a hundred years in its shade and
            never leave it. Its branches extend over the walls of Paradise, and
            from it flow rivers of honey, milk, and pure water.
          </Text>
          <View
            style={[
              styles.quoteCard,
              {
                borderColor: withAlpha(theme.colors.interactive.active, 0.19),
              },
            ]}
          >
            <Text
              style={[
                styles.quoteText,
                { color: theme.colors.text.secondary },
              ]}
            >
              "Tuba is a tree in Paradise. Its extent is a journey of a hundred
              years. The garments of the people of Paradise emerge from its
              sheaths."
            </Text>
            <Text
              style={[styles.quoteSource, { color: theme.colors.text.muted }]}
            >
              - Narrated by Ibn Hibban
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Your Tuba Tree in Sukoon is a private metaphor for prayer and return.
            It is not a score. It becomes fuller through sincere reflection,
            quiet honesty, and showing up again.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Your Tree Grows</Text>

          {[
            {
              n: '1',
              title: 'Pray with reflection',
              body: 'During any prayer, complete the mindfulness flow, breathe, reflect, and leave a quiet note. That moment nourishes a leaf on your tree.',
            },
            {
              n: '2',
              title: 'Each prayer returns to its branch',
              body: 'The tree has 5 branches, one for each fard prayer. Your Fajr reflections nourish the Fajr branch, Dhuhr the Dhuhr branch, and so on.',
            },
            {
              n: '3',
              title: 'Each prayer nourishes a leaf',
              body: 'All leaves belong to the same tree family. The tree is not trying to rank your worship, only to preserve a quiet trace that you returned.',
            },
            {
              n: '4',
              title: 'Consistency deepens the tree',
              body: 'Your dawam (دوام), returning again and again, makes the canopy fuller and the roots steadier over time. Breaks do not erase the tree.',
            },
          ].map((step) => (
            <View key={step.n} style={styles.growthStep}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: theme.colors.interactive.active },
                ]}
              >
                <Text style={styles.stepNumber}>{step.n}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Branches</Text>
          <Text style={styles.bodyText}>
            Each of the 5 branches represents a fard prayer. The color flows
            from the trunk&apos;s earthy brown into the prayer&apos;s signature
            color.
          </Text>
          <View style={styles.branchColorList}>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer, i) => (
              <View key={prayer} style={styles.branchColorItem}>
                <View
                  style={[
                    styles.branchColorDot,
                    { backgroundColor: prayerColors[i] },
                  ]}
                />
                <Text
                  style={[
                    styles.branchColorName,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {prayer}
                </Text>
                <View
                  style={[
                    styles.branchColorBar,
                    { backgroundColor: withAlpha(prayerColors[i], 0.15) },
                  ]}
                >
                  <View
                    style={[
                      styles.branchColorFill,
                      { backgroundColor: prayerColors[i], width: `${40 + i * 12}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ramadan Mode 🌙</Text>
          <Text style={styles.bodyText}>
            During the blessed month, your tree transforms. Branch colors shift
            toward gold, extra stars fill the night sky, and the crescent moon
            gains a warm halo. The stage label shows which day of Ramadan
            you&apos;re on.
          </Text>
          <Text style={styles.bodyText}>
            This happens automatically, no settings to change. Your tree feels
            the baraka of the month just as you do.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Read Your Leaves</Text>
          <Text style={styles.bodyText}>
            Tap any leaf on your tree to see its details, which prayer it came
            from, when you prayed, your mood level, and whether you wrote a
            reflection. Each leaf is a private trace of a moment you turned back
            to Allah.
          </Text>
        </View>

        <View
          style={[
            styles.closingCard,
            {
              backgroundColor: theme.colors.card.background,
              borderColor: theme.colors.border.secondary,
            },
          ]}
        >
          <Text style={[styles.closingArabic, { color: dawamColor }]}>
            طُوبَىٰ لَهُمْ وَحُسْنُ مَآبٍ
          </Text>
          <Text
            style={[
              styles.closingTranslation,
              { color: theme.colors.text.secondary },
            ]}
          >
            "Tuba (blessedness) is for them, and a beautiful place of return."
          </Text>
          <Text style={[styles.closingRef, { color: theme.colors.text.muted }]}>
            - Quran 13:29
          </Text>
        </View>

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

    hero: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
    },
    heroTitle: {
      fontSize: 28,
      fontFamily: theme.typography.fontFamily.headingRegular,
      fontWeight: '300',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    heroArabic: {
      fontSize: 36,
      fontFamily:
        Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
      marginBottom: theme.spacing.md,
    },
    heroSubtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      lineHeight: 22,
      fontStyle: 'italic',
    },

    section: {
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing['2xl'],
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    bodyText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 23,
      marginBottom: theme.spacing.md,
    },

    quoteCard: {
      borderLeftWidth: 3,
      paddingLeft: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginVertical: theme.spacing.md,
    },
    quoteText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    quoteSource: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: theme.spacing.xs,
    },

    growthStep: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    stepNumber: {
      fontSize: 13,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: '#fff',
    },
    stepContent: { flex: 1 },
    stepTitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    stepBody: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 21,
    },

    branchColorList: { gap: 10 },
    branchColorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    branchColorDot: { width: 12, height: 12, borderRadius: 6 },
    branchColorName: {
      width: 60,
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    branchColorBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    branchColorFill: { height: '100%', borderRadius: 3 },

    closingCard: {
      marginHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing['2xl'],
      paddingHorizontal: theme.spacing.xl,
    },
    closingArabic: {
      fontSize: 26,
      fontFamily:
        Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    closingTranslation: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      textAlign: 'center',
      lineHeight: 22,
    },
    closingRef: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: theme.spacing.xs,
    },
  });

export default TubaTreeInfoScreen;

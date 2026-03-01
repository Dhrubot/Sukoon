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
import Svg, { Path, Ellipse, Circle, G, Line } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { STAGE_THRESHOLDS, STAGE_INFO } from '../../constants/tubaTree';

// ─── Stage illustration configs ────────────────────────────────────
// Each stage gets a mini SVG showing the tree at that point.

const STAGE_VISUALS = [
  {
    key: 'seedling',
    leafCount: 2,
    branchScale: 0.3,
    trunkHeight: 25,
    trunkWidth: 2.5,
    description: 'Your journey begins. A thin stem pushes upward with your first few reflections. Even one prayer with presence plants a seed.',
    hadith: '"The parable of the one who remembers his Lord and the one who does not is like the living and the dead." — Bukhari',
  },
  {
    key: 'sapling',
    leafCount: 6,
    branchScale: 0.55,
    trunkHeight: 32,
    trunkWidth: 3.5,
    description: 'Branches begin to reach outward. Each prayer adds a leaf — its color matching the prayer time. Your consistency is taking shape.',
    hadith: '"Take up good deeds only as much as you are able, for the best deeds are those done regularly even if they are few." — Ibn Majah',
  },
  {
    key: 'growing',
    leafCount: 12,
    branchScale: 0.75,
    trunkHeight: 38,
    trunkWidth: 4.5,
    description: 'The canopy fills in. Gold blooms appear when you pray with deep focus (mood 4-5). Your roots of dawam (consistency) are deepening.',
    hadith: '"The most beloved deed to Allah is the most regular and constant even if it were little." — Bukhari',
  },
  {
    key: 'flourishing',
    leafCount: 20,
    branchScale: 0.9,
    trunkHeight: 42,
    trunkWidth: 5.5,
    description: 'Sub-branches fork from the main limbs, a sign of spiritual depth. The tree begins to resemble the Tuba Tree of Jannah — ever-growing, never wilting.',
    hadith: '"In Paradise there is a tree in whose shade a rider could travel for a hundred years and not leave it." — Bukhari',
    hasSubBranches: true,
  },
  {
    key: 'ancient',
    leafCount: 30,
    branchScale: 1.0,
    trunkHeight: 46,
    trunkWidth: 6.5,
    description: 'A magnificent tree with a full canopy, multiple sub-branches, and abundant blooms. This is the fruit of sustained devotion — your dawam made visible.',
    hadith: '"SubhanAllah, wal-hamdulillah, wa la ilaha illAllah, wa Allahu Akbar — each plants a tree for you in Paradise." — Tirmidhi',
    hasSubBranches: true,
  },
];

// ─── Mini Tree SVG ─────────────────────────────────────────────────

interface MiniStageTreeProps {
  stage: typeof STAGE_VISUALS[number];
  prayerColors: string[];
  trunkColor: string;
  bloomColor: string;
}

const MiniStageTree: React.FC<MiniStageTreeProps> = ({
  stage,
  prayerColors,
  trunkColor,
  bloomColor,
}) => {
  const viewW = 120;
  const viewH = 100;
  const cx = viewW / 2;
  const groundY = viewH - 8;
  const topY = groundY - stage.trunkHeight;

  // Branch endpoints — simplified 5-point spread
  const branchAngles = [-65, -35, 0, 35, 65];
  const branchLength = 22 * stage.branchScale;

  return (
    <Svg width={120} height={100} viewBox={`0 0 ${viewW} ${viewH}`}>
      {/* Ground line */}
      <Line
        x1={cx - 30}
        y1={groundY}
        x2={cx + 30}
        y2={groundY}
        stroke={trunkColor}
        strokeWidth={1.5}
        opacity={0.25}
        strokeLinecap="round"
      />

      {/* Roots */}
      <Path
        d={`M ${cx} ${groundY} Q ${cx - 8} ${groundY + 3} ${cx - 16} ${groundY + 1}`}
        stroke={trunkColor}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.4}
      />
      <Path
        d={`M ${cx} ${groundY} Q ${cx + 8} ${groundY + 3} ${cx + 16} ${groundY + 1}`}
        stroke={trunkColor}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.4}
      />

      {/* Trunk */}
      <Path
        d={`M ${cx} ${groundY} Q ${cx} ${(groundY + topY) / 2} ${cx} ${topY}`}
        stroke={trunkColor}
        strokeWidth={stage.trunkWidth}
        fill="none"
        strokeLinecap="round"
      />

      {/* Branches */}
      {branchAngles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const endX = cx + Math.sin(rad) * branchLength;
        const endY = topY - Math.cos(rad) * branchLength * 0.6;
        const ctrlX = cx + Math.sin(rad) * branchLength * 0.5;
        const ctrlY = topY - Math.cos(rad) * branchLength * 0.3;
        const color = prayerColors[i % prayerColors.length];

        return (
          <G key={`branch-${i}`}>
            <Path
              d={`M ${cx} ${topY + 4} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
              stroke={color}
              strokeWidth={Math.max(1.5, stage.trunkWidth * 0.5)}
              fill="none"
              strokeLinecap="round"
              opacity={i < stage.leafCount / 4 ? 0.8 : 0.3}
            />

            {/* Sub-branches (flourishing+) */}
            {stage.hasSubBranches && i < 3 && (
              <Path
                d={`M ${(cx + endX) / 2 + 2} ${(topY + 4 + endY) / 2} Q ${endX + Math.sin(rad) * 6} ${endY - 4} ${endX + Math.sin(rad) * 12} ${endY - 2}`}
                stroke={color}
                strokeWidth={1}
                fill="none"
                strokeLinecap="round"
                opacity={0.5}
              />
            )}

            {/* Leaves on this branch */}
            {Array.from({ length: Math.min(Math.ceil(stage.leafCount / 5), 6) }).map((_, li) => {
              const t = (li + 1) / (Math.ceil(stage.leafCount / 5) + 1);
              const lx = cx + (endX - cx) * t + (li % 2 === 0 ? 3 : -3);
              const ly = (topY + 4) + (endY - topY - 4) * t + (li % 2 === 0 ? -2 : 2);
              const isBloom = li === Math.ceil(stage.leafCount / 5) - 1 && stage.leafCount > 8;

              return (
                <G key={`leaf-${i}-${li}`}>
                  <Ellipse
                    cx={lx}
                    cy={ly}
                    rx={2.5 + stage.branchScale}
                    ry={3.5 + stage.branchScale}
                    fill={color}
                    opacity={0.7}
                  />
                  {isBloom && (
                    <Circle
                      cx={lx - 1}
                      cy={ly - 1}
                      r={1.5}
                      fill={bloomColor}
                      opacity={0.8}
                    />
                  )}
                </G>
              );
            })}
          </G>
        );
      })}
    </Svg>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────

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

  const trunkColor = theme.colors.garden?.trunk || '#5c4535';
  const bloomColor = theme.colors.garden?.bloomGlow || '#D4AF37';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* Hero section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Your Tuba Tree</Text>
          <Text style={styles.heroArabic}>طُوبَىٰ</Text>
          <Text style={styles.heroSubtitle}>
            Every prayer with presence plants a leaf.{'\n'}
            Every day of consistency deepens the roots.
          </Text>
        </View>

        {/* What is the Tuba Tree */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Tuba?</Text>
          <Text style={styles.bodyText}>
            In Islamic tradition, Tuba (طوبى) is a tree in Jannah (Paradise) mentioned
            by the Prophet ﷺ. It is said that a rider could travel for a hundred years
            in its shade and never leave it. Its branches extend over the walls of Paradise,
            and from it flow rivers of honey, milk, and pure water.
          </Text>
          <View style={[styles.quoteCard, { borderColor: theme.colors.interactive.active + '30' }]}>
            <Text style={[styles.quoteText, { color: theme.colors.text.secondary }]}>
              "Tuba is a tree in Paradise. Its extent is a journey of a hundred years.
              The garments of the people of Paradise emerge from its sheaths."
            </Text>
            <Text style={[styles.quoteSource, { color: theme.colors.text.muted }]}>
              — Narrated by Ibn Hibban
            </Text>
          </View>
          <Text style={styles.bodyText}>
            Your Tuba Tree in Sukoon is a living mirror of your spiritual practice.
            It grows only through genuine reflection — not just marking prayers complete,
            but pausing to breathe, to feel, to connect.
          </Text>
        </View>

        {/* How it grows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Your Tree Grows</Text>

          <View style={styles.growthStep}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.interactive.active }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Pray with reflection</Text>
              <Text style={styles.stepBody}>
                During any prayer, complete the mindfulness flow — breathe, reflect,
                and rate your focus. This creates a leaf on your tree.
              </Text>
            </View>
          </View>

          <View style={styles.growthStep}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.interactive.active }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Each leaf finds its branch</Text>
              <Text style={styles.stepBody}>
                The tree has 5 branches — one for each fard prayer. Your Fajr reflections
                grow on the Fajr branch, Dhuhr on the Dhuhr branch, and so on. Each
                branch is colored to match its prayer time.
              </Text>
            </View>
          </View>

          <View style={styles.growthStep}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.interactive.active }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Focus determines leaf size</Text>
              <Text style={styles.stepBody}>
                Your mood after prayer shapes the leaf. Low focus (1-2) creates small
                seed-leaves. Present focus (3) grows sprout-leaves. Deep khushoo (4-5)
                produces large bloom-leaves with a gold sparkle.
              </Text>
            </View>
          </View>

          <View style={styles.growthStep}>
            <View style={[styles.stepDot, { backgroundColor: theme.colors.interactive.active }]}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Consistency deepens roots</Text>
              <Text style={styles.stepBody}>
                Your dawam (دوام) — consecutive days of reflection — thickens the trunk
                and advances the tree through growth stages. Breaks don't destroy the
                tree, but dawam makes it stronger.
              </Text>
            </View>
          </View>
        </View>

        {/* Leaf types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaf Types</Text>
          <View style={styles.leafTypeRow}>
            {[
              { stage: 'Seed', mood: '1-2', desc: 'Small, translucent', icon: '🌱' },
              { stage: 'Sprout', mood: '3', desc: 'Medium, vivid', icon: '🌿' },
              { stage: 'Bloom', mood: '4-5', desc: 'Large + gold sparkle', icon: '✦' },
            ].map((lt) => (
              <View
                key={lt.stage}
                style={[styles.leafTypeCard, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.secondary }]}
              >
                <Text style={styles.leafTypeIcon}>{lt.icon}</Text>
                <Text style={[styles.leafTypeName, { color: theme.colors.text.primary }]}>
                  {lt.stage}
                </Text>
                <Text style={[styles.leafTypeMood, { color: theme.colors.interactive.active }]}>
                  Focus {lt.mood}
                </Text>
                <Text style={[styles.leafTypeDesc, { color: theme.colors.text.muted }]}>
                  {lt.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Branch colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Branches</Text>
          <Text style={styles.bodyText}>
            Each of the 5 branches represents a fard prayer. The color flows from
            the trunk's earthy brown into the prayer's signature color.
          </Text>
          <View style={styles.branchColorList}>
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer, i) => (
              <View key={prayer} style={styles.branchColorItem}>
                <View style={[styles.branchColorDot, { backgroundColor: prayerColors[i] }]} />
                <Text style={[styles.branchColorName, { color: theme.colors.text.primary }]}>
                  {prayer}
                </Text>
                <View style={[styles.branchColorBar, { backgroundColor: prayerColors[i] + '25' }]}>
                  <View style={[styles.branchColorFill, { backgroundColor: prayerColors[i], width: `${40 + i * 12}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Growth stages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Growth Stages</Text>
          <Text style={styles.bodyText}>
            As your total reflections increase, the tree advances through five stages.
            Each stage changes the trunk thickness, branch reach, and unlocks new features.
          </Text>

          {STAGE_VISUALS.map((stageVis, index) => {
            const info = STAGE_INFO[stageVis.key as keyof typeof STAGE_INFO];
            const threshold = STAGE_THRESHOLDS[index];

            return (
              <View
                key={stageVis.key}
                style={[
                  styles.stageCard,
                  {
                    backgroundColor: theme.colors.card.background,
                    borderColor: theme.colors.border.secondary,
                  },
                ]}
              >
                {/* Illustration */}
                <View style={styles.stageIllustration}>
                  <MiniStageTree
                    stage={stageVis}
                    prayerColors={prayerColors}
                    trunkColor={trunkColor}
                    bloomColor={bloomColor}
                  />
                </View>

                {/* Info */}
                <View style={styles.stageInfo}>
                  <View style={styles.stageHeader}>
                    <Text style={[styles.stageName, { color: theme.colors.text.primary }]}>
                      {info.name}
                    </Text>
                    <Text
                      style={[
                        styles.stageArabic,
                        { color: theme.colors.garden?.dawamPillText || theme.colors.primary.DEFAULT },
                      ]}
                    >
                      {info.arabic}
                    </Text>
                  </View>

                  <Text style={[styles.stageRange, { color: theme.colors.interactive.active }]}>
                    {threshold.max === Infinity
                      ? `${threshold.min}+ reflections`
                      : `${threshold.min}–${threshold.max} reflections`}
                  </Text>

                  <Text style={[styles.stageDescription, { color: theme.colors.text.secondary }]}>
                    {stageVis.description}
                  </Text>

                  {/* Feature unlocks */}
                  {stageVis.hasSubBranches && (
                    <View style={[styles.unlockChip, { backgroundColor: theme.colors.interactive.active + '15' }]}>
                      <Text style={[styles.unlockText, { color: theme.colors.interactive.active }]}>
                        ✦ Unlocks sub-branches
                      </Text>
                    </View>
                  )}
                </View>

                {/* Hadith */}
                <View style={[styles.stageHadith, { borderTopColor: theme.colors.border.secondary }]}>
                  <Text style={[styles.hadithText, { color: theme.colors.text.muted }]}>
                    {stageVis.hadith}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Ramadan mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ramadan Mode 🌙</Text>
          <Text style={styles.bodyText}>
            During the blessed month of Ramadan, your tree transforms. Branch colors
            shift toward gold, extra stars appear in the night sky, and the crescent
            moon gains a warm halo. The stage label shows which day of Ramadan you're on.
          </Text>
          <Text style={styles.bodyText}>
            This happens automatically — no settings to change. Your tree feels
            the baraka of the month just as you do.
          </Text>
        </View>

        {/* Tap to explore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore Your Leaves</Text>
          <Text style={styles.bodyText}>
            Tap any leaf on your tree to see its details — which prayer it came from,
            when you prayed, your mood level, and whether you wrote a reflection.
            Each leaf is a moment of connection with Allah, preserved in your garden.
          </Text>
        </View>

        {/* Closing */}
        <View style={[styles.closingCard, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.secondary }]}>
          <Text style={[styles.closingArabic, { color: theme.colors.garden?.dawamPillText || theme.colors.primary.DEFAULT }]}>
            طُوبَىٰ لَهُمْ وَحُسْنُ مَآبٍ
          </Text>
          <Text style={[styles.closingTranslation, { color: theme.colors.text.secondary }]}>
            "Tuba (blessedness) is for them, and a beautiful place of return."
          </Text>
          <Text style={[styles.closingRef, { color: theme.colors.text.muted }]}>
            — Quran 13:29
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },

    // Hero
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
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
      color: theme.colors.garden?.dawamPillText || theme.colors.primary.DEFAULT,
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

    // Sections
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

    // Quote card
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

    // Growth steps
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
    stepContent: {
      flex: 1,
    },
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

    // Leaf types
    leafTypeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    leafTypeCard: {
      flex: 1,
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
      gap: 4,
    },
    leafTypeIcon: {
      fontSize: 24,
      marginBottom: 2,
    },
    leafTypeName: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    leafTypeMood: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.body,
    },
    leafTypeDesc: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.body,
      textAlign: 'center',
    },

    // Branch colors
    branchColorList: {
      gap: 10,
    },
    branchColorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    branchColorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
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
    branchColorFill: {
      height: '100%',
      borderRadius: 3,
    },

    // Stage cards
    stageCard: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
    },
    stageIllustration: {
      alignItems: 'center',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
    stageInfo: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    stageHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 4,
    },
    stageName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    stageArabic: {
      fontSize: 16,
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
    },
    stageRange: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginBottom: theme.spacing.xs,
    },
    stageDescription: {
      fontSize: theme.typography.fontSize.sm + 1,
      fontFamily: theme.typography.fontFamily.body,
      lineHeight: 21,
    },
    unlockChip: {
      alignSelf: 'flex-start',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: theme.spacing.sm,
    },
    unlockText: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    stageHadith: {
      borderTopWidth: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md - 2,
    },
    hadithText: {
      fontSize: theme.typography.fontSize.xs + 1,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      lineHeight: 18,
    },

    // Closing
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
      fontFamily: Platform.OS === 'ios' ? 'Amiri' : theme.typography.fontFamily.body,
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
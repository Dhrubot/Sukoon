import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { withAlpha } from '../../utils/color';

const TreeIllustration: React.FC<{ trunk: string; leaf: string; accent: string }> = ({
  trunk,
  leaf,
  accent,
}) => (
  <Svg width="100%" height={220} viewBox="0 0 220 220" fill="none">
    <Path
      d="M108 205C108 165 108 138 110 118C112 98 116 77 126 48"
      stroke={trunk}
      strokeWidth={10}
      strokeLinecap="round"
    />
    <Path d="M112 122C90 110 73 95 61 77" stroke={trunk} strokeWidth={5} strokeLinecap="round" />
    <Path d="M112 128C136 114 154 98 167 79" stroke={trunk} strokeWidth={5} strokeLinecap="round" />
    <Path d="M116 102C95 88 84 67 80 45" stroke={trunk} strokeWidth={4.5} strokeLinecap="round" />
    <Path d="M120 98C141 84 153 63 157 40" stroke={trunk} strokeWidth={4.5} strokeLinecap="round" />
    <Path d="M116 142C90 138 66 130 46 114" stroke={trunk} strokeWidth={4.5} strokeLinecap="round" />
    <Path d="M118 146C145 143 170 133 188 117" stroke={trunk} strokeWidth={4.5} strokeLinecap="round" />
    {[
      [60, 75],
      [82, 43],
      [45, 112],
      [166, 78],
      [156, 38],
      [188, 112],
      [114, 30],
      [104, 70],
      [132, 68],
    ].map(([cx, cy], index) => (
      <Ellipse
        key={`${cx}-${cy}-${index}`}
        cx={cx}
        cy={cy}
        rx={8}
        ry={12}
        fill={leaf}
        transform={`rotate(${index % 2 === 0 ? -18 : 16} ${cx} ${cy})`}
      />
    ))}
    <Circle cx={110} cy={116} r={3} fill={accent} opacity={0.35} />
  </Svg>
);

const BranchIllustration: React.FC<{ colors: string[]; trunk: string }> = ({ colors, trunk }) => (
  <Svg width="100%" height={180} viewBox="0 0 220 180" fill="none">
    <Path d="M110 168C110 130 110 101 113 76C116 52 122 35 130 18" stroke={trunk} strokeWidth={9} strokeLinecap="round" />
    {[
      { d: 'M112 88C92 76 75 63 63 48', color: colors[0] },
      { d: 'M114 98C84 102 59 102 34 92', color: colors[1] },
      { d: 'M116 82C140 70 156 56 169 39', color: colors[2] },
      { d: 'M116 108C144 111 167 104 189 92', color: colors[3] },
      { d: 'M118 62C111 41 107 25 107 10', color: colors[4] },
    ].map((branch) => (
      <Path
        key={branch.d}
        d={branch.d}
        stroke={trunk}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    ))}
    {[
      { cx: 64, cy: 48, color: colors[0] },
      { cx: 34, cy: 92, color: colors[1] },
      { cx: 169, cy: 39, color: colors[2] },
      { cx: 189, cy: 92, color: colors[3] },
      { cx: 107, cy: 10, color: colors[4] },
    ].map((leaf, index) => (
      <Ellipse
        key={`${leaf.cx}-${leaf.cy}-${index}`}
        cx={leaf.cx}
        cy={leaf.cy}
        rx={7}
        ry={11}
        fill={leaf.color}
        transform={`rotate(${index < 2 ? -16 : 18} ${leaf.cx} ${leaf.cy})`}
      />
    ))}
  </Svg>
);

const LeafIllustration: React.FC<{ leaf: string; accent: string }> = ({ leaf, accent }) => (
  <Svg width="100%" height={120} viewBox="0 0 220 120" fill="none">
    <Ellipse cx={90} cy={58} rx={16} ry={24} fill={leaf} transform="rotate(-18 90 58)" />
    <Ellipse cx={130} cy={58} rx={16} ry={24} fill={leaf} transform="rotate(18 130 58)" opacity={0.92} />
    <Path d="M110 32C108 55 108 72 110 92" stroke={accent} strokeWidth={2.5} strokeLinecap="round" opacity={0.35} />
    <Circle cx={110} cy={60} r={3} fill={accent} opacity={0.28} />
  </Svg>
);

const TubaTreeInfoScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const prayerColors = [
    theme.colors.prayer.fajr,
    theme.colors.prayer.dhuhr,
    theme.colors.prayer.asr,
    theme.colors.prayer.maghrib,
    theme.colors.prayer.isha,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Your Tuba Tree</Text>
            <Text style={styles.heroArabic}>طُوبَىٰ</Text>
            <Text style={styles.heroSubtitle}>
              Each prayer you reflect on nourishes a leaf.
              {'\n'}
              Over time, the tree becomes a quieter witness to your return.
            </Text>
            <TreeIllustration
              trunk={theme.colors.garden.trunk}
              leaf={theme.colors.interactive.active}
              accent={theme.colors.primary.DEFAULT}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Tuba means here</Text>
            <Text style={styles.bodyText}>
              Tuba is used in Sukoon as a private metaphor for prayer, sincerity, and return. It is not a score and it is not a reward ladder. It is simply a gentle way to see that your prayers are leaving a trace.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it works</Text>
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>1. Pray and leave a quiet reflection</Text>
              <Text style={styles.stepText}>
                When you complete a prayer flow and leave a note or mood check-in, Sukoon records that moment privately.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>2. Each prayer nourishes its own branch</Text>
              <Text style={styles.stepText}>
                Fajr, Dhuhr, Asr, Maghrib, and Isha each feed a different branch so your tree reflects the shape of your real prayer life.
              </Text>
            </View>
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>3. The tree grows quieter, fuller, and more rooted</Text>
              <Text style={styles.stepText}>
                With time, the tree becomes denser and more settled. Growth is there to honor return, not to rank worship.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Five prayer branches</Text>
            <Text style={styles.bodyText}>
              Each branch corresponds to one of the five daily prayers. Their colors mirror the feel of each prayer time.
            </Text>
            <View style={styles.illustrationCard}>
              <BranchIllustration
                colors={prayerColors}
                trunk={theme.colors.garden.trunk}
              />
            </View>
            <View style={styles.branchList}>
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer, index) => (
                <View key={prayer} style={styles.branchRow}>
                  <View
                    style={[
                      styles.branchDot,
                      { backgroundColor: prayerColors[index] },
                    ]}
                  />
                  <Text style={styles.branchName}>{prayer}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What a leaf represents</Text>
            <Text style={styles.bodyText}>
              Every leaf belongs to the same tree family. Some prayers feel calm, some feel rushed, some feel heavy. Sukoon keeps that state as a private reflection, not as a better-or-worse grade.
            </Text>
            <View style={styles.illustrationCard}>
              <LeafIllustration
                leaf={theme.colors.interactive.active}
                accent={theme.colors.primary.DEFAULT}
              />
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>A private sign of return</Text>
            <Text style={styles.noteText}>
              If you pause for a while, nothing is lost. When you return, the tree simply begins receiving your prayers again. That is the spirit Sukoon is trying to protect.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    gradient: {
      flex: 1,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing['4xl'],
    },
    hero: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    heroTitle: {
      fontSize: 24,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    heroArabic: {
      fontSize: 30,
      fontFamily: theme.typography.fontFamily.arabicBold,
      color: theme.colors.interactive.active,
      marginBottom: theme.spacing.md,
    },
    heroSubtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    bodyText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 24,
    },
    stepCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    stepTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    stepText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    illustrationCard: {
      backgroundColor: withAlpha(theme.colors.card.background, 0.72),
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    branchList: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    branchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    branchDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    branchName: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    noteCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      padding: theme.spacing.xl,
    },
    noteTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    noteText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 24,
    },
  });

export default TubaTreeInfoScreen;

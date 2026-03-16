// src/screens/Menu/MenuScreen.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useStore } from '../../store/useStore';
import Svg, { Path, Circle, Line, Polyline } from 'react-native-svg';
import DailyVerse, { DailyVerseRef } from '../../components/common/DailyVerse';
import { withAlpha } from '../../utils/color';

// ═══════════════════════════════════════════════════════════════
// Outline SVG Icon Components
// ═══════════════════════════════════════════════════════════════

// Garden / leaf icon
const GardenIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22V12M12 12C12 8 9 5 5 3c0 4 2 8 7 9M12 12c0-4 3-7 7-9 0 4-2 8-7 9"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Tasbih / dhikr counter icon
const TasbihIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="5" r="1.5" fill={color} />
    <Circle cx="17" cy="8" r="1.5" fill={color} />
    <Circle cx="17" cy="16" r="1.5" fill={color} />
    <Circle cx="12" cy="19" r="1.5" fill={color} />
    <Circle cx="7" cy="16" r="1.5" fill={color} />
    <Circle cx="7" cy="8" r="1.5" fill={color} />
  </Svg>
);

// Book / verse icon
const VerseIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Dua / book icon
const DuaIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Adhkar / sunrise icon
const AdhkarIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={1.8} />
    <Line x1="12" y1="1" x2="12" y2="3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="12" y1="21" x2="12" y2="23" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="1" y1="12" x2="3" y2="12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="21" y1="12" x2="23" y2="12" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// Journey / trending-up icon
const JourneyIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="23 6 13.5 15.5 8.5 10.5 1 18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Polyline
      points="17 6 23 6 23 12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Settings / gear icon
const SettingsIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
    <Path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Support / heart icon
const SupportIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron right icon
const ChevronIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline
      points="9 18 15 12 9 6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// Quick Access Items
// ═══════════════════════════════════════════════════════════════

interface QuickAccessItem {
  icon: React.FC<{ color: string; size: number }>;
  title: string;
  subtitle: string;
  screen: string;
  colorKey: 'teal' | 'gold' | 'purple' | 'amber';
  onPress?: () => void;
}

const quickAccessItems: QuickAccessItem[] = [
  {
    icon: AdhkarIcon,
    title: 'Adhkar',
    subtitle: 'Morning and evening remembrance',
    screen: 'Adhkar',
    colorKey: 'amber',
  },
  {
    icon: DuaIcon,
    title: 'Dua',
    subtitle: 'Supplications for daily life',
    screen: 'DuaLibrary',
    colorKey: 'purple',
  },
  {
    icon: TasbihIcon,
    title: 'Tasbih',
    subtitle: 'Post-prayer dhikr',
    screen: 'Tasbih',
    colorKey: 'teal',
  },
  {
    icon: VerseIcon,
    title: 'Daily Verse',
    subtitle: 'A single ayah for reflection',
    screen: '',
    colorKey: 'gold',
  },
];

// ═══════════════════════════════════════════════════════════════
// More Features List Items
// ═══════════════════════════════════════════════════════════════

interface MoreFeatureItem {
  icon: React.FC<{ color: string; size: number }>;
  title: string;
  subtitle: string;
  screen: string;
  iconBg: string;
  onPress?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// MenuScreen Component
// ═══════════════════════════════════════════════════════════════

// Theme / palette icon
const ThemeIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <Path
      d="M12 3v18c4.97 0 9-4.03 9-9s-4.03-9-9-9z"
      fill={color}
      opacity={0.3}
    />
  </Svg>
);

const MenuScreen: React.FC = () => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const { currentDawam } = useStore();
  const dailyVerseRef = useRef<DailyVerseRef>(null);
  const handleNavigate = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen as never);
  };

  // Accent color mapping for quick access tiles
  const getAccentColors = (colorKey: string) => {
    switch (colorKey) {
      case 'teal':
        return { bg: withAlpha(theme.colors.interactive.active, 0.08), icon: theme.colors.interactive.active };
      case 'gold':
        return { bg: withAlpha(theme.colors.gold, 0.09), icon: theme.colors.gold };
      case 'purple': {
        const taraweeh = (theme.colors.prayer as Record<string, string>)?.taraweeh;
        return { bg: taraweeh ? withAlpha(taraweeh, 0.12) : '#a78bfa20', icon: taraweeh || '#a78bfa' };
      }
      case 'amber':
        return { bg: '#f59e0b18', icon: '#f59e0b' };
      default:
        return { bg: theme.colors.card.hover, icon: theme.colors.text.secondary };
    }
  };

  // More features list
  const moreFeatures: MoreFeatureItem[] = [
    {
      icon: JourneyIcon,
      title: 'Prayer Insights',
      subtitle: 'Private reflection of your journey',
      screen: 'MyJourney',
      iconBg: withAlpha(theme.colors.interactive.active, 0.08),
    },
    {
      icon: ThemeIcon,
      title: 'App Theme',
      subtitle: `Currently: ${themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Midnight'}`,
      screen: '',
      iconBg: withAlpha(theme.colors.interactive.active, 0.08),
      onPress: toggleTheme,
    },
    {
      icon: SettingsIcon,
      title: 'Settings',
      subtitle: 'Prayer & notifications',
      screen: 'Settings',
      iconBg: theme.colors.card.hover,
    },
    {
      icon: SupportIcon,
      title: 'Support Sukoon',
      subtitle: 'Contribute to upkeep and development',
      screen: 'Support',
      iconBg: '#fb718518',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.ambient.top, theme.colors.ambient.bottom]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Companion Tools</Text>
          {/* <Text style={styles.headerSubtitle}>Secondary devotions and private reflection around prayer</Text> */}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

            {/* ── Private reflection entry ── */}
        <Text style={styles.sectionLabel}>PRIVATE REFLECTION</Text>
        <TouchableOpacity
          style={styles.gardenCard}
          onPress={() => handleNavigate('ReflectionGarden')}
          activeOpacity={0.8}
        >
          <View style={styles.gardenGlow} />
          <View style={styles.gardenTop}>
            <View style={styles.gardenIconLg}>
              <GardenIcon color={theme.colors.interactive.active} size={26} />
            </View>
            <View style={styles.gardenText}>
              <Text style={styles.gardenTitle}>Tuba Tree</Text>
              <Text style={styles.gardenSub}>
                {currentDawam > 0
                  ? `${currentDawam} days of dawam recorded`
                  : 'A private record of return and reflection'}
              </Text>
              <Text style={styles.gardenDesc}>
                Watch Tuba tree grow
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Quick Access Grid ── */}
        <Text style={styles.sectionLabel}>DEVOTIONS</Text>
        {/* <Text style={styles.sectionIntro}>
          Keep these close, but secondary. They support prayer without competing with it.
        </Text> */}
        <View style={styles.quickGrid}>
          {quickAccessItems.map((item) => {
            const accent = getAccentColors(item.colorKey);
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.quickTile}
                onPress={() => {
                  if (item.title === 'Daily Verse') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    dailyVerseRef.current?.openSheet();
                  } else if (item.onPress) {
                    item.onPress();
                  } else {
                    handleNavigate(item.screen);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.tileIcon, { backgroundColor: accent.bg }]}>
                  <item.icon color={accent.icon} size={18} />
                </View>
                <View>
                  <Text style={styles.tileName}>{item.title}</Text>
                  <Text style={styles.tileSub}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── More Features List ── */}
        <Text style={styles.sectionLabel}>APP & SUPPORT</Text>
        <View style={styles.featuresList}>
          {moreFeatures.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.featureRow,
                index === moreFeatures.length - 1 && styles.featureRowLast,
              ]}
              onPress={() => item.onPress ? item.onPress() : handleNavigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.featureIcon, { backgroundColor: item.iconBg }]}>
                <item.icon color={theme.colors.text.secondary} size={16} />
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{item.title}</Text>
                <Text style={styles.featureSub}>{item.subtitle}</Text>
              </View>
              <ChevronIcon color={theme.colors.text.muted} size={16} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>Sukoon v1.0.0</Text>
          <Text style={styles.blessing}>May Allah accept our efforts</Text>
        </View>
        </ScrollView>
      </LinearGradient>
      <DailyVerse ref={dailyVerseRef} modalOnly />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },

  // Section labels
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs - 1,
    letterSpacing: 1.8,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.muted,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 2,
  },
  sectionIntro: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginBottom: 12,
    marginLeft: 2,
    lineHeight: 20,
  },

  // ── Garden Featured Card ──
  gardenCard: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.interactive.active, 0.19),
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  gardenGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: withAlpha(theme.colors.interactive.active, 0.04),
  },
  gardenTop: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  gardenIconLg: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: withAlpha(theme.colors.interactive.active, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(theme.colors.interactive.active, 0.16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gardenText: {
    flex: 1,
  },
  gardenTitle: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
  },
  gardenSub: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.interactive.active,
    marginTop: 2,
    opacity: 0.8,
  },
  gardenDesc: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  gardenProgressRow: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  progLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progLabelText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  progLabelValue: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  progBar: {
    height: 4,
    backgroundColor: theme.colors.border.secondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    borderRadius: 2,
  },
  gardenStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.interactive.active + '15',
  },
  gardenStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  gardenStatMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: theme.colors.interactive.active + '15',
    borderRightColor: theme.colors.interactive.active + '15',
  },
  gsVal: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  gsLabel: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginTop: 1,
    letterSpacing: 0.3,
  },

  // ── Quick Access Grid ──
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTile: {
    width: '48.5%',
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
    lineHeight: 18,
  },
  tileSub: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },

  // ── More Features List ──
  featuresList: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  featureRowLast: {
    borderBottomWidth: 0,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.primary,
  },
  featureSub: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: 1,
  },

  // ── Footer ──
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appVersion: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginBottom: 4,
  },
  blessing: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    fontStyle: 'italic',
  },
});

export default MenuScreen;

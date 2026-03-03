// src/screens/Menu/MenuScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useStore } from '../../store/useStore';
import ReflectionGardenService from '../../services/ReflectionGardenService';
import Svg, { Path, Circle, Line, Polyline, Rect } from 'react-native-svg';

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

// Compass / qibla icon
const CompassIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Path
      d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

// Wrench / setup icon
const SetupIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
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
}

const quickAccessItems: QuickAccessItem[] = [
  {
    icon: TasbihIcon,
    title: 'Dhikr Counter',
    subtitle: 'Tasbih tracker',
    screen: 'Tasbih',
    colorKey: 'teal',
  },
  {
    icon: VerseIcon,
    title: 'Daily Verse',
    subtitle: 'Quran reflection',
    screen: 'DuaLibrary',
    colorKey: 'gold',
  },
  {
    icon: DuaIcon,
    title: 'Dua Collection',
    subtitle: 'Supplications & prayers',
    screen: 'DuaLibrary',
    colorKey: 'purple',
  },
  {
    icon: AdhkarIcon,
    title: 'Adhkar',
    subtitle: 'Morning & evening',
    screen: 'Adhkar',
    colorKey: 'amber',
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
  const { currentDawam, todayPrayerRecords } = useStore();

  // Garden data
  const [gardenSummary, setGardenSummary] = useState({
    totalPlants: 0,
    newBlooms: 0,
    dawam: 0,
  });

  useFocusEffect(
    useCallback(() => {
      try {
        const data = ReflectionGardenService.getGardenData(28);
        setGardenSummary({
          totalPlants: data.totalPlants,
          newBlooms: data.newBlooms,
          dawam: currentDawam,
        });
      } catch {
        // Silently ignore
      }
    }, [currentDawam])
  );

  const prayedCount = todayPrayerRecords.filter(r => r.status === 'prayed').length;
  const totalPrayers = 5;
  const progressPercent = prayedCount / totalPrayers;

  const handleNavigate = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen as never);
  };

  // Accent color mapping for quick access tiles
  const getAccentColors = (colorKey: string) => {
    switch (colorKey) {
      case 'teal':
        return { bg: theme.colors.interactive.active + '14', icon: theme.colors.interactive.active };
      case 'gold':
        return { bg: theme.colors.gold + '18', icon: theme.colors.gold };
      case 'purple':
        return { bg: (theme.colors as any).prayer?.taraweeh ? (theme.colors as any).prayer.taraweeh + '20' : '#a78bfa20', icon: (theme.colors as any).prayer?.taraweeh || '#a78bfa' };
      case 'amber':
        return { bg: '#f59e0b18', icon: '#f59e0b' };
      default:
        return { bg: theme.colors.card.hover, icon: theme.colors.text.secondary };
    }
  };

  // More features list
  const moreFeatures: MoreFeatureItem[] = [
    // {
    //   icon: CompassIcon,
    //   title: 'Qibla Compass',
    //   subtitle: 'Find direction of prayer',
    //   screen: 'QiblaFinder',
    //   iconBg: theme.colors.interactive.active + '14',
    // },
    {
      icon: JourneyIcon,
      title: 'My Journey',
      subtitle: 'Reflect on your prayer history',
      screen: 'MyJourney',
      iconBg: theme.colors.interactive.active + '14',
    },
    {
      icon: SetupIcon,
      title: 'Setup & Health',
      subtitle: 'Location, reminders, diagnostics',
      screen: 'SetupHealth',
      iconBg: theme.colors.gold + '18',
    },
    {
      icon: ThemeIcon,
      title: 'App Theme',
      subtitle: `Currently: ${themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Midnight'}`,
      screen: '',
      iconBg: theme.colors.interactive.active + '14',
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
      title: 'Support Us',
      subtitle: 'Help keep this app ad-free',
      screen: 'Support',
      iconBg: '#fb718518',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Features & tools for your practice</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Your Practice: Garden Featured Card ── */}
        <Text style={styles.sectionLabel}>YOUR PRACTICE</Text>
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
              <Text style={styles.gardenTitle}>Your Garden</Text>
              <Text style={styles.gardenSub}>
                {gardenSummary.dawam > 0
                  ? `${gardenSummary.dawam} days of dawam · Growing`
                  : 'Your garden awaits'}
              </Text>
              <Text style={styles.gardenDesc}>
                Track your prayer consistency and grow a spiritual tree with each prayer.
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.gardenProgressRow}>
            <View style={styles.progLabel}>
              <Text style={styles.progLabelText}>Today's progress</Text>
              <Text style={[styles.progLabelValue, { color: theme.colors.interactive.active }]}>
                {prayedCount > 0 ? `${prayedCount} of ${totalPrayers} prayers` : 'ready when you are'}
              </Text>
            </View>
            <View style={styles.progBar}>
              <View
                style={[
                  styles.progFill,
                  {
                    width: `${Math.max(progressPercent * 100, 2)}%`,
                    backgroundColor: theme.colors.interactive.active,
                  },
                ]}
              />
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.gardenStats}>
            <View style={styles.gardenStat}>
              <Text style={[styles.gsVal, { color: theme.colors.interactive.active }]}>
                {gardenSummary.dawam > 0 ? gardenSummary.dawam : '—'}
              </Text>
              <Text style={styles.gsLabel}>Dawam</Text>
            </View>
            <View style={[styles.gardenStat, styles.gardenStatMiddle]}>
              <Text style={[styles.gsVal, { color: theme.colors.interactive.active }]}>
                {gardenSummary.totalPlants > 0 ? gardenSummary.totalPlants : '—'}
              </Text>
              <Text style={styles.gsLabel}>Prayers</Text>
            </View>
            <View style={styles.gardenStat}>
              <Text style={[styles.gsVal, { color: theme.colors.interactive.active }]}>
                {gardenSummary.newBlooms > 0 ? gardenSummary.newBlooms : '—'}
              </Text>
              <Text style={styles.gsLabel}>Blooms</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Quick Access Grid ── */}
        <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
        <View style={styles.quickGrid}>
          {quickAccessItems.map((item) => {
            const accent = getAccentColors(item.colorKey);
            return (
              <TouchableOpacity
                key={item.title}
                style={styles.quickTile}
                onPress={() => handleNavigate(item.screen)}
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
        <Text style={styles.sectionLabel}>MORE FEATURES</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginTop: 3,
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
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.muted,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 2,
  },

  // ── Garden Featured Card ──
  gardenCard: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.interactive.active + '30',
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
    backgroundColor: theme.colors.interactive.active + '0A',
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
    backgroundColor: theme.colors.interactive.active + '14',
    borderWidth: 1,
    borderColor: theme.colors.interactive.active + '28',
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
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: 6,
    lineHeight: 17,
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
    fontSize: 20,
    fontFamily: theme.typography.fontFamily.headingRegular,
    fontWeight: '300',
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
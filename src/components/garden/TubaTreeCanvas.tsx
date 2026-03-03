// src/components/garden/TubaTreeCanvas.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE CANVAS — v4                                         ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║                                                                ║
// ║  SWAY: Uses AnimatedG with `rotation` prop (proven in v1).     ║
// ║  The `originX/originY` is set to the branch's trunk junction   ║
// ║  so the branch swings like a pendulum from its base.           ║
// ║                                                                ║
// ║  This is the SAME approach that worked before v2 broke things. ║
// ║  Amplitude is gentle (1.2°) for subtle organic motion.         ║
// ║                                                                ║
// ║  The actual leaf rendering bug was in TreeLeaf.tsx, not here.  ║
// ╚══════════════════════════════════════════════════════════════════╝

import React, { useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { GardenPlant } from '../../types/garden';
import { TreeData, TreeBranch, TreeLeafData, SubBranch } from '../../types/tubaTree';
import TubaTreeService from '../../services/TubaTreeService';
import TreeLeaf from './TreeLeaf';
import TreeSky from './TreeSky';
import { ramadanTokens } from '../../theme/tubaTreeTokens';
import {
  TREE_VIEWBOX,
  TREE_CANVAS_HEIGHT,
  TRUNK,
  TRUNK_SCALE,
  ROOTS,
  ROOT_VISIBILITY,
  GROUND_COLORS,
  GROUND_HEIGHT_RATIO,
  STAGE_INFO,
  BRANCH_SWAY,
  RAMADAN_GOLD_BLEND,
  branchPathD,
} from '../../constants/tubaTree';

const AnimatedG = Animated.createAnimatedComponent(G);

interface TubaTreeCanvasProps {
  plants: GardenPlant[];
  isRamadan?: boolean;
  ramadanDay?: number | null;
  onLeafPress?: (leaf: TreeLeafData) => void;
}

// ─── Color blending utility ────────────────────────────────────────
function blendTowardGold(hexColor: string, goldHex: string, ratio: number): string {
  try {
    const parseHex = (h: string) => {
      const c = h.replace('#', '');
      return [
        parseInt(c.substring(0, 2), 16),
        parseInt(c.substring(2, 4), 16),
        parseInt(c.substring(4, 6), 16),
      ];
    };
    const [r1, g1, b1] = parseHex(hexColor);
    const [r2, g2, b2] = parseHex(goldHex);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch {
    return hexColor;
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CANVAS
// ═══════════════════════════════════════════════════════════════════

const TubaTreeCanvas: React.FC<TubaTreeCanvasProps> = ({
  plants,
  isRamadan = false,
  ramadanDay,
  onLeafPress,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const treeData: TreeData = useMemo(
    () => TubaTreeService.buildTreeData(plants),
    [plants],
  );

  // __DEV__ logging
  useEffect(() => {
    if (__DEV__) {
      const totalRendered = treeData.branches.reduce((s, b) => s + b.leaves.length, 0);
      console.log(`[TubaTreeCanvas] plants=${plants.length}, rendered=${totalRendered}, stage=${treeData.stage}`);
      treeData.branches.forEach((b) => {
        if (b.lengthScale > 0) {
          console.log(`  [${b.prayer}] scale=${b.lengthScale.toFixed(2)}, leaves=${b.leaves.length}`);
        }
      });
    }
  }, [treeData, plants.length]);

  // Sky gradient — circadian
  const skyGradient = useMemo(() => {
    const hour = new Date().getHours();
    const g = theme.colors.prayerGradients;
    if (hour < 5 || hour >= 21) return g.Isha;
    if (hour < 7) return g.Fajr;
    if (hour < 14) return g.Dhuhr;
    if (hour < 17) return g.Asr;
    if (hour < 19) return g.Maghrib;
    return g.Isha;
  }, [theme]);

  const ramadanThemeTokens = useMemo(() => {
    const key = theme.mode as keyof typeof ramadanTokens;
    return ramadanTokens[key] || ramadanTokens.dark;
  }, [theme.mode]);

  const getPrayerColor = useCallback((prayer: string): string => {
    const key = prayer.toLowerCase() as keyof typeof theme.colors.prayer;
    const base = theme.colors.prayer?.[key] || theme.colors.primary.DEFAULT;
    if (isRamadan) {
      return blendTowardGold(base, ramadanThemeTokens.goldBlend, RAMADAN_GOLD_BLEND);
    }
    return base;
  }, [theme, isRamadan, ramadanThemeTokens]);

  // Data-driven trunk
  const trunkScale = treeData.trunkScale ?? TRUNK_SCALE[treeData.stage];

  const trunkStrokeColor = useMemo(() => {
    const stageColors: Record<string, string> = {
      seedling: '#9CAF88',  // soft green — a living stem, not wood yet
      sapling: '#7A8C5E',  // greener wood
      growing: '#6B5A3E',  // transitioning to brown
      flourishing: '#4E3A25',  // proper bark brown
      ancient: '#3A2A15',  // deep rich old-growth brown
    };
    return stageColors[treeData.stage] || theme.colors.garden.trunk;
  }, [treeData.stage, theme]);

  const trunkHighlightColor = useMemo(() => {
    // Highlight is slightly lighter than trunk
    const highlightColors: Record<string, string> = {
      seedling: '#B8CCAA',
      sapling: '#96A87A',
      growing: '#8A7252',
      flourishing: '#6B5438',
      ancient: '#5A4428',
    };
    return highlightColors[treeData.stage] || theme.colors.garden.trunkHighlight;
  }, [treeData.stage, theme]);

  const trunkPath = useMemo(() => {
    const { start, control, end } = TRUNK;
    const sc = {
      x: start.x + (control.x - start.x) * trunkScale,
      y: start.y + (control.y - start.y) * trunkScale,
    };
    const se = {
      x: start.x + (end.x - start.x) * trunkScale,
      y: start.y + (end.y - start.y) * trunkScale,
    };
    return `M ${start.x} ${start.y} Q ${sc.x} ${sc.y} ${se.x} ${se.y}`;
  }, [trunkScale]);

  const visibleRootCount = ROOT_VISIBILITY[treeData.stage];

  const groundConfig = useMemo(() => {
    const themeKey = theme.mode as keyof typeof GROUND_COLORS;
    return GROUND_COLORS[themeKey] || GROUND_COLORS.dark;
  }, [theme.mode]);

  const stageInfo = STAGE_INFO[treeData.stage];
  const groundHeight = Math.round(TREE_CANVAS_HEIGHT * GROUND_HEIGHT_RATIO);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={skyGradient as readonly string[] as any}
        style={styles.gradient}
      >
        <TreeSky
          theme={theme}
          isRamadan={isRamadan}
          moonHaloColor={isRamadan ? ramadanThemeTokens.moonHalo : undefined}
        />

        <Svg
          viewBox={`0 0 ${TREE_VIEWBOX.width} ${TREE_VIEWBOX.height}`}
          style={styles.svg}
          preserveAspectRatio="xMidYMax meet"
        >
          <Defs>
            {treeData.branches.map((branch) => {
              const prayerColor = getPrayerColor(branch.prayer);
              return (
                <SvgGradient
                  key={`grad-${branch.prayer}`}
                  id={`branchGrad-${branch.prayer}`}
                  x1="0" y1="1" x2="1" y2="0"
                >
                  <Stop offset="0%" stopColor={theme.colors.garden.trunk} stopOpacity="1" />
                  <Stop offset="100%" stopColor={prayerColor} stopOpacity="0.75" />
                </SvgGradient>
              );
            })}
          </Defs>

          {/* Roots */}
          {ROOTS.slice(0, visibleRootCount).map((root, i) => (
            <Path
              key={`root-${i}`}
              d={root.d}
              stroke={theme.colors.garden.trunk}
              strokeWidth={root.width}
              fill="none"
              strokeLinecap="round"
              opacity={root.opacity}
            />
          ))}

          {/* Trunk */}
          <Path
            d={trunkPath}
            stroke={trunkStrokeColor}
            strokeWidth={treeData.trunkWidth}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={trunkPath}
            stroke={trunkHighlightColor}       // ← was theme.colors.garden.trunkHighlight
            strokeWidth={Math.max(0.8, treeData.trunkWidth * 0.3)}  // ← was Math.max(2, *0.4)
            fill="none"
            strokeLinecap="round"
          />

          {/* Branches + Leaves */}
          {treeData.branches.map((branch, branchIndex) => (
            <AnimatedBranchGroup
              key={branch.prayer}
              branch={branch}
              branchIndex={branchIndex}
              prayerColor={getPrayerColor(branch.prayer)}
              bloomGlowColor={theme.colors.garden.bloomGlow}
              onLeafPress={onLeafPress}
            />
          ))}
        </Svg>

        {/* Soil gradient */}
        <LinearGradient
          colors={groundConfig.colors as any}
          locations={groundConfig.locations as any}
          style={[styles.groundGradient, { height: groundHeight }]}
        />

        {/* Empty state */}
        {plants.length === 0 && (
          <View style={styles.emptyOverlay}>
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Waiting for your first reflection...
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Stage label */}
      {plants.length > 0 && (
        <View style={styles.stageRow}>
          <Text style={[styles.stageName, { color: theme.colors.text.muted }]}>
            {stageInfo.name}
          </Text>
          <Text
            style={[
              styles.stageArabic,
              {
                color: isRamadan
                  ? ramadanThemeTokens.stageLabel
                  : theme.colors.garden.dawamPillText,
              },
            ]}
          >
            {isRamadan && ramadanDay
              ? `رمضان ${ramadanDay} · ${stageInfo.arabic}`
              : stageInfo.arabic}
          </Text>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ANIMATED BRANCH GROUP — v4 ROTATION SWAY
// ═══════════════════════════════════════════════════════════════════
//
// Uses the SAME approach that worked in v1: AnimatedG with a
// `rotation` animated prop, pivoting around the branch's trunk
// junction (originX/originY = curve.start).
//
// Amplitude is gentle (1.2°) for subtle organic motion.
// Each branch has a phase offset for natural stagger.
//
// This approach is proven reliable with react-native-svg 15.x +
// react-native-reanimated 3.17.x. The `rotation` prop on G is
// a numeric value handled natively — no string animation, no
// fragile workarounds.
// ═══════════════════════════════════════════════════════════════════

interface AnimatedBranchGroupProps {
  branch: TreeBranch;
  branchIndex: number;
  prayerColor: string;
  bloomGlowColor: string;
  onLeafPress?: (leaf: TreeLeafData) => void;
}

const AnimatedBranchGroup: React.FC<AnimatedBranchGroupProps> = React.memo(
  ({ branch, branchIndex, prayerColor, bloomGlowColor, onLeafPress }) => {
    const { curve, lengthScale, strokeWidth, leaves, prayer, subBranches } = branch;

    const swayRotation = useSharedValue(0);

    // ──────────────────────────
    // Natural-wind sway: asymmetric timing, per-branch period/amplitude,
    // staggered phase delays.  Gust forward (38% of cycle) with cubic
    // ease-out; settle back (62%) with sinusoidal ease-in-out.

    useEffect(() => {
      if (lengthScale <= 0) return;

      const idx = branchIndex % BRANCH_SWAY.periods.length;
      const period = BRANCH_SWAY.periods[idx];
      const amp = BRANCH_SWAY.amplitudes[idx];
      const delay = BRANCH_SWAY.phaseDelays[idx];

      const gustMs = Math.round(period * BRANCH_SWAY.windRatio);
      const settleMs = period - gustMs;

      const timer = setTimeout(() => {
        swayRotation.value = withRepeat(
          withSequence(
            // Fast gust in wind direction
            withTiming(amp, {
              duration: gustMs,
              easing: Easing.out(Easing.cubic),
            }),
            // Slow, smooth return
            withTiming(-amp * 0.65, {
              duration: settleMs,
              easing: Easing.inOut(Easing.sin),
            }),
          ),
          -1,
          // reverses=false keeps the sequence playing forward-only,
          // which is what we want for asymmetric wind feel
          false,
        );
      }, delay);

      return () => {
        clearTimeout(timer);
        // Cancel the animation on cleanup so hot-reload doesn't stack
        swayRotation.value = 0;
      };
    }, [lengthScale, branchIndex]);

    const animatedProps = useAnimatedProps(() => ({
      rotation: swayRotation.value,
    }));

    // Don't render zero-length branches
    if (lengthScale <= 0 && leaves.length === 0) return null;

    const d = branchPathD(curve.start, curve.control, curve.end, lengthScale);

    return (
      <AnimatedG
        animatedProps={animatedProps}
        originX={curve.start.x}
        originY={curve.start.y}
      >
        {/* Main branch */}
        <Path
          d={d}
          stroke={`url(#branchGrad-${prayer})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Sub-branches */}
        {subBranches.map((sub: SubBranch, i: number) => (
          <Path
            key={`sub-${prayer}-${i}`}
            d={sub.d}
            stroke={prayerColor}
            strokeWidth={sub.strokeWidth}
            fill="none"
            strokeLinecap="round"
            opacity={sub.opacity}
          />
        ))}

        {/* Leaves */}
        {leaves.map((leaf, leafIndex) => (
          <TreeLeaf
            key={leaf.id}
            leaf={leaf}
            color={prayerColor}
            bloomGlowColor={bloomGlowColor}
            branchIndex={branchIndex}
            leafIndex={leafIndex}
            onPress={onLeafPress}
          />
        ))}
      </AnimatedG>
    );
  },
);

// ─── Styles ────────────────────────────────────────────────────────

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.xl,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      // No bottom radius — ground gradient merges into page background
      overflow: 'visible',
    },
    gradient: {
      height: TREE_CANVAS_HEIGHT,
      position: 'relative',
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      overflow: 'hidden',
    },
    svg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 3,
    },
    groundGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 4,
    },
    emptyOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      opacity: 0.7,
    },
    stageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    stageName: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    stageArabic: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'sans-serif',
    },
  });

export default React.memo(TubaTreeCanvas);
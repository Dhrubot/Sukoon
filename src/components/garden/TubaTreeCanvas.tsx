// src/components/garden/TubaTreeCanvas.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE CANVAS — v3                                         ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  CRITICAL FIX: Reverted from v2 AnimatedPath (which broke       ║
// ║  leaf rendering) back to AnimatedG.                             ║
// ║                                                                ║
// ║  SWAY: Uses translateX/Y on AnimatedG via useAnimatedProps     ║
// ║  with the perpendicular sway direction from constants.         ║
// ║  This is safe across ALL react-native-svg versions.            ║
// ║                                                                ║
// ║  DEBUG: __DEV__ logging shows branch visibility and leaf       ║
// ║  counts so we can trace data pipeline issues.                  ║
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
  branchSwayDirection,
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

  // Build tree data from plants
  const treeData: TreeData = useMemo(
    () => TubaTreeService.buildTreeData(plants),
    [plants],
  );

  // __DEV__ canvas-level logging
  useEffect(() => {
    if (__DEV__) {
      const totalRendered = treeData.branches.reduce((s, b) => s + b.leaves.length, 0);
      console.log(`[TubaTreeCanvas] plants=${plants.length}, totalRendered=${totalRendered}, stage=${treeData.stage}`);
      treeData.branches.forEach((b) => {
        if (b.lengthScale > 0) {
          console.log(`  [${b.prayer}] scale=${b.lengthScale.toFixed(2)}, leaves=${b.leaves.length}, stroke=${b.strokeWidth.toFixed(1)}`);
        }
      });
    }
  }, [treeData, plants.length]);

  // Sky gradient — circadian
  const skyGradient = useMemo(() => {
    const hour = new Date().getHours();
    const gradients = theme.colors.prayerGradients;
    if (hour < 5 || hour >= 21) return gradients.Isha;
    if (hour < 7) return gradients.Fajr;
    if (hour < 14) return gradients.Dhuhr;
    if (hour < 17) return gradients.Asr;
    if (hour < 19) return gradients.Maghrib;
    return gradients.Isha;
  }, [theme]);

  // Ramadan tokens
  const ramadanThemeTokens = useMemo(() => {
    const key = theme.mode as keyof typeof ramadanTokens;
    return ramadanTokens[key] || ramadanTokens.dark;
  }, [theme.mode]);

  // Prayer color resolver
  const getPrayerColor = useCallback((prayer: string): string => {
    const key = prayer.toLowerCase() as keyof typeof theme.colors.prayer;
    const base = theme.colors.prayer?.[key] || theme.colors.primary.DEFAULT;
    if (isRamadan) {
      return blendTowardGold(base, ramadanThemeTokens.goldBlend, RAMADAN_GOLD_BLEND);
    }
    return base;
  }, [theme, isRamadan, ramadanThemeTokens]);

  // ── BUG-2 FIX: Data-driven trunk path ─────────────────────────
  const trunkScale = treeData.trunkScale ?? TRUNK_SCALE[treeData.stage];

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
        {/* Animated sky (stars, moon, Ramadan halo) */}
        <TreeSky
          theme={theme}
          isRamadan={isRamadan}
          moonHaloColor={isRamadan ? ramadanThemeTokens.moonHalo : undefined}
        />

        {/* SVG Tree */}
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

          {/* Roots — progressive by stage */}
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
            stroke={theme.colors.garden.trunk}
            strokeWidth={treeData.trunkWidth}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={trunkPath}
            stroke={theme.colors.garden.trunkHighlight}
            strokeWidth={Math.max(2, treeData.trunkWidth * 0.4)}
            fill="none"
            strokeLinecap="round"
          />

          {/* Branches + Sub-Branches + Leaves */}
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

        {/* Full-width soil gradient */}
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
// ANIMATED BRANCH GROUP — v3 SAFE SWAY
// ═══════════════════════════════════════════════════════════════════
//
// v1 (original): AnimatedG rotation — rigid pendulum around base
// v2 (broken):   AnimatedPath with animated `d` string — broke leaves
// v3 (safe):     AnimatedG with translate perpendicular to branch flow
//
// WHY TRANSLATE INSTEAD OF ROTATION:
//   rotation pivots the entire group like a rigid plank.
//   translate shifts the group sideways, which at small amplitudes
//   (3.5 viewBox units ≈ 1% of width) looks like organic drift.
//   The branch, leaves, and sub-branches all move together,
//   which matches how real branches sway — the whole structure
//   shifts, foliage included.
//
// WHY NOT ANIMATED PATH `d`:
//   String prop animation via useAnimatedProps is unreliable
//   across react-native-svg versions. Some versions don't support
//   animating the `d` attribute at all, causing the AnimatedPath
//   to fail silently and break child element rendering.
//   NEVER animate string SVG props — only numeric ones.
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

    // BUG-4: Don't render zero-length branches
    if (lengthScale <= 0) return null;

    // Compute sway direction — perpendicular to branch midpoint
    const swayDir = useMemo(
      () => branchSwayDirection(curve.start, curve.control, curve.end, lengthScale),
      [curve, lengthScale],
    );

    // Extract primitives for worklet (objects can't cross the bridge)
    const perpX = swayDir.x;
    const perpY = swayDir.y;
    const tipDisp = BRANCH_SWAY.tipDisplacement;

    // Sway oscillation: -1 → +1 → -1 (infinite)
    const swayProgress = useSharedValue(0);

    useEffect(() => {
      const phaseDelay = branchIndex * BRANCH_SWAY.phaseOffset;
      const halfDuration = BRANCH_SWAY.duration / 2;
      const easing = Easing.inOut(Easing.sin);

      const timer = setTimeout(() => {
        swayProgress.value = withRepeat(
          withSequence(
            withTiming(1, { duration: halfDuration, easing }),
            withTiming(-1, { duration: halfDuration, easing }),
          ),
          -1,
          false,
        );
      }, phaseDelay);

      return () => clearTimeout(timer);
    }, [lengthScale, branchIndex]);

    // Animate G element translate — SAFE numeric props only
    const animatedProps = useAnimatedProps(() => {
      'worklet';
      const sway = swayProgress.value;
      return {
        x: sway * tipDisp * perpX,
        y: sway * tipDisp * perpY,
      };
    });

    // Static branch path
    const d = branchPathD(curve.start, curve.control, curve.end, lengthScale);

    return (
      <AnimatedG animatedProps={animatedProps}>
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

        {/* Leaves — rendered at absolute viewBox positions */}
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
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
    },
    gradient: {
      height: TREE_CANVAS_HEIGHT,
      position: 'relative',
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
// src/components/garden/TubaTreeCanvas.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE CANVAS                                              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  FIXES:                                                        ║
// ║  BUG-2: Trunk height is data-driven (trunkScale from service)  ║
// ║  SOIL:  Full-width RN LinearGradient at bottom                 ║
// ║  ROOTS: Progressive visibility by stage                        ║
// ║                                                                ║
// ║  v2 FIX-1: ORGANIC VERTEX SWAY                                ║
// ║  Replaced rigid <AnimatedG rotation={...}> with per-branch     ║
// ║  AnimatedPath that displaces Bézier control/end points.         ║
// ║  The branch BASE stays fixed, CONTROL shifts slightly, and      ║
// ║  END (tip) shifts the most — creating organic, whip-like bend. ║
// ║  Leaves remain at their pre-computed positions, which is MORE   ║
// ║  realistic: in real trees, the branch structure sways while     ║
// ║  foliage stays roughly in place.                               ║
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
  scaledBezier,
  branchSwayDirection,
} from '../../constants/tubaTree';

// ── Animated SVG component for organic branch bending ──────────────
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface TubaTreeCanvasProps {
  plants: GardenPlant[];
  isRamadan?: boolean;
  ramadanDay?: number | null;
  onLeafPress?: (leaf: TreeLeafData) => void;
}

// ─── Color blending helper ─────────────────────────────────────────
function blendTowardGold(hex: string, goldHex: string, ratio: number): string {
  const parse = (h: string) => {
    const c = h.replace('#', '');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(goldHex);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN CANVAS COMPONENT
// ═══════════════════════════════════════════════════════════════════

const TubaTreeCanvas: React.FC<TubaTreeCanvasProps> = ({
  plants,
  isRamadan = false,
  ramadanDay = null,
  onLeafPress,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Build tree data from plants
  const treeData = useMemo(() => TubaTreeService.buildTreeData(plants), [plants]);

  // Ramadan theme tokens
  const ramadanThemeTokens = useMemo(() => {
    if (!isRamadan) return ramadanTokens.dark;
    return ramadanTokens[theme.mode as keyof typeof ramadanTokens] || ramadanTokens.dark;
  }, [isRamadan, theme.mode]);

  // Sky gradient from theme
  const skyGradient = useMemo(() => {
    const gradients = theme.colors.prayerGradients || {};
    const current = Object.values(gradients)[0];
    if (Array.isArray(current) && current.length >= 2) return current;
    return theme.mode === 'dark'
      ? ['#0d1b2a', '#1b2838', '#1a237e']
      : ['#87CEEB', '#B0E0E6', '#E0F7FA'];
  }, [theme]);

  // Prayer color getter (with Ramadan gold blend)
  const getPrayerColor = useCallback((prayer: string) => {
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

  // Root visibility
  const visibleRootCount = ROOT_VISIBILITY[treeData.stage];

  // Ground gradient colors for this theme
  const groundConfig = useMemo(() => {
    const themeKey = theme.mode as keyof typeof GROUND_COLORS;
    return GROUND_COLORS[themeKey] || GROUND_COLORS.dark;
  }, [theme.mode]);

  const stageInfo = STAGE_INFO[treeData.stage];
  const groundHeight = Math.round(TREE_CANVAS_HEIGHT * GROUND_HEIGHT_RATIO);

  return (
    <View style={styles.container}>
      {/* Sky gradient — full canvas background */}
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

          {/* Trunk — scaled by data-driven trunkScale */}
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

        {/* ── FULL-WIDTH SOIL GRADIENT ──────────────────────────── */}
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
// FIX 1: ORGANIC VERTEX SWAY — AnimatedBranchGroup
// ═══════════════════════════════════════════════════════════════════
//
// OLD APPROACH (rigid):
//   <AnimatedG rotation={swayRotation} originX={start.x} originY={start.y}>
//     <Path d={staticD} />
//     {leaves}
//   </AnimatedG>
//
//   Problem: entire group pivots as a rigid plank around the base.
//   Looks mechanical, breaks the illusion of life.
//
// NEW APPROACH (organic):
//   <G>
//     <AnimatedPath d={animatedD} />   ← branch BENDS
//     <Path d={subBranch.d} />         ← sub-branches (static, small)
//     {leaves}                          ← stay at computed positions
//   </G>
//
//   The AnimatedPath constructs a new `d` string every frame by
//   displacing the Bézier CONTROL and END points perpendicular to
//   the branch's flow direction. The START stays locked to the trunk.
//
//   The displacement is proportional:
//     tip (end)     → full BRANCH_SWAY.tipDisplacement
//     mid (control) → tipDisplacement × BRANCH_SWAY.controlRatio
//
//   This creates organic, whip-like bending where the base barely
//   moves and the tip sways the most — exactly like real branches.
//
//   Leaves staying at their computed positions is MORE realistic:
//   in nature, branches sway as structure, but individual leaves
//   flutter independently from micro-currents, not from the branch
//   sweep itself. The visual effect of the path moving beneath
//   stationary leaves creates a subtle, living depth.
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

    // ── Pre-compute static geometry for the worklet ────────────────
    // These values are captured by the worklet closure as primitives.
    const scaled = useMemo(
      () => scaledBezier(curve.start, curve.control, curve.end, lengthScale),
      [curve, lengthScale],
    );

    // Perpendicular direction at the branch midpoint — this is the
    // axis along which the sway displacement occurs.
    const swayDir = useMemo(
      () => branchSwayDirection(curve.start, curve.control, curve.end, lengthScale),
      [curve, lengthScale],
    );

    // Extract primitives for worklet closure (objects can't cross the bridge)
    const startX = curve.start.x;
    const startY = curve.start.y;
    const ctrlX = scaled.control.x;
    const ctrlY = scaled.control.y;
    const endX = scaled.end.x;
    const endY = scaled.end.y;
    const perpX = swayDir.x;
    const perpY = swayDir.y;
    const tipDisp = BRANCH_SWAY.tipDisplacement;
    const ctrlRatio = BRANCH_SWAY.controlRatio;

    // ── Sway oscillation: -1 → 1 → -1 (infinite) ─────────────────
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

    // ── Animated branch path — organic Bézier bending ─────────────
    // Each frame, the worklet:
    // 1. Reads the current sway value (-1 to 1)
    // 2. Computes perpendicular displacement for control & end points
    // 3. Constructs a new SVG path `d` string
    //
    // The start point NEVER moves (locked to trunk junction).
    // The control point moves slightly (controlRatio × tipDisplacement).
    // The end point moves the most (full tipDisplacement).
    const branchAnimatedProps = useAnimatedProps(() => {
      'worklet';
      const sway = swayProgress.value;

      // Tip displacement (full amplitude)
      const tipDx = sway * tipDisp * perpX;
      const tipDy = sway * tipDisp * perpY;

      // Control point displacement (fraction of tip)
      const cDx = tipDx * ctrlRatio;
      const cDy = tipDy * ctrlRatio;

      // Construct displaced path
      // Using Math.round * 10 / 10 for single-decimal precision
      // (more worklet-safe than .toFixed)
      const cx = Math.round((ctrlX + cDx) * 10) / 10;
      const cy = Math.round((ctrlY + cDy) * 10) / 10;
      const ex = Math.round((endX + tipDx) * 10) / 10;
      const ey = Math.round((endY + tipDy) * 10) / 10;

      return {
        d: 'M ' + startX + ' ' + startY + ' Q ' + cx + ' ' + cy + ' ' + ex + ' ' + ey,
      };
    });

    // Static path for initial render / fallback
    const staticD = branchPathD(curve.start, curve.control, curve.end, lengthScale);

    return (
      <G>
        {/* Branch — animated organic bend */}
        <AnimatedPath
          animatedProps={branchAnimatedProps}
          d={staticD}
          stroke={`url(#branchGrad-${prayer})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Sub-branches — static paths (small scale = stiffness imperceptible) */}
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

        {/* Leaves — at pre-computed positions (no group animation).
            In real trees, branches sway as structure while foliage
            stays roughly in place. This creates natural visual depth. */}
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
      </G>
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
    // ── FULL-WIDTH SOIL ──────────────────────────────────────────
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
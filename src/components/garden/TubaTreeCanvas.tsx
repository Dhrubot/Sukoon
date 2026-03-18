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
import logger from '../../utils/logger';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  G,
  Circle,
  Ellipse,
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
import TreeGrowthStateService from '../../services/TreeGrowthStateService';
import { getTreeStageTransform } from '../../utils/treeLayout';
import TreeLeaf from './TreeLeaf';
import TreeSky from './TreeSky';
import { ramadanTokens } from '../../theme/tubaTreeTokens';
import {
  TREE_VIEWBOX,
  TREE_CANVAS_HEIGHT,
  ROOTS,
  ROOT_VISIBILITY,
  GROUND_COLORS,
  GROUND_HEIGHT_RATIO,
  STAGE_INFO,
  BRANCH_SWAY,
  RAMADAN_GOLD_BLEND,
  branchTaperSegments,
  trunkColor,
  swayMultiplier,
  rootWidthScale,
  trunkTaperSegments,
  branchPathD,
  resolveTreePrayerColor,
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

  const treeData: TreeData = useMemo(() => {
    const growthState = TreeGrowthStateService.getState();
    return TubaTreeService.buildTreeData(growthState, plants);
  }, [plants]);

  // __DEV__ logging
  useEffect(() => {
    if (__DEV__) {
      const totalRendered = treeData.branches.reduce((s, b) => s + b.leaves.length, 0);
      logger.log(`[TubaTreeCanvas] plants=${plants.length}, rendered=${totalRendered}, stage=${treeData.stage}`);
      treeData.branches.forEach((b) => {
        if (b.lengthScale > 0) {
          logger.log(`  [${b.id}] scale=${b.lengthScale.toFixed(2)}, leaves=${b.leaves.length}`);
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
    const themeMode = theme.mode as 'dark' | 'light' | 'midnight';
    const base = resolveTreePrayerColor(themeMode, prayer);
    if (isRamadan) {
      return blendTowardGold(base, ramadanThemeTokens.goldBlend, RAMADAN_GOLD_BLEND);
    }
    return base;
  }, [theme, isRamadan, ramadanThemeTokens]);

  // Continuous trunk geometry from g
  const trunkScale = treeData.trunkScale;
  const g = treeData.g;
  const trunkCurve = treeData.trunkCurve;

  const trunkStrokeColor = useMemo(() => trunkColor(g), [g]);
  const trunkHighlightColor = useMemo(
    () => blendTowardGold(trunkStrokeColor, '#f3e4c7', 0.24),
    [trunkStrokeColor],
  );
  const trunkShadowColor = useMemo(
    () => blendTowardGold(trunkStrokeColor, '#20140c', 0.22),
    [trunkStrokeColor],
  );
  const canopyAuraColor = useMemo(
    () => blendTowardGold(theme.colors.garden.bloomGlow, '#a4b8ff', 0.48),
    [theme.colors.garden.bloomGlow],
  );
  const canopyAura = useMemo(() => {
    if (!(treeData.stage === 'flourishing' || treeData.stage === 'ancient')) return null;

    const allLeaves = treeData.branches.flatMap((branch) => [
      ...branch.leaves,
      ...branch.subBranches.flatMap((subBranch) => subBranch.leaves),
    ]);
    if (allLeaves.length === 0) return null;

    const bounds = allLeaves.reduce(
      (acc, leaf) => ({
        minX: Math.min(acc.minX, leaf.x),
        maxX: Math.max(acc.maxX, leaf.x),
        minY: Math.min(acc.minY, leaf.y),
        maxY: Math.max(acc.maxY, leaf.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    const width = Math.max(34, bounds.maxX - bounds.minX);
    const height = Math.max(34, bounds.maxY - bounds.minY);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2 + (treeData.stage === 'ancient' ? 10 : 14);

    return {
      centerX,
      centerY,
      outerRx: width * 0.42 + (treeData.stage === 'ancient' ? 8 : 6),
      outerRy: height * 0.34 + (treeData.stage === 'ancient' ? 8 : 6),
      innerRx: width * 0.26 + (treeData.stage === 'ancient' ? 4 : 3),
      innerRy: height * 0.18 + (treeData.stage === 'ancient' ? 4 : 3),
    };
  }, [treeData.branches, treeData.stage]);

  // Trunk taper: 12 segments with interpolated width
  const taperSegs = useMemo(
    () => trunkTaperSegments(trunkCurve.start, trunkCurve.control, trunkCurve.end, trunkScale, treeData.trunkWidth),
    [trunkCurve, trunkScale, treeData.trunkWidth],
  );
  const foregroundTrunkSegs = useMemo(
    () => taperSegs.slice(0, Math.max(4, Math.round(taperSegs.length * 0.58))),
    [taperSegs],
  );
  const trunkFlare = useMemo(() => {
    const spread = treeData.trunkWidth * (0.95 + g * 0.22);
    const rise = 8 + g * 8;
    const baseX = trunkCurve.start.x;
    const baseY = trunkCurve.start.y;

    return {
      left: `M ${baseX.toFixed(1)} ${baseY.toFixed(1)} Q ${(baseX - spread * 0.45).toFixed(1)} ${(baseY - rise * 0.25).toFixed(1)} ${(baseX - spread).toFixed(1)} ${(baseY - rise).toFixed(1)}`,
      right: `M ${baseX.toFixed(1)} ${baseY.toFixed(1)} Q ${(baseX + spread * 0.45).toFixed(1)} ${(baseY - rise * 0.25).toFixed(1)} ${(baseX + spread).toFixed(1)} ${(baseY - rise).toFixed(1)}`,
      collar: `M ${(baseX - spread * 0.32).toFixed(1)} ${(baseY - rise * 0.32).toFixed(1)} Q ${baseX.toFixed(1)} ${(baseY - rise * 0.6).toFixed(1)} ${(baseX + spread * 0.32).toFixed(1)} ${(baseY - rise * 0.32).toFixed(1)}`,
    };
  }, [treeData.trunkWidth, g, trunkCurve]);

  const visibleRootCount = ROOT_VISIBILITY[treeData.stage];
  const rootScale = useMemo(() => rootWidthScale(g), [g]);

  const groundConfig = useMemo(() => {
    const themeKey = theme.mode as keyof typeof GROUND_COLORS;
    return GROUND_COLORS[themeKey] || GROUND_COLORS.dark;
  }, [theme.mode]);

  const stageInfo = STAGE_INFO[treeData.stage];
  const groundHeight = Math.round(TREE_CANVAS_HEIGHT * GROUND_HEIGHT_RATIO);
  const treeStageTransform = useMemo(
    () => getTreeStageTransform(treeData).svgTransform,
    [treeData],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...skyGradient] as [string, string, ...string[]]}
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
                  key={`grad-${branch.id}`}
                  id={`branchGrad-${branch.id}`}
                  x1="0" y1="1" x2="1" y2="0"
                >
                  <Stop offset="0%" stopColor={theme.colors.garden.trunk} stopOpacity="1" />
                  <Stop offset="100%" stopColor={prayerColor} stopOpacity="0.75" />
                </SvgGradient>
              );
            })}
          </Defs>

          <G transform={treeStageTransform}>
            {canopyAura && (
              <>
                <Ellipse
                  cx={canopyAura.centerX - canopyAura.outerRx * 0.34}
                  cy={canopyAura.centerY - canopyAura.outerRy * 0.10}
                  rx={canopyAura.outerRx * 0.58}
                  ry={canopyAura.outerRy * 0.92}
                  fill={canopyAuraColor}
                  opacity={treeData.stage === 'ancient' ? 0.0065 : 0.005}
                />
                <Ellipse
                  cx={canopyAura.centerX}
                  cy={canopyAura.centerY - canopyAura.outerRy * 0.16}
                  rx={canopyAura.outerRx * 0.56}
                  ry={canopyAura.outerRy * 0.84}
                  fill={canopyAuraColor}
                  opacity={treeData.stage === 'ancient' ? 0.0052 : 0.004}
                />
                <Ellipse
                  cx={canopyAura.centerX + canopyAura.outerRx * 0.34}
                  cy={canopyAura.centerY - canopyAura.outerRy * 0.02}
                  rx={canopyAura.outerRx * 0.54}
                  ry={canopyAura.outerRy * 0.88}
                  fill={canopyAuraColor}
                  opacity={treeData.stage === 'ancient' ? 0.006 : 0.0046}
                />
                <Ellipse
                  cx={canopyAura.centerX + canopyAura.outerRx * 0.08}
                  cy={canopyAura.centerY + canopyAura.outerRy * 0.04}
                  rx={canopyAura.innerRx * 0.92}
                  ry={canopyAura.innerRy}
                  fill="#dbe4ff"
                  opacity={treeData.stage === 'ancient' ? 0.0028 : 0.0022}
                />
              </>
            )}

            {ROOTS.slice(0, visibleRootCount).map((root, i) => (
              <Path
                key={`root-${i}`}
                d={root.d}
                stroke={trunkStrokeColor}
                strokeWidth={root.width * rootScale}
                fill="none"
                strokeLinecap="round"
                opacity={root.opacity}
              />
            ))}

            <Path
              d={trunkFlare.left}
              stroke={trunkShadowColor}
              strokeWidth={Math.max(1.2, treeData.trunkWidth * 0.46)}
              fill="none"
              strokeLinecap="round"
              opacity={0.32}
            />
            <Path
              d={trunkFlare.right}
              stroke={trunkStrokeColor}
              strokeWidth={Math.max(1.2, treeData.trunkWidth * 0.5)}
              fill="none"
              strokeLinecap="round"
              opacity={0.36}
            />
            <Path
              d={trunkFlare.collar}
              stroke={trunkHighlightColor}
              strokeWidth={Math.max(0.8, treeData.trunkWidth * 0.16)}
              fill="none"
              strokeLinecap="round"
              opacity={0.24}
            />

            {taperSegs.map((seg, i) => (
              <React.Fragment key={`trunk-${i}`}>
                <Path
                  d={`M ${seg.x1.toFixed(1)} ${seg.y1.toFixed(1)} L ${seg.x2.toFixed(1)} ${seg.y2.toFixed(1)}`}
                  stroke={trunkStrokeColor}
                  strokeWidth={seg.width}
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d={`M ${(seg.x1 - 0.35).toFixed(1)} ${seg.y1.toFixed(1)} L ${(seg.x2 - 0.35).toFixed(1)} ${seg.y2.toFixed(1)}`}
                  stroke={trunkHighlightColor}
                  strokeWidth={Math.max(0.5, seg.width * 0.24)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.30}
                />
                <Path
                  d={`M ${(seg.x1 + 0.45).toFixed(1)} ${seg.y1.toFixed(1)} L ${(seg.x2 + 0.45).toFixed(1)} ${seg.y2.toFixed(1)}`}
                  stroke={trunkShadowColor}
                  strokeWidth={Math.max(0.4, seg.width * 0.18)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.22}
                />
              </React.Fragment>
            ))}

            {treeData.branches.map((branch, branchIndex) => (
              <AnimatedBranchGroup
                key={branch.id}
                branch={branch}
                branchIndex={branchIndex}
                prayerColor={getPrayerColor(branch.prayer)}
                structuralWoodColor={blendTowardGold(trunkStrokeColor, getPrayerColor(branch.prayer), 0.12)}
                structuralHighlightColor={blendTowardGold(trunkHighlightColor, getPrayerColor(branch.prayer), 0.08)}
                structuralShadowColor={trunkShadowColor}
                bloomGlowColor={theme.colors.garden.bloomGlow}
                growthG={g}
                treeStage={treeData.stage}
                onLeafPress={onLeafPress}
              />
            ))}

            {foregroundTrunkSegs.map((seg, i) => (
              <React.Fragment key={`trunk-front-${i}`}>
                <Path
                  d={`M ${seg.x1.toFixed(1)} ${seg.y1.toFixed(1)} L ${seg.x2.toFixed(1)} ${seg.y2.toFixed(1)}`}
                  stroke={trunkShadowColor}
                  strokeWidth={Math.max(0.8, seg.width * 0.46)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.36}
                />
                <Path
                  d={`M ${(seg.x1 - 0.18).toFixed(1)} ${seg.y1.toFixed(1)} L ${(seg.x2 - 0.18).toFixed(1)} ${seg.y2.toFixed(1)}`}
                  stroke={trunkHighlightColor}
                  strokeWidth={Math.max(0.5, seg.width * 0.12)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.20}
                />
              </React.Fragment>
            ))}
          </G>
        </Svg>

        {/* Soil gradient */}
        <LinearGradient
          colors={[...groundConfig.colors] as [string, string, ...string[]]}
          locations={[...groundConfig.locations] as [number, number, ...number[]]}
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
  structuralWoodColor: string;
  structuralHighlightColor: string;
  structuralShadowColor: string;
  bloomGlowColor: string;
  growthG: number;
  treeStage: TreeData['stage'];
  onLeafPress?: (leaf: TreeLeafData) => void;
}

const AnimatedBranchGroup: React.FC<AnimatedBranchGroupProps> = React.memo(
  ({
    branch,
    branchIndex,
    prayerColor,
    structuralWoodColor,
    structuralHighlightColor,
    structuralShadowColor,
    bloomGlowColor,
    growthG,
    treeStage,
    onLeafPress,
  }) => {
    const { id, curve, lengthScale, strokeWidth, leaves, subBranches } = branch;
    const branchHighlightColor = useMemo(
      () => blendTowardGold(structuralHighlightColor, '#f6f0dd', 0.18),
      [structuralHighlightColor],
    );
    const branchShadowColor = useMemo(
      () => blendTowardGold(structuralShadowColor, '#1b120d', 0.12),
      [structuralShadowColor],
    );

    const swayRotation = useSharedValue(0);

    // ──────────────────────────
    // Natural-wind sway: asymmetric timing, per-branch period/amplitude,
    // staggered phase delays.  Gust forward (38% of cycle) with cubic
    // ease-out; settle back (62%) with sinusoidal ease-in-out.
    // Amplitude scaled by g: seedlings are whippy, ancient trees stately.

    useEffect(() => {
      if (lengthScale <= 0) return;

      const idx = branchIndex % BRANCH_SWAY.periods.length;
      const period = BRANCH_SWAY.periods[idx];
      const amp = BRANCH_SWAY.amplitudes[idx] * swayMultiplier(growthG);
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

    const branchSegments = branchTaperSegments(
      curve.start,
      curve.control,
      curve.end,
      lengthScale,
      strokeWidth,
    );
    const branchPath = useMemo(
      () => branchPathD(curve.start, curve.control, curve.end, lengthScale),
      [curve, lengthScale],
    );
    const emergenceLengthScale = treeStage === 'seedling'
      ? Math.min(lengthScale, 0.26)
      : treeStage === 'sapling'
        ? Math.min(lengthScale, 0.20)
        : treeStage === 'growing'
          ? Math.min(lengthScale, 0.12)
          : 0;
    const emergencePath = useMemo(
      () => (
        emergenceLengthScale > 0
          ? branchPathD(curve.start, curve.control, curve.end, emergenceLengthScale)
          : ''
      ),
      [curve, emergenceLengthScale],
    );
    const baseNodeRadius = treeStage === 'seedling'
      ? Math.max(1.1, strokeWidth * 0.54)
      : treeStage === 'sapling'
        ? Math.max(1.2, strokeWidth * 0.48)
        : treeStage === 'growing'
          ? Math.max(1.0, strokeWidth * 0.42)
          : Math.max(0.9, strokeWidth * 0.34);

    return (
      <AnimatedG
        animatedProps={animatedProps}
        originX={curve.start.x}
        originY={curve.start.y}
      >
        {emergencePath ? (
          <Path
            d={emergencePath}
            stroke={structuralWoodColor}
            strokeWidth={Math.max(1.2, strokeWidth * (treeStage === 'seedling' ? 1.2 : 1.1))}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.94}
          />
        ) : null}
        {/* Main branch */}
        <Path
          d={branchPath}
          stroke={structuralWoodColor}
          strokeWidth={Math.max(1.35, strokeWidth * 1.08)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.96}
        />
        <Path
          d={branchPath}
          stroke={`url(#branchGrad-${id})`}
          strokeWidth={Math.max(0.85, strokeWidth * 0.58)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.82}
        />
        <Circle
          cx={curve.start.x}
          cy={curve.start.y}
          r={baseNodeRadius}
          fill={structuralWoodColor}
          opacity={0.86}
        />
        {branchSegments.map((segment, segmentIndex) => (
          <React.Fragment key={`branch-${id}-${segmentIndex}`}>
            <Path
              d={`M ${segment.x1.toFixed(1)} ${segment.y1.toFixed(1)} L ${segment.x2.toFixed(1)} ${segment.y2.toFixed(1)}`}
              stroke={`url(#branchGrad-${id})`}
              strokeWidth={Math.max(0.7, segment.width * 0.82)}
              fill="none"
              strokeLinecap="round"
              opacity={0.92}
            />
            <Path
              d={`M ${(segment.x1 - 0.25).toFixed(1)} ${segment.y1.toFixed(1)} L ${(segment.x2 - 0.25).toFixed(1)} ${segment.y2.toFixed(1)}`}
              stroke={branchHighlightColor}
              strokeWidth={Math.max(0.35, segment.width * 0.18)}
              fill="none"
              strokeLinecap="round"
              opacity={0.24}
            />
            <Path
              d={`M ${(segment.x1 + 0.2).toFixed(1)} ${segment.y1.toFixed(1)} L ${(segment.x2 + 0.2).toFixed(1)} ${segment.y2.toFixed(1)}`}
              stroke={branchShadowColor}
              strokeWidth={Math.max(0.3, segment.width * 0.14)}
              fill="none"
              strokeLinecap="round"
              opacity={0.18}
            />
          </React.Fragment>
        ))}

        {/* Sub-branches + their leaves */}
        {subBranches.map((sub: SubBranch, i: number) => (
          <React.Fragment key={`sub-${id}-${i}`}>
            <Path
              d={branchPathD(sub.curve.start, sub.curve.control, sub.curve.end, 1)}
              stroke={structuralWoodColor}
              strokeWidth={Math.max(1.0, sub.strokeWidth * 1.12)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={sub.opacity}
            />
            <Path
              d={branchPathD(sub.curve.start, sub.curve.control, sub.curve.end, 1)}
              stroke={prayerColor}
              strokeWidth={Math.max(0.65, sub.strokeWidth * 0.62)}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={sub.opacity * 0.88}
            />
            <Circle
              cx={sub.curve.start.x}
              cy={sub.curve.start.y}
              r={Math.max(0.95, sub.strokeWidth * 0.42)}
              fill={structuralWoodColor}
              opacity={sub.opacity * 0.84}
            />
            {branchTaperSegments(
              sub.curve.start,
              sub.curve.control,
              sub.curve.end,
              1,
              sub.strokeWidth,
            ).map((segment, segmentIndex) => (
              <React.Fragment key={`sub-segment-${id}-${i}-${segmentIndex}`}>
                <Path
                  d={`M ${segment.x1.toFixed(1)} ${segment.y1.toFixed(1)} L ${segment.x2.toFixed(1)} ${segment.y2.toFixed(1)}`}
                  stroke={prayerColor}
                  strokeWidth={Math.max(0.5, segment.width * 0.74)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={sub.opacity}
                />
                <Path
                  d={`M ${(segment.x1 - 0.16).toFixed(1)} ${segment.y1.toFixed(1)} L ${(segment.x2 - 0.16).toFixed(1)} ${segment.y2.toFixed(1)}`}
                  stroke={branchHighlightColor}
                  strokeWidth={Math.max(0.25, segment.width * 0.16)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={sub.opacity * 0.24}
                />
              </React.Fragment>
            ))}
            {sub.leaves.map((leaf, leafIdx) => (
              <TreeLeaf
                key={leaf.id}
                leaf={leaf}
                color={prayerColor}
                bloomGlowColor={bloomGlowColor}
                branchIndex={branchIndex}
                leafIndex={leaves.length + leafIdx}
                growthG={growthG}
                onPress={onLeafPress}
              />
            ))}
          </React.Fragment>
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
            growthG={growthG}
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

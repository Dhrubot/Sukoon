// src/constants/tubaTree.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE — Geometry & Growth Constants — v4                  ║
// ║                                                                ║
// ║  v4 changes from v3:                                           ║
// ║  • BRANCH_SWAY: back to rotation amplitude (degrees) — the    ║
// ║    proven v1 approach. Removed tipDisplacement + perp vector.  ║
// ║  • Removed branchSwayDirection() — no longer needed.           ║
// ║  • All other v3 improvements preserved (leaf distribution,     ║
// ║    moon size, sub-branch curves, Ramadan halo constants).      ║
// ╚══════════════════════════════════════════════════════════════════╝

import { PrayerName } from '../types';
import { GrowthStage } from '../types/garden';
import { BranchDefinition, Point, TreeStage } from '../types/tubaTree';

export const TREE_VIEWBOX = { width: 320, height: 300 } as const;
export const TREE_CANVAS_HEIGHT = 320;

export const TRUNK = {
  start: { x: 160, y: 280 } as Point,
  control: { x: 159, y: 190 } as Point,
  end: { x: 160, y: 100 } as Point,
  baseWidth: {
    seedling: 2.5,   // was 6  — hairline stem, botanically accurate
    sapling: 4.5,   // was 8  — first real branch emergence
    growing: 7,     // was 10
    flourishing: 10,    // was 12
    ancient: 14,    // unchanged
  } as Record<TreeStage, number>,
} as const;

export const TRUNK_SCALE: Record<TreeStage, number> = {
  seedling: 0.15,
  sapling: 0.25,
  growing: 0.45,
  flourishing: 0.70,
  ancient: 1.0,
} as const;

export const TRUNK_TOP_PADDING = 10;

export const ROOTS = [
  { d: 'M 160 280 C 146 284 128 287 112 285', width: 3.5, opacity: 0.55 },
  { d: 'M 160 280 C 174 284 192 287 208 285', width: 3.5, opacity: 0.55 },
  { d: 'M 156 283 C 148 288 136 292 122 291', width: 2, opacity: 0.35 },
  { d: 'M 164 283 C 172 288 184 292 198 291', width: 2, opacity: 0.35 },
] as const;

export const ROOT_VISIBILITY: Record<TreeStage, number> = {
  seedling: 0, sapling: 2, growing: 4, flourishing: 4, ancient: 4,
} as const;

export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    id: 'fajr-primary',
    prayer: 'Fajr' as PrayerName,
    curve: { start: { x: 160, y: 188 }, control: { x: 129, y: 154 }, end: { x: 74, y: 118 } },
    baseAngle: -38,
    weight: 0.58,
    minStage: 'seedling',
    minLeaves: 1,
  },
  {
    id: 'fajr-secondary',
    prayer: 'Fajr' as PrayerName,
    curve: { start: { x: 160, y: 172 }, control: { x: 142, y: 129 }, end: { x: 108, y: 78 } },
    baseAngle: -16,
    weight: 0.42,
    minStage: 'flourishing',
    minLeaves: 12,
  },
  {
    id: 'dhuhr-primary',
    prayer: 'Dhuhr' as PrayerName,
    curve: { start: { x: 160, y: 186 }, control: { x: 193, y: 152 }, end: { x: 248, y: 116 } },
    baseAngle: 38,
    weight: 0.58,
    minStage: 'seedling',
    minLeaves: 1,
  },
  {
    id: 'dhuhr-secondary',
    prayer: 'Dhuhr' as PrayerName,
    curve: { start: { x: 160, y: 171 }, control: { x: 178, y: 128 }, end: { x: 212, y: 80 } },
    baseAngle: 16,
    weight: 0.42,
    minStage: 'flourishing',
    minLeaves: 12,
  },
  {
    id: 'asr-primary',
    prayer: 'Asr' as PrayerName,
    curve: { start: { x: 160, y: 214 }, control: { x: 202, y: 196 }, end: { x: 272, y: 172 } },
    baseAngle: 52,
    weight: 0.56,
    minStage: 'seedling',
    minLeaves: 0,
  },
  {
    id: 'asr-secondary',
    prayer: 'Asr' as PrayerName,
    curve: { start: { x: 160, y: 196 }, control: { x: 198, y: 167 }, end: { x: 238, y: 132 } },
    baseAngle: 30,
    weight: 0.44,
    minStage: 'flourishing',
    minLeaves: 12,
  },
  {
    id: 'maghrib-primary',
    prayer: 'Maghrib' as PrayerName,
    curve: { start: { x: 160, y: 214 }, control: { x: 118, y: 196 }, end: { x: 48, y: 172 } },
    baseAngle: -52,
    weight: 0.56,
    minStage: 'seedling',
    minLeaves: 0,
  },
  {
    id: 'maghrib-secondary',
    prayer: 'Maghrib' as PrayerName,
    curve: { start: { x: 160, y: 196 }, control: { x: 122, y: 168 }, end: { x: 82, y: 134 } },
    baseAngle: -30,
    weight: 0.44,
    minStage: 'flourishing',
    minLeaves: 12,
  },
  {
    id: 'isha-primary',
    prayer: 'Isha' as PrayerName,
    curve: { start: { x: 160, y: 168 }, control: { x: 156, y: 120 }, end: { x: 146, y: 54 } },
    baseAngle: -10,
    weight: 0.54,
    minStage: 'seedling',
    minLeaves: 1,
  },
  {
    id: 'isha-secondary',
    prayer: 'Isha' as PrayerName,
    curve: { start: { x: 160, y: 166 }, control: { x: 171, y: 121 }, end: { x: 186, y: 60 } },
    baseAngle: 12,
    weight: 0.46,
    minStage: 'growing',
    minLeaves: 8,
  },
];

export const STAGE_THRESHOLDS: { stage: TreeStage; min: number; max: number }[] = [
  { stage: 'seedling', min: 0, max: 14 },        // ~3 days at 5/day
  { stage: 'sapling', min: 15, max: 74 },         // ~3 days to ~2 weeks
  { stage: 'growing', min: 75, max: 249 },        // ~2 weeks to ~7 weeks
  { stage: 'flourishing', min: 250, max: 749 },   // ~7 weeks to ~5 months
  { stage: 'ancient', min: 750, max: Infinity },   // ~5+ months
];

export const STAGE_INFO: Record<TreeStage, { name: string; arabic: string }> = {
  seedling: { name: 'Seedling', arabic: 'بِذْرَة' },
  sapling: { name: 'Sapling', arabic: 'شَتْلَة' },
  growing: { name: 'Growing', arabic: 'نَامِيَة' },
  flourishing: { name: 'Flourishing', arabic: 'مُزْدَهِرَة' },
  ancient: { name: 'Ancient', arabic: 'عَتِيقَة' },
};

// ═══════════════════════════════════════════════════════════════════
// LEAF RENDERING
// ═══════════════════════════════════════════════════════════════════

export const LEAF_SIZES: Record<GrowthStage, { rx: number; ry: number }> = {
  seed:   { rx: 3.5, ry: 5.5 },   // was 3, 4.5
  sprout: { rx: 5.5, ry: 9.0 },   // was 4, 6.5 — big, fleshy seedling leaf
  bloom:  { rx: 6.5, ry: 10.0 },  // was 5.5, 8
};
export const LEAF_OPACITY: Record<GrowthStage, { base: number; variance: number }> = {
  seed: { base: 0.52, variance: 0.08 }, sprout: { base: 0.64, variance: 0.08 }, bloom: { base: 0.76, variance: 0.06 },
};
export const BLOOM_SPARKLE = { radius: 2, offsetRatio: 0.7 } as const;
export const BRANCH_STYLE = { minStrokeWidth: 2.5, maxStrokeWidth: 5.5, fullThicknessAt: 10 } as const;
export const MAX_LEAVES_PER_BRANCH = 12;
export const MAX_LEAVES_PER_SUB_BRANCH = 6;
export const MAX_TOTAL_LEAVES = 150;
export const LEAF_JITTER = { maxOffset: 8, maxRotation: 25 } as const;

// ── TIP-WEIGHTED LEAF DISTRIBUTION (v3) ────────────────────────────
// t = floorT + range × pow(linearT, power)
// floorT 0.15 = inner 15% of branch stays bare
// power 0.7  = sub-linear → pushes leaves toward tips
// tipClusterT = leaves past this t get halved jitter → tighter clusters
// NEW — base-first: first leaf at junction, new leaves push to tip:
export const LEAF_DISTRIBUTION = {
  floorT: 0.05,        // first leaf right at junction
  range: 0.88,         // spread to 0.93 at full branch
  tipClusterT: 0.65,
  tipJitterScale: 0.40,
  mainTipT: 0.96,
  subTipT: 0.94,
} as const;

// ═══════════════════════════════════════════════════════════════════
// GROUND / SOIL
// ═══════════════════════════════════════════════════════════════════
//
// KEY CHANGE: the bottom colour is now the *screen background* for
// each theme, not a soil tone.  Combined with removing the bottom
// border-radius from the canvas container
// this makes the tree look like it grows out of the page itself —
//
// The mid-stop still carries a subtle earth tone so there's a hint
// of soil, but it dissolves cleanly into the background.

export const GROUND_COLORS = {
  dark: {
    // transparent → faint earth → screen bg
    colors: ['transparent', 'rgba(30,32,22,0.34)', 'rgba(24,29,56,0.70)', '#181D38'],
    locations: [0, 0.28, 0.65, 1],
  },
  light: {
    colors: [
      'transparent',
      'rgba(110,75,35,0.10)',
      'rgba(155,108,58,0.46)',
      'rgba(205,178,138,0.72)',
      '#faf7f2',
    ],
    locations: [0, 0.14, 0.38, 0.45, 0.55],
  },
  midnight: {
    // transparent → near-black earth → screen bg
    colors: ['transparent', 'rgba(16,18,12,0.40)', 'rgba(9,13,24,0.74)', '#090d18'],
    locations: [0, 0.28, 0.65, 1],
  },
} as const;

// Increase ratio slightly so the fade starts higher up the canvas —
// this gives more "ground merge" room without eating into the tree.
export const GROUND_HEIGHT_RATIO = 0.24;

// ═══════════════════════════════════════════════════════════════════
// SKY ELEMENTS
// ═══════════════════════════════════════════════════════════════════

export const STARS = [
  { x: 48, y: 24, size: 2, animDelay: 0 }, { x: 234, y: 36, size: 3, animDelay: 0.9 },
  { x: 147, y: 15, size: 2, animDelay: 1.5 }, { x: 282, y: 60, size: 2, animDelay: 0.4 },
  { x: 19, y: 54, size: 1.5, animDelay: 2.0 }, { x: 90, y: 90, size: 2, animDelay: 0.7 },
] as const;

// ═══════════════════════════════════════════════════════════════════
// ANIMATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// BRANCH_SWAY
// ═══════════════════════════════════════════════════════════════════
//
// Natural-wind model:
//   • Each branch has its own period (heavier/longer = slower).
//   • Wind gust takes 38 % of the cycle (fast); gravity settle 62 %.
//   • Amplitude varies per branch (outer branches catch more wind).
//   • Phase delays are spread far apart — branches never look synced.
//
// Easing strategy:
//   • Forward (gust) : Easing.out(Easing.cubic)  — snappy start, decel
//   • Return (settle): Easing.inOut(Easing.sin)  — smooth, natural arc
//
// Branch order: [Fajr, Dhuhr, Asr, Maghrib, Isha] (matches BRANCHES array)

export const BRANCH_SWAY = {
  /** Period (ms) for each branch's full sway cycle.
   *  Outer/lighter branches are faster; trunk-close ones slower. */
  periods: [15200, 18800, 13400, 20200, 16600],

  /** Max rotation amplitude (degrees) per branch.
   *  Outer branches catch more wind → slightly larger. */
  amplitudes: [0.90, 1.15, 0.80, 1.00, 1.05],

  /** Fraction of the period spent on the "gust" phase.
   *  0.38 → fast forward, slow return — mirrors real wind behaviour. */
  windRatio: 0.38,

  /** Startup delay (ms) before each branch begins animating.
   *  Spread far apart so no two branches look in sync. */
  phaseDelays: [0, 3200, 1100, 5400, 2000],
} as const;

export const LEAF_ENTRY = { duration: 600, baseDelay: 300, staggerPerLeaf: 80, staggerPerBranch: 150 } as const;
export const BLOOM_PULSE = { minOpacity: 0.45, maxOpacity: 0.95, duration: 2400 } as const;
export const STAR_TWINKLE = { minOpacity: 0.15, maxOpacity: 0.70, minScale: 0.9, maxScale: 1.5, duration: 7000 } as const;

// v4: MOON — matches hero StarField crescent
export const MOON_FLOAT = { amplitude: 6, duration: 8000, rotationAmplitude: 5 } as const;
export const MOON = { size: 44, topPercent: 3, rightPercent: 5 } as const;

// v4: RAMADAN HALO — glow layers defined in TreeSky, not a flat circle
// This constant is kept for backwards compat but the actual glow
// is now multi-layered in the TreeSky component.
export const RAMADAN_MOON_HALO = { radius: 28, opacity: 0.35 } as const;

// ═══════════════════════════════════════════════════════════════════
// BÉZIER MATH
// ═══════════════════════════════════════════════════════════════════

export function quadBezierPoint(start: Point, control: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

export function quadBezierTangentAngle(start: Point, control: Point, end: Point, t: number): number {
  const mt = 1 - t;
  const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function quadBezierPerpendicular(start: Point, control: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: -dy / len, y: dx / len };
}

/** Scale a Bézier curve from its start point. BUG-1 FIX. */
export function scaledBezier(start: Point, control: Point, end: Point, scale: number): { control: Point; end: Point } {
  return {
    control: { x: start.x + (control.x - start.x) * scale, y: start.y + (control.y - start.y) * scale },
    end: { x: start.x + (end.x - start.x) * scale, y: start.y + (end.y - start.y) * scale },
  };
}

/** Build SVG path d-string for a branch curve at a given scale. */
export function branchPathD(start: Point, control: Point, end: Point, scale: number = 1): string {
  if (scale >= 1) return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  const sc = scaledBezier(start, control, end, scale);
  return `M ${start.x} ${start.y} Q ${sc.control.x.toFixed(1)} ${sc.control.y.toFixed(1)} ${sc.end.x.toFixed(1)} ${sc.end.y.toFixed(1)}`;
}

/** Deterministic hash for leaf jitter consistency. */
export function leafHash(prayer: string, date: string, index: number): number {
  let hash = 0;
  const str = `${prayer}-${date}-${index}`;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

export function trunkTopY(scale: number): number {
  return TRUNK.start.y + (TRUNK.end.y - TRUNK.start.y) * scale;
}

export function trunkScaleForY(targetY: number): number {
  const range = TRUNK.start.y - TRUNK.end.y;
  if (range === 0) return 1;
  return Math.max(0, Math.min(1, (TRUNK.start.y - targetY) / range));
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 CONSTANTS
// ═══════════════════════════════════════════════════════════════════

export const SUB_BRANCH = {
  forkT: [0.70, 0.50, 0.35] as readonly number[],
  lengthRatio: 0.45,
  spread: 35,
  strokeRatio: 0.5,
  opacity: 0.65,
  directions: [1, -1, 1] as readonly number[],
  /** v3: softer departure — was 0.5 */
  controlFactor: 0.3,
  /** v3: tighter initial curve — was 0.6 */
  controlSpreadFactor: 0.4,
} as const;

export const SUB_BRANCH_STAGES: Record<string, number> = { growing: 1, flourishing: 1, ancient: 2, ancientFull: 3 };
// ancientFull threshold: 1000+ lifetime reflections triggers 3rd sub-branch
export const ANCIENT_FULL_THRESHOLD = 1000;

export const RAMADAN_STARS = [
  { x: 70, y: 18, size: 2.5, animDelay: 0.3 }, { x: 190, y: 28, size: 2, animDelay: 1.1 },
  { x: 260, y: 15, size: 2.5, animDelay: 0.6 }, { x: 35, y: 78, size: 1.5, animDelay: 1.8 },
  { x: 300, y: 42, size: 2, animDelay: 2.3 },
] as const;
export const RAMADAN_GOLD_BLEND = 0.25;
export const LEAF_DETAIL = { hitRadius: 16, animDuration: 250 } as const;
export const MINI_TREE = {
  viewBox: { width: 48, height: 56 },
  trunk: 'M 24 52 Q 24 36 24 20',
  branches: ['M 24 36 Q 18 30 10 26', 'M 24 36 Q 30 30 38 26', 'M 24 30 Q 16 22 8 16', 'M 24 30 Q 32 22 40 16', 'M 24 24 Q 24 14 24 6'],
  roots: ['M 24 52 Q 18 54 12 53', 'M 24 52 Q 30 54 36 53'],
} as const;

// ═══════════════════════════════════════════════════════════════════
// CONTINUOUS GROWTH SYSTEM (v5)
//
// All geometry is driven by a single parameter g ∈ [0, 1].
// g is derived from totalLifetimeReflections via a logistic S-curve.
// Every formula below is a pure function of g — easy to test,
// easy to tweak, easy to port to Skia.
// ═══════════════════════════════════════════════════════════════════

// ── GROWTH CURVE ──────────────────────────────────────────────────
// Dual S-curve: fast initial growth (first weeks) + slow long-tail
// maturation (evolves over months, approaches 1.0 around a year).
//
// At 5 prayers/day:
//   n=25  (~5 days):   g ≈ 0.10  — visible seedling
//   n=75  (~2 weeks):  g ≈ 0.30  — sapling with branches
//   n=250 (~7 weeks):  g ≈ 0.60  — lush growing tree
//   n=500 (~3 months): g ≈ 0.80  — flourishing canopy
//   n=750 (~5 months): g ≈ 0.88  — ancient tree
//   n=1825 (~1 year):  g ≈ 0.99  — fully mature
//
export const GROWTH_CURVE = {
  // Fast curve: drives visible growth in first ~2 months
  fast: { midpoint: 80, steepness: 0.04 },
  // Slow curve: drives maturation over months
  slow: { midpoint: 600, steepness: 0.006 },
  // Blend: 55% fast + 45% slow — ensures both early reward and long tail
  fastWeight: 0.55,
  slowWeight: 0.45,
} as const;

export function computeG(n: number): number {
  if (n <= 0) return 0;
  const { fast, slow, fastWeight, slowWeight } = GROWTH_CURVE;

  const sigmoid = (x: number, mid: number, k: number) => {
    const raw = 1 / (1 + Math.exp(-k * (x - mid)));
    const floor = 1 / (1 + Math.exp(k * mid));
    return (raw - floor) / (1 - floor);
  };

  const gFast = sigmoid(n, fast.midpoint, fast.steepness);
  const gSlow = sigmoid(n, slow.midpoint, slow.steepness);
  return Math.min(1, gFast * fastWeight + gSlow * slowWeight);
}

// ── STAGE FROM N (kept for discrete decisions: root count, sub-branches) ──
export const STAGE_ORDER: TreeStage[] = ['seedling', 'sapling', 'growing', 'flourishing', 'ancient'];

export function computeStage(n: number): TreeStage {
  for (const { stage, min, max } of STAGE_THRESHOLDS) {
    if (n >= min && n <= max) return stage;
  }
  return 'ancient';
}

export function stageIndex(stage: TreeStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// ── TRUNK HEIGHT ──────────────────────────────────────────────────
// Sub-linear: height grows faster early, slower late (H ∝ D^0.7)
export const TRUNK_HEIGHT = {
  floor: 0.12,
  range: 0.88,
  exp: 0.7,
} as const;

export const TREE_STAGE_VISUALS = {
  seedling: {
    minTrunkScale: 0.20,
    stemScaleCap: 0.27,
    trunkBoost: 0.03,
    branchPrimaryScale: 0.92,
    branchSecondaryScale: 0.52,
    branchOriginPull: 0.86,
    branchOriginY: 246,
    branchSpreadScale: 0.18,
    leaderSpreadBonus: 0.04,
    canopyRadiusX: 64,
    canopyRadiusY: 54,
    canopyCenterYOffset: 6,
    canopyGrace: 1.03,
    canopySoftness: 0.42,
    leafOffsetScale: 0.20,
    spraySpread: 0.20,
    corridorStrength: 0.06,
    gapWidthBoost: 0.01,
    branchRiseBoost: 0,
    mainLeafStartT: 0.70,
    subLeafStartT: 0.22,
    juvenileNodeStep: 5,
    juvenileNodeSpread: 6,
    juvenileBaseLength: 14,
    juvenileLengthGain: 9,
  },
  sapling: {
    minTrunkScale: 0.31,
    stemScaleCap: 0.41,
    trunkBoost: 0.08,
    branchPrimaryScale: 0.94,
    branchSecondaryScale: 0.56,
    branchOriginPull: 0.58,
    branchOriginY: 232,
    branchSpreadScale: 0.40,
    leaderSpreadBonus: 0.08,
    canopyRadiusX: 92,
    canopyRadiusY: 86,
    canopyCenterYOffset: 12,
    canopyGrace: 1.04,
    canopySoftness: 0.44,
    leafOffsetScale: 0.72,
    spraySpread: 0.60,
    corridorStrength: 0.12,
    gapWidthBoost: 0.02,
    branchRiseBoost: 2,
    mainLeafStartT: 0.22,
    subLeafStartT: 0.20,
    juvenileNodeStep: 7,
    juvenileNodeSpread: 8,
    juvenileBaseLength: 24,
    juvenileLengthGain: 16,
  },
  growing: {
    minTrunkScale: 0.56,
    stemScaleCap: 1,
    trunkBoost: 0,
    branchPrimaryScale: 0.98,
    branchSecondaryScale: 0.70,
    branchOriginPull: 0.16,
    branchOriginY: 206,
    branchSpreadScale: 0.86,
    leaderSpreadBonus: 0.04,
    canopyRadiusX: 140,
    canopyRadiusY: 134,
    canopyCenterYOffset: 28,
    canopyGrace: 1.05,
    canopySoftness: 0.45,
    leafOffsetScale: 1.10,
    spraySpread: 1.04,
    corridorStrength: 0.22,
    gapWidthBoost: 0.04,
    branchRiseBoost: 3,
    mainLeafStartT: 0.10,
    subLeafStartT: 0.18,
    juvenileNodeStep: 0,
    juvenileNodeSpread: 0,
    juvenileBaseLength: 0,
    juvenileLengthGain: 0,
  },
  flourishing: {
    minTrunkScale: 0.72,
    stemScaleCap: 1,
    trunkBoost: 0,
    branchPrimaryScale: 1.0,
    branchSecondaryScale: 0.82,
    branchOriginPull: 0.05,
    branchOriginY: 198,
    branchSpreadScale: 0.98,
    leaderSpreadBonus: 0.02,
    canopyRadiusX: 144,
    canopyRadiusY: 138,
    canopyCenterYOffset: 31,
    canopyGrace: 1.07,
    canopySoftness: 0.46,
    leafOffsetScale: 0.94,
    spraySpread: 0.94,
    corridorStrength: 0.42,
    gapWidthBoost: 0.06,
    branchRiseBoost: 7,
    mainLeafStartT: 0.10,
    subLeafStartT: 0.18,
    juvenileNodeStep: 0,
    juvenileNodeSpread: 0,
    juvenileBaseLength: 0,
    juvenileLengthGain: 0,
  },
  ancient: {
    minTrunkScale: 0.86,
    stemScaleCap: 1,
    trunkBoost: 0,
    branchPrimaryScale: 1.03,
    branchSecondaryScale: 0.86,
    branchOriginPull: 0.02,
    branchOriginY: 194,
    branchSpreadScale: 1.0,
    leaderSpreadBonus: 0.02,
    canopyRadiusX: 148,
    canopyRadiusY: 154,
    canopyCenterYOffset: 28,
    canopyGrace: 1.07,
    canopySoftness: 0.42,
    leafOffsetScale: 0.98,
    spraySpread: 1.0,
    corridorStrength: 0.54,
    gapWidthBoost: 0.08,
    branchRiseBoost: 12,
    mainLeafStartT: 0.10,
    subLeafStartT: 0.18,
    juvenileNodeStep: 0,
    juvenileNodeSpread: 0,
    juvenileBaseLength: 0,
    juvenileLengthGain: 0,
  },
} as const satisfies Record<TreeStage, {
  minTrunkScale: number;
  stemScaleCap: number;
  trunkBoost: number;
  branchPrimaryScale: number;
  branchSecondaryScale: number;
  branchOriginPull: number;
  branchOriginY: number;
  branchSpreadScale: number;
  leaderSpreadBonus: number;
  canopyRadiusX: number;
  canopyRadiusY: number;
  canopyCenterYOffset: number;
  canopyGrace: number;
  canopySoftness: number;
  leafOffsetScale: number;
  spraySpread: number;
  corridorStrength: number;
  gapWidthBoost: number;
  branchRiseBoost: number;
  mainLeafStartT: number;
  subLeafStartT: number;
  juvenileNodeStep: number;
  juvenileNodeSpread: number;
  juvenileBaseLength: number;
  juvenileLengthGain: number;
}>;

export function trunkScaleFromG(g: number): number {
  return TRUNK_HEIGHT.floor + TRUNK_HEIGHT.range * Math.pow(Math.max(0, g), TRUNK_HEIGHT.exp);
}

// ── TRUNK WIDTH ───────────────────────────────────────────────────
// Exponent 0.65 < height's 0.7 → width grows slightly faster relative
// to height at low g. Range: 2.0 (seedling) → 14.0 (ancient).
export const TRUNK_WIDTH_PARAMS = {
  min: 2.0,
  range: 12.0,
  exp: 0.65,
} as const;

export function trunkBaseWidthFromG(g: number): number {
  return TRUNK_WIDTH_PARAMS.min + TRUNK_WIDTH_PARAMS.range * Math.pow(Math.max(0, g), TRUNK_WIDTH_PARAMS.exp);
}

// ── TRUNK COLOR (multi-stop lerp) ────────────────────────────────
export const TRUNK_COLOR_STOPS = [
  { g: 0.00, color: '#9CAF88' },  // seedling — green stem
  { g: 0.16, color: '#7A8C5E' },  // sapling  — olive
  { g: 0.50, color: '#6B5A3E' },  // growing  — light bark
  { g: 0.85, color: '#4E3A25' },  // flourishing — dark bark
  { g: 0.97, color: '#3A2A15' },  // ancient  — deep bark
] as const;

export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const ca = parse(a), cb = parse(b);
  const cl = Math.max(0, Math.min(1, t));
  const r = Math.round(ca.r + (cb.r - ca.r) * cl);
  const g = Math.round(ca.g + (cb.g - ca.g) * cl);
  const bv = Math.round(ca.b + (cb.b - ca.b) * cl);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

export function trunkColor(g: number): string {
  const stops = TRUNK_COLOR_STOPS;
  if (g <= stops[0].g) return stops[0].color;
  if (g >= stops[stops.length - 1].g) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    if (g >= stops[i].g && g <= stops[i + 1].g) {
      const t = (g - stops[i].g) / (stops[i + 1].g - stops[i].g);
      return lerpColor(stops[i].color, stops[i + 1].color, t);
    }
  }
  return stops[stops.length - 1].color;
}

// ── SWAY SCALING ──────────────────────────────────────────────────
// Seedlings are whippy (1.3×), ancient trees are stately (0.8×).
export const SWAY_SCALING = {
  base: 1.3,
  range: 0.5,
  min: 0.7,
  max: 1.3,
} as const;

export function swayMultiplier(g: number): number {
  return Math.max(SWAY_SCALING.min, Math.min(SWAY_SCALING.max, SWAY_SCALING.base - SWAY_SCALING.range * g));
}

// ── LEAF SIZE SCALING ─────────────────────────────────────────────
// Seedling leaves at 60% of defined size, ancient at 100%.
export const LEAF_SIZE_SCALING = {
  floor: 0.6,
  range: 0.4,
} as const;

export function leafSizeMultiplier(g: number): number {
  return LEAF_SIZE_SCALING.floor + LEAF_SIZE_SCALING.range * Math.max(0, Math.min(1, g));
}

// ── ROOT WIDTH SCALING ────────────────────────────────────────────
export const ROOT_SCALING = {
  floor: 0.5,
  range: 0.5,
} as const;

export function rootWidthScale(g: number): number {
  return ROOT_SCALING.floor + ROOT_SCALING.range * Math.max(0, Math.min(1, g));
}

// ── DA VINCI BRANCH WIDTH CONSTRAINT ──────────────────────────────
// D² = Σdᵢ² → each branch max width = sqrt(trunkWidth² / activeBranches)
export const DA_VINCI_EXPONENT = 2.0;

export function maxBranchWidth(trunkWidth: number, activeBranches: number): number {
  if (activeBranches <= 0) return 0;
  return Math.sqrt(Math.pow(trunkWidth, DA_VINCI_EXPONENT) / activeBranches);
}

// ── TRUNK TAPER ───────────────────────────────────────────────────
// 12 short segments along trunk Bézier, each with interpolated width.
export const TRUNK_TAPER = {
  segments: 12,
  tipRatio: 0.30,
} as const;

export function trunkTaperSegments(
  start: Point, control: Point, end: Point,
  scale: number, baseWidth: number,
): Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> {
  const { segments, tipRatio } = TRUNK_TAPER;
  const result: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> = [];
  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments) * scale;
    const t1 = ((i + 1) / segments) * scale;
    const p0 = quadBezierPoint(start, control, end, t0);
    const p1 = quadBezierPoint(start, control, end, t1);
    const frac = (i + 0.5) / segments;
    const w = baseWidth * (1 - frac * (1 - tipRatio));
    result.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, width: w });
  }
  return result;
}

// ── BRANCH TAPER ──────────────────────────────────────────────────
// 2-layer: thick base (60%) + thin full-length overlay.
export const BRANCH_TAPER = {
  segments: 8,
  tipWidthRatio: 0.30,
} as const;

export function branchTaperSegments(
  start: Point,
  control: Point,
  end: Point,
  scale: number,
  baseWidth: number,
): Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> {
  const { segments, tipWidthRatio } = BRANCH_TAPER;
  const result: Array<{ x1: number; y1: number; x2: number; y2: number; width: number }> = [];

  for (let i = 0; i < segments; i++) {
    const t0 = (i / segments) * scale;
    const t1 = ((i + 1) / segments) * scale;
    const p0 = quadBezierPoint(start, control, end, t0);
    const p1 = quadBezierPoint(start, control, end, t1);
    const frac = (i + 0.5) / segments;
    const width = baseWidth * (1 - frac * (1 - tipWidthRatio));
    result.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, width });
  }

  return result;
}

// ── PHYLLOTAXIS (Leaf Arrangement) ────────────────────────────────
// Alternating-side placement with golden-angle-derived offsets.
// Deterministic hash still used for residual jitter.
export const PHYLLOTAXIS = {
  goldenAngle: 137.508,
  alternateOffset: 0.65,
  spiralTightening: 0.85,
  baseRotationSpread: 22,
} as const;

// ── CANOPY ENVELOPE ───────────────────────────────────────────────
// Soft elliptical clamp — leaves that extend past get gently pulled in.
export const CANOPY = {
  radiusX: 156,
  radiusY: 140,
  centerX: 160,
  centerYOffset: 34,
  grace: 1.08,
  softness: 0.48,
} as const;

interface CanopyOverrides {
  radiusX?: number;
  radiusY?: number;
  centerYOffset?: number;
  grace?: number;
  softness?: number;
}

export function clampToCanopy(
  x: number,
  y: number,
  trunkTopY: number,
  overrides?: CanopyOverrides,
): { x: number; y: number } {
  const radiusX = overrides?.radiusX ?? CANOPY.radiusX;
  const radiusY = overrides?.radiusY ?? CANOPY.radiusY;
  const centerYOffset = overrides?.centerYOffset ?? CANOPY.centerYOffset;
  const grace = overrides?.grace ?? CANOPY.grace;
  const softness = overrides?.softness ?? CANOPY.softness;
  const cx = CANOPY.centerX;
  const cy = trunkTopY + centerYOffset;
  const dx = (x - cx) / radiusX;
  const dy = (y - cy) / radiusY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= grace) return { x, y };
  const overshoot = dist - grace;
  const clampedDist = grace + overshoot * softness;
  const scale = clampedDist / dist;
  return {
    x: cx + (x - cx) * scale,
    y: cy + (y - cy) * scale,
  };
}

// ── LEAF AGE SIZING ───────────────────────────────────────────────
// ageFraction: 0 = newest (tip), 1 = oldest (base).
// Old leaves at branch base grow big and dominant; new buds at tip are small.
export const LEAF_AGE_SIZE = {
  oldestScale: 1.42,     // base leaves larger, fuller inner crown
  newestScale: 0.68,     // tip leaves tighter, more delicate
  midpoint: 0.5,         // crossover at ageFraction 0.5
} as const;

export const TREE_PRAYER_COLORS = {
  dark: {
    fajr: '#97a7e3',
    dhuhr: '#89bea1',
    asr: '#bcc46a',
    maghrib: '#c18ca7',
    isha: '#6474b3',
  },
  light: {
    fajr: '#6579c1',
    dhuhr: '#5d9f7b',
    asr: '#a5a54a',
    maghrib: '#aa7791',
    isha: '#4a609b',
  },
  midnight: {
    fajr: '#9ba9e6',
    dhuhr: '#8ab9a0',
    asr: '#c0c76d',
    maghrib: '#c58da8',
    isha: '#6678b8',
  },
} as const;

export function resolveTreePrayerColor(
  mode: keyof typeof TREE_PRAYER_COLORS,
  prayer: string,
): string {
  const palette = TREE_PRAYER_COLORS[mode] || TREE_PRAYER_COLORS.dark;
  const key = prayer.toLowerCase() as keyof typeof palette;
  return palette[key] || palette.isha;
}

export function ageSizeMultiplier(ageFraction: number): number {
  const { oldestScale, newestScale, midpoint } = LEAF_AGE_SIZE;
  if (ageFraction >= midpoint) {
    const t = (ageFraction - midpoint) / (1 - midpoint);
    return 1.0 + (oldestScale - 1.0) * t;
  }
  const t = ageFraction / midpoint;
  return newestScale + (1.0 - newestScale) * t;
}

// ── LEAF AGE COLORING ─────────────────────────────────────────────
// ageFraction: 0 = newest (tip), 1 = oldest (base).
// Newest leaves are lighter/brighter, oldest are deeper.
export const LEAF_AGE_COLOR = {
  youngestLighten: 0.35,
  oldestDarken: 0.20,
  youngestOpacityBoost: 0.05,
} as const;

export function ageAdjustedColor(baseColor: string, ageFraction: number): string {
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });
  const c = parse(baseColor);
  const { youngestLighten, oldestDarken } = LEAF_AGE_COLOR;
  if (ageFraction < 0.5) {
    const t = 1 - ageFraction * 2;
    return `#${Math.round(Math.min(255, c.r + (255 - c.r) * youngestLighten * t)).toString(16).padStart(2, '0')}${Math.round(Math.min(255, c.g + (255 - c.g) * youngestLighten * t)).toString(16).padStart(2, '0')}${Math.round(Math.min(255, c.b + (255 - c.b) * youngestLighten * t)).toString(16).padStart(2, '0')}`;
  }
  const t = (ageFraction - 0.5) * 2;
  return `#${Math.round(Math.max(0, c.r * (1 - oldestDarken * t))).toString(16).padStart(2, '0')}${Math.round(Math.max(0, c.g * (1 - oldestDarken * t))).toString(16).padStart(2, '0')}${Math.round(Math.max(0, c.b * (1 - oldestDarken * t))).toString(16).padStart(2, '0')}`;
}

export function ageAdjustedOpacity(baseOpacity: number, ageFraction: number): number {
  const boost = ageFraction < 0.5
    ? LEAF_AGE_COLOR.youngestOpacityBoost * (1 - ageFraction * 2)
    : 0;
  return Math.min(1, baseOpacity + boost);
}

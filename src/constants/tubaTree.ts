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
  { prayer: 'Fajr' as PrayerName, curve: { start: { x: 160, y: 180 }, control: { x: 120, y: 150 }, end: { x: 60, y: 108 } }, baseAngle: -45 },
  { prayer: 'Dhuhr' as PrayerName, curve: { start: { x: 160, y: 178 }, control: { x: 200, y: 148 }, end: { x: 262, y: 106 } }, baseAngle: 45 },
  { prayer: 'Asr' as PrayerName, curve: { start: { x: 160, y: 202 }, control: { x: 200, y: 190 }, end: { x: 268, y: 160 } }, baseAngle: 55 },
  { prayer: 'Maghrib' as PrayerName, curve: { start: { x: 160, y: 202 }, control: { x: 120, y: 190 }, end: { x: 52, y: 160 } }, baseAngle: -55 },
  { prayer: 'Isha' as PrayerName, curve: { start: { x: 160, y: 160 }, control: { x: 161, y: 120 }, end: { x: 162, y: 50 } }, baseAngle: 0 },
];

export const STAGE_THRESHOLDS: { stage: TreeStage; min: number; max: number }[] = [
  { stage: 'seedling', min: 0, max: 4 },
  { stage: 'sapling', min: 5, max: 19 },
  { stage: 'growing', min: 20, max: 49 },
  { stage: 'flourishing', min: 50, max: 99 },
  { stage: 'ancient', min: 100, max: Infinity },
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
  seed: { base: 0.55, variance: 0.10 }, sprout: { base: 0.70, variance: 0.10 }, bloom: { base: 0.85, variance: 0.08 },
};
export const BLOOM_SPARKLE = { radius: 2, offsetRatio: 0.7 } as const;
export const BRANCH_STYLE = { minStrokeWidth: 2.5, maxStrokeWidth: 5.5, fullThicknessAt: 10 } as const;
export const MAX_LEAVES_PER_BRANCH = 12;
export const MAX_TOTAL_LEAVES = 60;
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
    colors: ['transparent', 'rgba(30,32,22,0.45)', 'rgba(24,29,56,0.82)', '#181D38'],
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
    locations: [0, 0.14, 0.38, 0.65, 1],
  },
  midnight: {
    // transparent → near-black earth → screen bg
    colors: ['transparent', 'rgba(16,18,12,0.50)', 'rgba(9,13,24,0.85)', '#090d18'],
    locations: [0, 0.28, 0.65, 1],
  },
} as const;

// Increase ratio slightly so the fade starts higher up the canvas —
// this gives more "ground merge" room without eating into the tree.
export const GROUND_HEIGHT_RATIO = 0.28;

// ═══════════════════════════════════════════════════════════════════
// SKY ELEMENTS
// ═══════════════════════════════════════════════════════════════════

export const STARS = [
  { x: 48, y: 24, size: 2, animDelay: 0 }, { x: 234, y: 36, size: 3, animDelay: 0.9 },
  { x: 147, y: 15, size: 2, animDelay: 1.5 }, { x: 282, y: 60, size: 2, animDelay: 0.4 },
  { x: 19, y: 54, size: 1.5, animDelay: 2.0 }, { x: 90, y: 90, size: 2, animDelay: 0.7 },
] as const;

export const TREE_CANVAS_HEIGHT = 296;

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
  forkT: { first: 0.70, second: 0.50 },
  lengthRatio: 0.45,
  spread: 35,
  strokeRatio: 0.5,
  opacity: 0.65,
  directions: [1, -1] as readonly number[],
  /** v3: softer departure — was 0.5 */
  controlFactor: 0.3,
  /** v3: tighter initial curve — was 0.6 */
  controlSpreadFactor: 0.4,
} as const;

export const SUB_BRANCH_STAGES: Record<string, number> = { flourishing: 1, ancient: 2 };

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
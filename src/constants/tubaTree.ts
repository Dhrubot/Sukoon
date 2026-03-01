// src/constants/tubaTree.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE — Geometry & Growth Constants                       ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  Single source of truth for the tree visualization.            ║
// ║  No magic numbers in components — everything lives here.       ║
// ║                                                                ║
// ║  The tree is rendered in a 320×300 SVG viewBox.                ║
// ║  Trunk base is at (160, 280), rising to (160, ~100).           ║
// ║  5 branches radiate outward, one per fard prayer.              ║
// ║  Leaves are placed parametrically along Bézier curves.         ║
// ╚══════════════════════════════════════════════════════════════════╝

import { PrayerName } from '../types';
import { GrowthStage } from '../types/garden';
import { BranchDefinition, Point, TreeStage } from '../types/tubaTree';

// ─── ViewBox ───────────────────────────────────────────────────────
export const TREE_VIEWBOX = {
  width: 320,
  height: 300,
} as const;

// ─── Trunk Geometry ────────────────────────────────────────────────
export const TRUNK = {
  start: { x: 160, y: 280 } as Point,
  control: { x: 159, y: 190 } as Point,
  end: { x: 160, y: 100 } as Point,
  /** Base width at ground level (scales with stage) */
  baseWidth: {
    seedling: 6,
    sapling: 8,
    growing: 10,
    flourishing: 12,
    ancient: 14,
  } as Record<TreeStage, number>,
} as const;

// ─── Root Geometry ─────────────────────────────────────────────────
export const ROOTS = [
  { d: 'M 160 280 C 146 284 128 287 112 285', width: 3.5, opacity: 0.55 },
  { d: 'M 160 280 C 174 284 192 287 208 285', width: 3.5, opacity: 0.55 },
  { d: 'M 156 283 C 148 288 136 292 122 291', width: 2, opacity: 0.35 },
  { d: 'M 164 283 C 172 288 184 292 198 291', width: 2, opacity: 0.35 },
] as const;

// ─── Branch Definitions ────────────────────────────────────────────
// Each branch is a quadratic Bézier from a trunk junction point
// curving outward. Order follows FARD_PRAYERS display order.
//
// Branch angles are inspired by the HTML mockup's layout:
//   Fajr     → upper-left  (pre-dawn, reaching toward horizon)
//   Dhuhr    → upper-right (sun at zenith, reaching high)
//   Asr      → mid-right   (afternoon, lower angle)
//   Maghrib  → mid-left    (sunset, mirror of Asr)
//   Isha     → straight up (night, crown of the tree)

export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    prayer: 'Fajr' as PrayerName,
    curve: {
      start: { x: 160, y: 180 },
      control: { x: 120, y: 150 },
      end: { x: 60, y: 108 },
    },
    baseAngle: -45,
  },
  {
    prayer: 'Dhuhr' as PrayerName,
    curve: {
      start: { x: 160, y: 178 },
      control: { x: 200, y: 148 },
      end: { x: 262, y: 106 },
    },
    baseAngle: 45,
  },
  {
    prayer: 'Asr' as PrayerName,
    curve: {
      start: { x: 160, y: 202 },
      control: { x: 200, y: 190 },
      end: { x: 268, y: 160 },
    },
    baseAngle: 55,
  },
  {
    prayer: 'Maghrib' as PrayerName,
    curve: {
      start: { x: 160, y: 202 },
      control: { x: 120, y: 190 },
      end: { x: 52, y: 160 },
    },
    baseAngle: -55,
  },
  {
    prayer: 'Isha' as PrayerName,
    curve: {
      start: { x: 160, y: 160 },
      control: { x: 161, y: 120 },
      end: { x: 162, y: 50 },
    },
    baseAngle: 0,
  },
];

// ─── Growth Stage Thresholds ───────────────────────────────────────
// Total reflections across all branches determines the tree's stage.
export const STAGE_THRESHOLDS: { stage: TreeStage; min: number; max: number }[] = [
  { stage: 'seedling',     min: 0,   max: 4   },
  { stage: 'sapling',      min: 5,   max: 19  },
  { stage: 'growing',      min: 20,  max: 49  },
  { stage: 'flourishing',  min: 50,  max: 99  },
  { stage: 'ancient',      min: 100, max: Infinity },
];

// ─── Stage Display Info ────────────────────────────────────────────
export const STAGE_INFO: Record<TreeStage, { name: string; arabic: string }> = {
  seedling:    { name: 'Seedling',     arabic: 'بِذْرَة' },
  sapling:     { name: 'Sapling',      arabic: 'شَتْلَة' },
  growing:     { name: 'Growing',      arabic: 'نَامِيَة' },
  flourishing: { name: 'Flourishing',  arabic: 'مُزْدَهِرَة' },
  ancient:     { name: 'Ancient',      arabic: 'عَتِيقَة' },
};

// ─── Leaf Sizing ───────────────────────────────────────────────────
// Ellipse radii by growth stage (mood 1-2 = seed, 3 = sprout, 4-5 = bloom)
export const LEAF_SIZES: Record<GrowthStage, { rx: number; ry: number }> = {
  seed:   { rx: 3,   ry: 4.5 },
  sprout: { rx: 4,   ry: 6.5 },
  bloom:  { rx: 5.5, ry: 8   },
};

// ─── Leaf Opacity by Growth Stage ──────────────────────────────────
export const LEAF_OPACITY: Record<GrowthStage, { base: number; variance: number }> = {
  seed:   { base: 0.55, variance: 0.10 },
  sprout: { base: 0.70, variance: 0.10 },
  bloom:  { base: 0.85, variance: 0.08 },
};

// ─── Bloom Sparkle ─────────────────────────────────────────────────
export const BLOOM_SPARKLE = {
  /** Radius of the gold circle on bloom leaves */
  radius: 2,
  /** Offset from leaf center toward the tip */
  offsetRatio: 0.7,
} as const;

// ─── Branch Rendering ──────────────────────────────────────────────
export const BRANCH_STYLE = {
  /** Minimum stroke width for a branch with 1 leaf */
  minStrokeWidth: 2.5,
  /** Maximum stroke width for a full branch */
  maxStrokeWidth: 5.5,
  /** How many leaves to reach max thickness */
  fullThicknessAt: 10,
} as const;

// ─── Performance Caps ──────────────────────────────────────────────
/** Max leaves rendered per branch to keep SVG performant */
export const MAX_LEAVES_PER_BRANCH = 12;

/** Max total leaves across all branches */
export const MAX_TOTAL_LEAVES = 60;

// ─── Leaf Jitter ───────────────────────────────────────────────────
// Small perpendicular offset for organic placement
export const LEAF_JITTER = {
  /** Max perpendicular offset in viewBox units */
  maxOffset: 8,
  /** Max rotation jitter in degrees */
  maxRotation: 25,
} as const;

// ─── Stars (decorative, dark themes only) ──────────────────────────
export const STARS = [
  { x: 48,  y: 24,  size: 2,   animDelay: 0    },
  { x: 234, y: 36,  size: 3,   animDelay: 0.9  },
  { x: 147, y: 15,  size: 2,   animDelay: 1.5  },
  { x: 282, y: 60,  size: 2,   animDelay: 0.4  },
  { x: 19,  y: 54,  size: 1.5, animDelay: 2.0  },
  { x: 90,  y: 90,  size: 2,   animDelay: 0.7  },
] as const;

// ─── Canvas Dimensions ─────────────────────────────────────────────
export const TREE_CANVAS_HEIGHT = 296;

// ═══════════════════════════════════════════════════════════════════
// ANIMATION CONSTANTS (Phase 2)
// All timing, amplitude, and easing values live here.
// ═══════════════════════════════════════════════════════════════════

// ─── Branch Sway ───────────────────────────────────────────────────
// Each branch oscillates gently around its base angle.
// Phase offsets prevent all branches swaying in unison.
export const BRANCH_SWAY = {
  /** Max rotation in degrees (±) — subtle, not a windstorm */
  amplitude: 1.0,
  /** Full sway cycle duration in ms (slow, organic) */
  duration: 10000,
  /** Phase offset per branch index in ms (stagger) */
  phaseOffset: 400,
} as const;

// ─── Leaf Entry Animation ──────────────────────────────────────────
// Leaves appear with a staggered fade-in + scale-up.
export const LEAF_ENTRY = {
  /** Duration of each leaf's entry (ms) */
  duration: 600,
  /** Base delay before the first leaf starts (ms) */
  baseDelay: 300,
  /** Stagger between consecutive leaves on the same branch (ms) */
  staggerPerLeaf: 80,
  /** Stagger between branches (ms) */
  staggerPerBranch: 150,
} as const;

// ─── Bloom Glow Pulse ──────────────────────────────────────────────
// Gold sparkle on bloom leaves pulses gently.
export const BLOOM_PULSE = {
  /** Min opacity during pulse */
  minOpacity: 0.45,
  /** Max opacity during pulse */
  maxOpacity: 0.95,
  /** Full pulse cycle duration (ms) */
  duration: 2400,
} as const;

// ─── Star Twinkle ──────────────────────────────────────────────────
// Stars fade and scale gently. Each star uses its animDelay from STARS[].
export const STAR_TWINKLE = {
  /** Min opacity (dim) */
  minOpacity: 0.15,
  /** Max opacity (bright) */
  maxOpacity: 0.70,
  /** Min scale */
  minScale: 0.9,
  /** Max scale */
  maxScale: 1.5,
  /** Full twinkle cycle duration (ms) */
  duration: 7000,
} as const;

// ─── Moon Float ────────────────────────────────────────────────────
// Crescent moon gently bobs up and down.
export const MOON_FLOAT = {
  /** Max Y translation in px (device-independent) */
  amplitude: 3,
  /** Full float cycle duration (ms) */
  duration: 6000,
  /** Max rotation in degrees */
  rotationAmplitude: 2,
} as const;

// ─── Moon Geometry ─────────────────────────────────────────────────
export const MOON = {
  /** SVG viewBox size for the crescent */
  size: 20,
  /** Position from top-right of canvas (percentage-based in TreeSky) */
  topPercent: 5,
  rightPercent: 7,
} as const;

// ─── Bézier Math Utilities ─────────────────────────────────────────

/**
 * Evaluate a quadratic Bézier curve at parameter t (0–1).
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
export function quadBezierPoint(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

/**
 * Get the tangent angle (in degrees) at parameter t on a quadratic Bézier.
 * Derivative: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
 */
export function quadBezierTangentAngle(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): number {
  const mt = 1 - t;
  const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Get the perpendicular direction at parameter t.
 * Returns a unit vector perpendicular to the tangent.
 */
export function quadBezierPerpendicular(
  start: Point,
  control: Point,
  end: Point,
  t: number,
): Point {
  const mt = 1 - t;
  const dx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular: rotate tangent by 90°
  return { x: -dy / len, y: dx / len };
}

/**
 * Build the SVG path `d` string for a quadratic Bézier,
 * optionally scaled by a length factor (0–1).
 * When scale < 1, the end point is interpolated toward start.
 */
export function branchPathD(
  start: Point,
  control: Point,
  end: Point,
  scale: number = 1,
): string {
  if (scale >= 1) {
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }
  // Scale the curve by moving control and end toward start
  const scaledControl = {
    x: start.x + (control.x - start.x) * scale,
    y: start.y + (control.y - start.y) * scale,
  };
  const scaledEnd = {
    x: start.x + (end.x - start.x) * scale,
    y: start.y + (end.y - start.y) * scale,
  };
  return `M ${start.x} ${start.y} Q ${scaledControl.x} ${scaledControl.y} ${scaledEnd.x} ${scaledEnd.y}`;
}

/**
 * Deterministic hash for leaf jitter — same inputs always produce the same offset.
 * Avoids Math.random() so the tree doesn't shift on re-render.
 */
export function leafHash(prayer: string, date: string, index: number): number {
  let hash = 0;
  const str = `${prayer}-${date}-${index}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 CONSTANTS
// ═══════════════════════════════════════════════════════════════════

// ─── Sub-Branches ──────────────────────────────────────────────────
// At Flourishing stage (50+), main branches sprout 1 sub-branch.
// At Ancient stage (100+), each main branch gets 2 sub-branches.
// Sub-branches fork from a point near the tip of the parent branch
// and curve outward at a diverging angle.

export const SUB_BRANCH = {
  /** Parametric t on the parent curve where the sub-branch forks (0.6–0.85 of visible length) */
  forkT: {
    first: 0.70,
    second: 0.50,
  },
  /** Relative length of sub-branch vs parent (0–1) */
  lengthRatio: 0.45,
  /** Perpendicular spread from parent tangent (in viewBox units) */
  spread: 35,
  /** Stroke width ratio vs parent branch */
  strokeRatio: 0.5,
  /** Opacity of sub-branch stroke */
  opacity: 0.65,
  /** Direction: 1 = outward from trunk, -1 = inward. First sub goes out, second in. */
  directions: [1, -1] as readonly number[],
} as const;

// Min stage for sub-branches to appear
export const SUB_BRANCH_STAGES: Record<string, number> = {
  flourishing: 1,  // 1 sub-branch per main branch
  ancient: 2,      // 2 sub-branches per main branch
};

// ─── Ramadan Mode ──────────────────────────────────────────────────
// During Ramadan, the tree transforms with gold intensification.

/** Additional stars that appear only during Ramadan */
export const RAMADAN_STARS = [
  { x: 70,  y: 18,  size: 2.5, animDelay: 0.3  },
  { x: 190, y: 28,  size: 2,   animDelay: 1.1  },
  { x: 260, y: 15,  size: 2.5, animDelay: 0.6  },
  { x: 35,  y: 78,  size: 1.5, animDelay: 1.8  },
  { x: 300, y: 42,  size: 2,   animDelay: 2.3  },
] as const;

/** How much to blend prayer colors toward gold during Ramadan (0–1) */
export const RAMADAN_GOLD_BLEND = 0.25;

/** Moon glow radius during Ramadan (viewBox units) */
export const RAMADAN_MOON_HALO = {
  radius: 16,
  opacity: 0.12,
} as const;

// ─── Leaf Detail Overlay ───────────────────────────────────────────
// Shown when user taps a leaf.
export const LEAF_DETAIL = {
  /** Hit target radius around each leaf center (larger than visual for touch) */
  hitRadius: 16,
  /** Overlay animation duration */
  animDuration: 250,
} as const;

// ─── Mini Tree (GardenTeaser) ──────────────────────────────────────
// Simplified tree silhouette for the home screen teaser card.
export const MINI_TREE = {
  viewBox: { width: 48, height: 56 },
  trunk: 'M 24 52 Q 24 36 24 20',
  branches: [
    'M 24 36 Q 18 30 10 26',   // left lower
    'M 24 36 Q 30 30 38 26',   // right lower
    'M 24 30 Q 16 22 8 16',    // left upper
    'M 24 30 Q 32 22 40 16',   // right upper
    'M 24 24 Q 24 14 24 6',    // center top
  ],
  roots: [
    'M 24 52 Q 18 54 12 53',
    'M 24 52 Q 30 54 36 53',
  ],
} as const;
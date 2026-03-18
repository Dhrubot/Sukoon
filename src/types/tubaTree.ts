// src/types/tubaTree.ts
//
// Type definitions for the Tuba Tree visualization.
// The tree maps prayer reflections to a growing organic tree:
//   - 5 branches = 5 fard prayers
//   - Leaves = individual reflections
//   - Leaf size = mood/growth stage
//   - Gold bloom = high-quality prayer (mood 4-5)

import { PrayerName } from './index';
import { GrowthStage } from './garden';

// ─── Tree Growth Stages ────────────────────────────────────────────
// Named progression based on total reflection count across all branches.
export type TreeStage =
  | 'seedling'      // 0–4 reflections
  | 'sapling'       // 5–19
  | 'growing'       // 20–49
  | 'flourishing'   // 50–99
  | 'ancient';      // 100+

// ─── Geometry Primitives ───────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  start: Point;
  control: Point;
  end: Point;
}

export type LeafTone = 'fresh' | 'aged';
export type LeafHueVariant = 'base' | 'sage' | 'olive' | 'amber';
export type LeafRenderKind = 'leaf' | 'bud' | 'cluster' | 'cotyledon' | 'paired';

// ─── Branch Definition (from constants) ────────────────────────────

export interface BranchDefinition {
  id: string;
  prayer: PrayerName;
  curve: BezierCurve;
  /** Angle in degrees for leaf rotation base */
  baseAngle: number;
  /** Relative share of a prayer's growth allocated to this primary branch */
  weight: number;
  /** Earliest tree stage where this branch can emerge */
  minStage: TreeStage;
  /** Minimum prayer reflections required before this branch can emerge */
  minLeaves: number;
}

// ─── Computed Tree Data (from service) ─────────────────────────────

/** A single leaf positioned on a branch */
export interface TreeLeafData {
  /** Unique key for React rendering */
  id: string;
  /** Position on the branch curve (0 = trunk junction, 1 = tip) */
  t: number;
  /** Final computed x position in viewBox */
  x: number;
  /** Final computed y position in viewBox */
  y: number;
  /** Rotation angle in degrees */
  rotation: number;
  /** Growth stage determines leaf size */
  growthStage: GrowthStage;
  /** Whether this leaf earned a gold bloom (mood 4-5) */
  isBloom: boolean;
  /** Whether this reflection included text */
  hasText: boolean;
  /** Opacity — slightly varied for organic feel */
  opacity: number;
  /** Whether this leaf is an archived (lifetime) leaf with no backing recent record */
  isArchived: boolean;
  /** Age fraction: 0 = newest (tip), 1 = oldest (base) — drives color variation */
  ageFraction: number;
  /** Tonal treatment within the prayer palette */
  tone: LeafTone;
  /** Subtle palette variation for canopy richness */
  hueVariant: LeafHueVariant;
  /** Visual treatment for early-stage reflection units */
  renderKind: LeafRenderKind;
  /** Prayer name (for detail overlay) */
  prayer: string;
  /** Date string YYYY-MM-DD (for detail overlay) */
  date: string;
  /** Mood score 1-5 (for detail overlay) */
  mood: number;
}

/** A computed branch with its leaves */
export interface TreeBranch {
  id: string;
  prayer: PrayerName;
  /** The branch's Bézier curve */
  curve: BezierCurve;
  /** 0–1 scale factor for branch length based on leaf count */
  lengthScale: number;
  /** Stroke width derived from leaf count */
  strokeWidth: number;
  /** Base angle from branch definition */
  baseAngle: number;
  /** All positioned leaves on this branch */
  leaves: TreeLeafData[];
  /** Sub-branches (Phase 3 — appear at Flourishing+ stages) */
  subBranches: SubBranch[];
}

/** Complete tree state for rendering */
export interface TreeData {
  branches: TreeBranch[];
  stage: TreeStage;
  totalLeaves: number;
  /** Bloom count (mood 4-5 reflections) */
  bloomCount: number;
  /** Materialized trunk curve with subtle lean/character */
  trunkCurve: BezierCurve;
  /** Trunk stroke width — scales with total reflections */
  trunkWidth: number;
  /**
   * Trunk height scale factor (0–1).
   * Data-driven trunk scale computed as:
   *   max(trunkScaleFromG(g), scaleToReachHighestBranchWithData)
   *
   * At seedling it renders as a short stub;
   * at ancient it reaches full height.
   */
  trunkScale: number;
  /** Continuous growth parameter [0, 1] — drives all geometry interpolation */
  g: number;
}

// ─── Sub-Branch (Phase 3) ──────────────────────────────────────────

/** A smaller branch that forks from a main branch */
export interface SubBranch {
  /** The sub-branch's Bézier curve */
  curve: BezierCurve;
  /** Stroke width */
  strokeWidth: number;
  /** Opacity */
  opacity: number;
  /** Leaves positioned along this sub-branch */
  leaves: TreeLeafData[];
}

// ─── Leaf Detail (Phase 3) ─────────────────────────────────────────

/** Data passed to the leaf detail overlay when a leaf is tapped */
export interface LeafDetailData {
  prayer: string;
  date: string;
  mood: number;
  growthStage: GrowthStage;
  hasText: boolean;
  /** Screen coordinates for overlay positioning */
  screenX: number;
  screenY: number;
}

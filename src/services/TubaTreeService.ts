// src/services/TubaTreeService.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE SERVICE                                             ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  Transforms GardenPlant[] into TreeData for rendering.         ║
// ║                                                                ║
// ║  DATA-DRIVEN TRUNK: The trunk grows to reach whichever         ║
// ║  branches actually have plant data. TRUNK_SCALE[stage] is      ║
// ║  only a minimum floor — data always wins.                      ║
// ║                                                                ║
// ║  BUG-1 FIX: Leaves positioned on SCALED Bézier curve           ║
// ║  BUG-3 FIX: Branches gated by computed trunk top               ║
// ║  BUG-4 FIX: Empty branches = lengthScale 0, no ghost stubs     ║
// ║                                                                ║
// ║  v2 FIXES:                                                     ║
// ║  FIX-2: Tip-weighted leaf distribution (power curve)           ║
// ║  FIX-3: Tighter jitter at tips for natural clustering          ║
// ║  FIX-4: Softer sub-branch departure angles                    ║
// ╚══════════════════════════════════════════════════════════════════╝

import { PrayerName } from '../types';
import { GardenPlant, GrowthStage } from '../types/garden';
import { TreeData, TreeBranch, TreeLeafData, TreeStage, SubBranch } from '../types/tubaTree';
import {
  BRANCH_DEFINITIONS,
  TRUNK,
  TRUNK_SCALE,
  TRUNK_TOP_PADDING,
  STAGE_THRESHOLDS,
  LEAF_OPACITY,
  LEAF_JITTER,
  LEAF_DISTRIBUTION,
  BRANCH_STYLE,
  MAX_LEAVES_PER_BRANCH,
  MAX_TOTAL_LEAVES,
  SUB_BRANCH,
  SUB_BRANCH_STAGES,
  quadBezierPoint,
  quadBezierTangentAngle,
  quadBezierPerpendicular,
  scaledBezier,
  leafHash,
  trunkTopY,
  trunkScaleForY,
} from '../constants/tubaTree';

class TubaTreeService {
  /**
   * Build the complete tree visualization data from garden plants.
   */
  buildTreeData(plants: GardenPlant[]): TreeData {
    const plantsByPrayer = this.groupByPrayer(plants);
    const totalLeaves = Math.min(plants.length, MAX_TOTAL_LEAVES);
    const stage = this.getTreeStage(plants.length);

    // ── DATA-DRIVEN TRUNK HEIGHT ──────────────────────────────────
    // 1. Find the highest branch junction (smallest Y) that has data
    // 2. Compute the scale needed to reach it (+ padding)
    // 3. Take the MAX of that and the stage floor
    //
    // This means your 7 plants as a sapling: if you have Fajr data
    // (junction y=180), the trunk grows to y≈170, even though the
    // sapling floor would only reach y≈235.

    let highestJunctionY = TRUNK.start.y; // start at base (280)

    for (const def of BRANCH_DEFINITIONS) {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      if (branchPlants.length > 0) {
        // This branch has data — trunk must reach its junction
        highestJunctionY = Math.min(highestJunctionY, def.curve.start.y);
      }
    }

    // Add padding above the highest junction
    const targetY = highestJunctionY - TRUNK_TOP_PADDING;
    const dataScale = trunkScaleForY(targetY);
    const stageFloor = TRUNK_SCALE[stage];
    const effectiveScale = Math.max(stageFloor, dataScale);

    // Now compute the actual trunk top for branch gating
    const currentTrunkTopY = trunkTopY(effectiveScale);

    const branches: TreeBranch[] = BRANCH_DEFINITIONS.map((def) => {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      return this.buildBranch(def.prayer, branchPlants, def, stage, currentTrunkTopY);
    });

    const bloomCount = plants.filter(
      (p) => p.growthStage === 'bloom' && p.mood >= 4,
    ).length;

    return {
      branches,
      stage,
      totalLeaves,
      bloomCount,
      trunkWidth: TRUNK.baseWidth[stage],
      trunkScale: effectiveScale,
    };
  }

  private groupByPrayer(plants: GardenPlant[]): Record<string, GardenPlant[]> {
    const groups: Record<string, GardenPlant[]> = {};
    for (const plant of plants) {
      if (!groups[plant.prayer]) groups[plant.prayer] = [];
      groups[plant.prayer].push(plant);
    }
    return groups;
  }

  private getTreeStage(totalReflections: number): TreeStage {
    for (const { stage, min, max } of STAGE_THRESHOLDS) {
      if (totalReflections >= min && totalReflections <= max) return stage;
    }
    return 'ancient';
  }

  private buildBranch(
    prayer: PrayerName,
    plants: GardenPlant[],
    def: typeof BRANCH_DEFINITIONS[number],
    stage: TreeStage,
    currentTrunkTopY: number,
  ): TreeBranch {
    // BUG-3 FIX: Branch visible only if trunk has grown past its junction.
    // Y increases downward, so junction must be >= trunkTop.
    const branchVisible = def.curve.start.y >= currentTrunkTopY;

    const visiblePlants = branchVisible ? plants.slice(0, MAX_LEAVES_PER_BRANCH) : [];
    const leafCount = visiblePlants.length;

    // BUG-4 FIX: 0 leaves = 0 length, no ghost stubs
    let lengthScale: number;
    let strokeWidth: number;

    if (!branchVisible || leafCount === 0) {
      lengthScale = 0;
      strokeWidth = 0;
    } else {
      lengthScale = Math.min(
        0.25 + (leafCount / MAX_LEAVES_PER_BRANCH) * 0.75,
        1.0,
      );
      strokeWidth =
        BRANCH_STYLE.minStrokeWidth +
        (Math.min(leafCount, BRANCH_STYLE.fullThicknessAt) /
          BRANCH_STYLE.fullThicknessAt) *
          (BRANCH_STYLE.maxStrokeWidth - BRANCH_STYLE.minStrokeWidth);
    }

    // BUG-1 FIX: Leaves positioned on SCALED curve
    const leaves = this.positionLeaves(prayer, visiblePlants, def, lengthScale);

    const subBranches = branchVisible
      ? this.computeSubBranches(def, lengthScale, strokeWidth, stage)
      : [];

    return {
      prayer,
      curve: def.curve,
      lengthScale,
      strokeWidth,
      baseAngle: def.baseAngle,
      leaves,
      subBranches,
    };
  }

  /**
   * Position leaves along the SCALED branch curve.
   *
   * BUG-1 FIX: Uses scaledBezier() to get the same shortened curve
   * that branchPathD() renders. Leaves can never float off-branch.
   *
   * ── v2 FIX-2: TIP-WEIGHTED DISTRIBUTION ────────────────────────
   * Old: t = (index + 1) / (n + 1)  — uniform spacing
   * New: t = floorT + range * pow(linearT, power)
   *
   * With power=0.7 and floorT=0.15, leaves naturally cluster toward
   * branch tips (where real foliage grows to catch sunlight) while
   * maintaining some presence along the inner branch.
   *
   * ── v2 FIX-3: TIP CLUSTER JITTER ──────────────────────────────
   * Leaves past tipClusterT (0.7) get halved jitter magnitude,
   * so they pack tighter at the tips creating visible foliage density.
   */
  private positionLeaves(
    prayer: PrayerName,
    plants: GardenPlant[],
    def: typeof BRANCH_DEFINITIONS[number],
    lengthScale: number,
  ): TreeLeafData[] {
    if (plants.length === 0 || lengthScale <= 0) return [];

    const { curve } = def;
    const n = plants.length;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, lengthScale);

    return plants.map((plant, index) => {
      // ── FIX-2: Tip-weighted t ──────────────────────────────────
      // Linear t in (0, 1) — same denominator trick as before
      const linearT = (index + 1) / (n + 1);
      // Apply power curve to push distribution toward tips
      const t = LEAF_DISTRIBUTION.floorT
        + LEAF_DISTRIBUTION.range * Math.pow(linearT, LEAF_DISTRIBUTION.power);

      // Evaluate on the SCALED curve
      const pos = quadBezierPoint(curve.start, scaled.control, scaled.end, t);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, t);

      const hash = leafHash(prayer, plant.date, index);
      const jitterSign = (hash % 2 === 0) ? 1 : -1;

      // ── FIX-3: Tighter jitter at tips ──────────────────────────
      // Leaves past tipClusterT get reduced jitter so they pack
      // tighter, creating visible foliage density at branch ends.
      const jitterScale = t > LEAF_DISTRIBUTION.tipClusterT
        ? LEAF_DISTRIBUTION.tipJitterScale
        : 1.0;
      const jitterMagnitude = ((hash % 100) / 100) * LEAF_JITTER.maxOffset * jitterSign * jitterScale;
      const rotationJitter = ((hash % 200 - 100) / 100) * LEAF_JITTER.maxRotation;

      const x = pos.x + perp.x * jitterMagnitude;
      const y = pos.y + perp.y * jitterMagnitude;

      const tangentAngle = quadBezierTangentAngle(curve.start, scaled.control, scaled.end, t);
      const rotation = tangentAngle + rotationJitter;

      const opacityConfig = LEAF_OPACITY[plant.growthStage];
      const opacityVariance = ((hash % 50 - 25) / 25) * opacityConfig.variance;
      const opacity = Math.max(0.4, Math.min(1, opacityConfig.base + opacityVariance));

      const isBloom = plant.mood >= 4 && plant.growthStage === 'bloom';

      return {
        id: `${prayer}-${plant.date}-${index}`,
        t,
        x,
        y,
        rotation,
        growthStage: plant.growthStage,
        isBloom,
        hasText: plant.hasText,
        opacity,
        prayer,
        date: plant.date,
        mood: plant.mood,
      };
    });
  }

  /**
   * Sub-branches use SCALED curve for fork point (consistent with BUG-1 fix).
   *
   * ── v2 FIX-4: SOFTER FORK DEPARTURE ────────────────────────────
   * Control point now sits at controlFactor=0.3 (was 0.5) along the
   * tangent with controlSpreadFactor=0.4 (was 0.6) perpendicular
   * spread. This creates a gentler curve that departs smoothly from
   * the parent branch instead of a rigid "V" fork.
   */
  private computeSubBranches(
    def: typeof BRANCH_DEFINITIONS[number],
    parentLengthScale: number,
    parentStrokeWidth: number,
    stage: TreeStage,
  ): SubBranch[] {
    const maxSubs = SUB_BRANCH_STAGES[stage] ?? 0;
    if (maxSubs === 0 || parentLengthScale < 0.4) return [];

    const results: SubBranch[] = [];
    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, parentLengthScale);

    for (let i = 0; i < maxSubs; i++) {
      const forkT = i === 0 ? SUB_BRANCH.forkT.first : SUB_BRANCH.forkT.second;
      const direction = SUB_BRANCH.directions[i] ?? 1;

      const forkPoint = quadBezierPoint(curve.start, scaled.control, scaled.end, forkT);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, forkT);
      const tangent = quadBezierTangentAngle(curve.start, scaled.control, scaled.end, forkT);

      const spread = SUB_BRANCH.spread * direction;
      const subLength = SUB_BRANCH.lengthRatio * parentLengthScale * 80;
      const tangentRad = (tangent * Math.PI) / 180;

      const endX = forkPoint.x + Math.cos(tangentRad) * subLength + perp.x * spread;
      const endY = forkPoint.y + Math.sin(tangentRad) * subLength + perp.y * spread;

      // ── FIX-4: Softer control point placement ──────────────────
      const ctrlX = forkPoint.x
        + Math.cos(tangentRad) * subLength * SUB_BRANCH.controlFactor
        + perp.x * spread * SUB_BRANCH.controlSpreadFactor;
      const ctrlY = forkPoint.y
        + Math.sin(tangentRad) * subLength * SUB_BRANCH.controlFactor
        + perp.y * spread * SUB_BRANCH.controlSpreadFactor;

      results.push({
        d: `M ${forkPoint.x.toFixed(1)} ${forkPoint.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
        strokeWidth: parentStrokeWidth * SUB_BRANCH.strokeRatio,
        opacity: SUB_BRANCH.opacity,
      });
    }

    return results;
  }
}

export default new TubaTreeService();
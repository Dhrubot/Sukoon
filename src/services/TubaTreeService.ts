// src/services/TubaTreeService.ts

import { PrayerName } from '../types';
import { GardenPlant, GrowthStage } from '../types/garden';
import { TreeData, TreeBranch, TreeLeafData, TreeStage, SubBranch } from '../types/tubaTree';
import {
  BRANCH_DEFINITIONS,
  TRUNK,
  STAGE_THRESHOLDS,
  LEAF_SIZES,
  LEAF_OPACITY,
  LEAF_JITTER,
  BRANCH_STYLE,
  MAX_LEAVES_PER_BRANCH,
  MAX_TOTAL_LEAVES,
  SUB_BRANCH,
  SUB_BRANCH_STAGES,
  quadBezierPoint,
  quadBezierTangentAngle,
  quadBezierPerpendicular,
  branchPathD,
  leafHash,
} from '../constants/tubaTree';

class TubaTreeService {
  /**
   * Build the complete tree visualization data from garden plants.
   */
  buildTreeData(plants: GardenPlant[]): TreeData {
    const plantsByPrayer = this.groupByPrayer(plants);
    const totalLeaves = Math.min(plants.length, MAX_TOTAL_LEAVES);
    const stage = this.getTreeStage(plants.length);

    const branches: TreeBranch[] = BRANCH_DEFINITIONS.map((def) => {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      return this.buildBranch(def.prayer, branchPlants, def, stage);
    });

    const bloomCount = plants.filter(
      (p) => p.growthStage === 'bloom' && p.mood >= 4
    ).length;

    const trunkWidth = TRUNK.baseWidth[stage];

    return {
      branches,
      stage,
      totalLeaves,
      bloomCount,
      trunkWidth,
    };
  }

  private groupByPrayer(plants: GardenPlant[]): Record<string, GardenPlant[]> {
    const groups: Record<string, GardenPlant[]> = {};
    for (const plant of plants) {
      const key = plant.prayer;
      if (!groups[key]) groups[key] = [];
      groups[key].push(plant);
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
  ): TreeBranch {
    const visiblePlants = plants.slice(0, MAX_LEAVES_PER_BRANCH);
    const leafCount = visiblePlants.length;

    const lengthScale = leafCount === 0
      ? 0.15
      : Math.min(0.3 + (leafCount / MAX_LEAVES_PER_BRANCH) * 0.7, 1.0);

    const strokeWidth = leafCount === 0
      ? BRANCH_STYLE.minStrokeWidth * 0.5
      : BRANCH_STYLE.minStrokeWidth +
        (Math.min(leafCount, BRANCH_STYLE.fullThicknessAt) /
          BRANCH_STYLE.fullThicknessAt) *
          (BRANCH_STYLE.maxStrokeWidth - BRANCH_STYLE.minStrokeWidth);

    const leaves = this.positionLeaves(prayer, visiblePlants, def);

    // Phase 3: Sub-branches
    const subBranches = this.computeSubBranches(def, lengthScale, strokeWidth, stage);

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

  private positionLeaves(
    prayer: PrayerName,
    plants: GardenPlant[],
    def: typeof BRANCH_DEFINITIONS[number],
  ): TreeLeafData[] {
    if (plants.length === 0) return [];

    const { curve, baseAngle } = def;
    const n = plants.length;

    return plants.map((plant, index) => {
      const t = (index + 1) / (n + 1);
      const pos = quadBezierPoint(curve.start, curve.control, curve.end, t);
      const perp = quadBezierPerpendicular(curve.start, curve.control, curve.end, t);

      const hash = leafHash(prayer, plant.date, index);
      const jitterSign = (hash % 2 === 0) ? 1 : -1;
      const jitterMagnitude = ((hash % 100) / 100) * LEAF_JITTER.maxOffset * jitterSign;
      const rotationJitter = ((hash % 200 - 100) / 100) * LEAF_JITTER.maxRotation;

      const x = pos.x + perp.x * jitterMagnitude;
      const y = pos.y + perp.y * jitterMagnitude;

      const tangentAngle = quadBezierTangentAngle(curve.start, curve.control, curve.end, t);
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
        // Phase 3: detail fields
        prayer,
        date: plant.date,
        mood: plant.mood,
      };
    });
  }

  // ─── Sub-Branch Computation (Phase 3) ─────────────────────────

  /**
   * Compute sub-branches for a main branch based on tree stage.
   * Sub-branches fork from a point along the parent curve and diverge outward.
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

    for (let i = 0; i < maxSubs; i++) {
      const forkT = i === 0 ? SUB_BRANCH.forkT.first : SUB_BRANCH.forkT.second;
      const effectiveT = forkT * parentLengthScale;
      const direction = SUB_BRANCH.directions[i] ?? 1;

      // Fork point on parent curve
      const forkPoint = quadBezierPoint(curve.start, curve.control, curve.end, effectiveT);
      const perp = quadBezierPerpendicular(curve.start, curve.control, curve.end, effectiveT);
      const tangent = quadBezierTangentAngle(curve.start, curve.control, curve.end, effectiveT);

      // Sub-branch curves outward from fork point
      const spread = SUB_BRANCH.spread * direction;
      const subLength = SUB_BRANCH.lengthRatio * parentLengthScale * 80; // scale to viewBox

      // Tangent direction in radians
      const tangentRad = (tangent * Math.PI) / 180;
      const endX = forkPoint.x + Math.cos(tangentRad) * subLength + perp.x * spread;
      const endY = forkPoint.y + Math.sin(tangentRad) * subLength + perp.y * spread;

      // Control point midway with perpendicular offset
      const ctrlX = forkPoint.x + Math.cos(tangentRad) * subLength * 0.5 + perp.x * spread * 0.6;
      const ctrlY = forkPoint.y + Math.sin(tangentRad) * subLength * 0.5 + perp.y * spread * 0.6;

      const d = `M ${forkPoint.x.toFixed(1)} ${forkPoint.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;

      results.push({
        d,
        strokeWidth: parentStrokeWidth * SUB_BRANCH.strokeRatio,
        opacity: SUB_BRANCH.opacity,
      });
    }

    return results;
  }
}

export default new TubaTreeService();
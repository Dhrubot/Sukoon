// src/services/TubaTreeService.ts
//
// v3 FIXES:
//   • Tip-weighted leaf distribution (LEAF_DISTRIBUTION)
//   • Tighter jitter at branch tips for natural clustering
//   • Softer sub-branch departure curves (controlFactor 0.3)
//   • __DEV__ logging to trace leaf placement issues

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
  buildTreeData(plants: GardenPlant[]): TreeData {
    const plantsByPrayer = this.groupByPrayer(plants);
    const totalLeaves = Math.min(plants.length, MAX_TOTAL_LEAVES);
    const stage = this.getTreeStage(plants.length);

    // ── DATA-DRIVEN TRUNK HEIGHT ──────────────────────────────────
    let highestJunctionY = TRUNK.start.y;

    for (const def of BRANCH_DEFINITIONS) {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      if (branchPlants.length > 0) {
        highestJunctionY = Math.min(highestJunctionY, def.curve.start.y);
      }
    }

    const targetY = highestJunctionY - TRUNK_TOP_PADDING;
    const dataScale = trunkScaleForY(targetY);
    const stageFloor = TRUNK_SCALE[stage];
    const effectiveScale = Math.max(stageFloor, dataScale);
    const currentTrunkTopY = trunkTopY(effectiveScale);

    if (__DEV__) {
      console.log('[TubaTree] ═══ buildTreeData ═══');
      console.log(`  plants: ${plants.length}, stage: ${stage}`);
      console.log(`  highestJunctionY: ${highestJunctionY}, targetY: ${targetY}`);
      console.log(`  dataScale: ${dataScale.toFixed(3)}, stageFloor: ${stageFloor}, effectiveScale: ${effectiveScale.toFixed(3)}`);
      console.log(`  trunkTopY: ${currentTrunkTopY.toFixed(1)}`);
      for (const def of BRANCH_DEFINITIONS) {
        const bp = plantsByPrayer[def.prayer] || [];
        const visible = def.curve.start.y >= currentTrunkTopY;
        console.log(`  ${def.prayer}: ${bp.length} plants, junction y=${def.curve.start.y}, visible=${visible}`);
      }
    }

    const branches: TreeBranch[] = BRANCH_DEFINITIONS.map((def) => {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      return this.buildBranch(def.prayer, branchPlants, def, stage, currentTrunkTopY);
    });

    const bloomCount = plants.filter(
      (p) => p.growthStage === 'bloom' && p.mood >= 4,
    ).length;

    if (__DEV__) {
      const totalRenderedLeaves = branches.reduce((sum, b) => sum + b.leaves.length, 0);
      console.log(`  totalRenderedLeaves: ${totalRenderedLeaves}, bloomCount: ${bloomCount}`);
      console.log('[TubaTree] ═══════════════════');
    }

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
    const branchVisible = def.curve.start.y >= currentTrunkTopY;
    const visiblePlants = branchVisible ? plants.slice(0, MAX_LEAVES_PER_BRANCH) : [];
    const leafCount = visiblePlants.length;

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

    const leaves = this.positionLeaves(prayer, visiblePlants, def, lengthScale);

    const subBranches = branchVisible
      ? this.computeSubBranches(def, lengthScale, strokeWidth, stage)
      : [];

    if (__DEV__ && leafCount > 0) {
      console.log(`  [${prayer}] lengthScale=${lengthScale.toFixed(3)}, leaves=${leaves.length}`);
      leaves.forEach((l, i) => {
        console.log(`    leaf[${i}]: t=${l.t.toFixed(3)}, x=${l.x.toFixed(1)}, y=${l.y.toFixed(1)}, stage=${l.growthStage}`);
      });
    }

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
   * v3: Tip-weighted leaf distribution.
   * Old: t = (index+1)/(n+1)  — uniform spacing
   * New: t = floorT + range * pow(linearT, power)
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
      // v3: tip-weighted distribution
      const linearT = (index + 1) / (n + 1);
      const t = LEAF_DISTRIBUTION.floorT
        + LEAF_DISTRIBUTION.range * Math.pow(linearT, LEAF_DISTRIBUTION.power);

      const pos = quadBezierPoint(curve.start, scaled.control, scaled.end, t);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, t);

      const hash = leafHash(prayer, plant.date, index);
      const jitterSign = (hash % 2 === 0) ? 1 : -1;

      // v3: tighter jitter at tips
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
   * v3: softer sub-branch fork departure.
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

      // v3: softer control point placement
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
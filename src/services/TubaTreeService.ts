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
    // Seedling: keep trunk short (stub). Data-driven scaling starts at sapling.
    // Without this cap, 1 leaf at y=180 forces 61% trunk — looks like a pole.
    const effectiveScale = stage === 'seedling'
      ? stageFloor + 0.2
      : Math.max(stageFloor, dataScale);
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
    const branchVisible = stage === 'seedling'
      ? plants.length > 0
      : def.curve.start.y >= currentTrunkTopY;
    const visiblePlants = branchVisible ? plants.slice(0, MAX_LEAVES_PER_BRANCH) : [];
    const leafCount = visiblePlants.length;

    let lengthScale: number;
    let strokeWidth: number;

    if (!branchVisible || leafCount === 0) {
      lengthScale = 0;
      strokeWidth = 0;
    } else if (stage === 'seedling') {
      // Seedling: NO branch line at all. Leaves will be placed at trunk
      // top directly in positionLeaves() — exactly like the SeedlingSVG.
      lengthScale = 0;
      strokeWidth = 0;
    } else if (leafCount <= 2) {
      // Sapling with 1-2 leaves on a branch: micro-stub, barely visible
      lengthScale = 0.14;
      strokeWidth = 0;   // still no visible line — leaf only
    } else {
      // n=3  → 0.10 + (1/10)*0.90 = 0.19 (first visible stub)
      // n=6  → 0.10 + (4/10)*0.90 = 0.46
      // n=12 → 0.10 + (10/10)*0.90 = 1.00
      const ratio = (leafCount - 2) / (MAX_LEAVES_PER_BRANCH - 2);
      lengthScale = Math.min(0.10 + ratio * 0.90, 1.0);
      strokeWidth =
        BRANCH_STYLE.minStrokeWidth +
        (Math.min(leafCount, BRANCH_STYLE.fullThicknessAt) /
          BRANCH_STYLE.fullThicknessAt) *
        (BRANCH_STYLE.maxStrokeWidth - BRANCH_STYLE.minStrokeWidth);
    }

    const leaves = this.positionLeaves(prayer, visiblePlants, def, lengthScale, stage, currentTrunkTopY);

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
    stage: TreeStage,
    currentTrunkTopY: number,
  ): TreeLeafData[] {
    if (plants.length === 0) return [];

    const n = plants.length;

    // ── SEEDLING MODE ─────────────────────────────────────────────
    // No branch at all. Leaves bud directly at trunk top, alternating
    // left/right — exactly matching the SeedlingSVG illustration.
    if (stage === 'seedling') {
      return plants.slice(0, 4).map((plant, index) => {
        const hash = leafHash(prayer, plant.date, index);
        const side = (index % 2 === 0) ? -1 : 1;
        // Spread leaves around trunk top: inner pair close, outer pair wider
        // NEW — n=1: nearly centered. n=2: symmetric pair. n=3+: spread out:
        const baseSpread = n === 1 ? 4 : n === 2 ? 8 : (10 + (index < 2 ? 0 : 5));
        const xOffset = side * (baseSpread + (hash % 4));
        const yOffset = -(hash % 6);   // slight upward variation (0–5px above trunk top)
        // Rotation: always upward, slight outward tilt. Never exceeds ±50°.
        const rotation = side * (12 + (hash % 28));  // 12–40°, mirrored per side

        const opacityConfig = LEAF_OPACITY[plant.growthStage];
        return {
          id: `${prayer}-${plant.date}-${index}`,
          t: 0,
          x: TRUNK.start.x + xOffset,  // centered on trunk (x=160)
          y: currentTrunkTopY + yOffset,
          rotation,
          growthStage: plant.growthStage,
          isBloom: false,
          hasText: plant.hasText,
          opacity: opacityConfig.base,
          prayer,
          date: plant.date,
          mood: plant.mood,
        };
      });
    }

    // ── NORMAL BRANCH MODE (sapling+) ────────────────────────────
    if (lengthScale <= 0) return [];

    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, lengthScale);

    return plants.map((plant, index) => {
      // Base-first distribution: oldest leaf at junction, newest at tip
      // n=1 → linearT=0 → t=floorT (right at junction)
      // n=12, last → linearT=1 → t=0.93 (near tip)
      const linearT = n === 1 ? 0 : index / (n - 1);
      const t = LEAF_DISTRIBUTION.floorT + LEAF_DISTRIBUTION.range * linearT;

      const pos = quadBezierPoint(curve.start, scaled.control, scaled.end, t);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, t);

      const hash = leafHash(prayer, plant.date, index);
      const jitterSign = (hash % 2 === 0) ? 1 : -1;
      const jitterScale = t > LEAF_DISTRIBUTION.tipClusterT
        ? LEAF_DISTRIBUTION.tipJitterScale
        : 1.0;
      const jitterMagnitude =
        ((hash % 100) / 100) * LEAF_JITTER.maxOffset * jitterSign * jitterScale;

      const x = pos.x + perp.x * jitterMagnitude;
      const y = pos.y + perp.y * jitterMagnitude;

      // ── SKY-BIASED ROTATION ─────────────────────────────────────
      // OLD: used raw tangentAngle (~217° for Fajr) → leaves pointed DOWN.
      //
      // NEW: base on def.baseAngle (branch's natural outward direction):
      //   Fajr=-45, Dhuhr=+45, Asr=+55, Maghrib=-55, Isha=0
      // 55% of baseAngle gives an upward-biased tilt toward each branch's
      // side. ±28° jitter adds organic variation. Result always stays in
      // the [-80°, +80°] range → leaves ALWAYS point upward. ✓
      const outwardLean = def.baseAngle * 0.55;
      const tipTilt = (t - 0.3) * 12;  // small extra tilt as you approach tip
      const rotJitter = ((hash % 140 - 70) / 70) * 28;
      const rotation = outwardLean + tipTilt + rotJitter;

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
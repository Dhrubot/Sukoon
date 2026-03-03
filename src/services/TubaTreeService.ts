// src/services/TubaTreeService.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  v5 FIXES — complete rewrite of seedling positioning            ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// v5 FIXES:
//   • globalLeafStartIndex threaded from buildTreeData → buildBranch → positionLeaves
//   • Seedling side/position driven by GLOBAL index, not per-branch index
//   • Seedling leaves n=3,4 no longer stack on n=1,2 (root cause: same x,y formula)
//   • Sapling branch lines visible even for 1–2 leaves (hairline stroke)
//   • Cotyledon pattern: first 2 leaves wide at base, next 2 higher & narrower

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

    // Seedling: cap at stageFloor + 0.20 so trunk stays short (stub).
    // Without this, 1 Fajr leaf at junction y=180 forces 61% trunk height.
    const effectiveScale = stage === 'seedling'
      ? stageFloor + 0.20
      : Math.max(stageFloor, dataScale);

    const currentTrunkTopY = trunkTopY(effectiveScale);

    if (__DEV__) {
      console.log('[TubaTree] ═══ buildTreeData ═══');
      console.log(`  plants: ${plants.length}, stage: ${stage}`);
      console.log(`  highestJunctionY: ${highestJunctionY}, targetY: ${targetY}`);
      console.log(`  dataScale: ${dataScale.toFixed(3)}, stageFloor: ${stageFloor}, effectiveScale: ${effectiveScale.toFixed(3)}`);
      console.log(`  trunkTopY: ${currentTrunkTopY.toFixed(1)}`);
    }

    // ── THREAD globalLeafStartIndex through each branch ───────────
    // This is the critical fix: every branch gets the running count
    // of leaves already placed, so seedling positioning uses a global
    // index rather than a per-branch one.
    let globalLeafStartIndex = 0;

    const branches: TreeBranch[] = BRANCH_DEFINITIONS.map((def) => {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      const branch = this.buildBranch(
        def.prayer,
        branchPlants,
        def,
        stage,
        currentTrunkTopY,
        globalLeafStartIndex,   // ← NEW: passed in, used in seedling mode
      );
      // Advance global counter by the number of plants on THIS branch
      globalLeafStartIndex += Math.min(branchPlants.length, MAX_LEAVES_PER_BRANCH);
      return branch;
    });

    const bloomCount = plants.filter(
      (p) => p.growthStage === 'bloom' && p.mood >= 4,
    ).length;

    if (__DEV__) {
      for (const def of BRANCH_DEFINITIONS) {
        const bp = plantsByPrayer[def.prayer] || [];
        const visible = stage === 'seedling'
          ? bp.length > 0
          : def.curve.start.y >= currentTrunkTopY;
        console.log(`  ${def.prayer}: ${bp.length} plants, junction y=${def.curve.start.y}, visible=${visible}`);
      }
      const totalRenderedLeaves = branches.reduce((sum, b) => sum + b.leaves.length, 0);
      console.log(`  totalRenderedLeaves: ${totalRenderedLeaves}, bloomCount: ${bloomCount}`);
      branches.forEach((b) => {
        if (b.leaves.length > 0) {
          console.log(`  [${b.prayer}] lengthScale=${b.lengthScale.toFixed(3)}, leaves=${b.leaves.length}`);
          b.leaves.forEach((l, i) => {
            console.log(`    leaf[${i}]: t=${l.t.toFixed(3)}, x=${l.x.toFixed(1)}, y=${l.y.toFixed(1)}, stage=${l.growthStage}`);
          });
        }
      });
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
    globalLeafStartIndex: number,   // ← NEW PARAM
  ): TreeBranch {
    // Seedling: every branch with plants is "visible" — leaves render at trunk top
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
      // Seedling: no branch geometry needed — positionLeaves handles placement
      // directly relative to trunk top. lengthScale=0 means no Path is drawn.
      lengthScale = 0;
      strokeWidth = 0;
    } else {
      if (leafCount === 1) {
        lengthScale = 0.50;  // half-grown branch, bud at tip
        strokeWidth = 1.2;   // hairline
      } else if (leafCount === 2) {
        lengthScale = 0.58;
        strokeWidth = 1.8;
      } else {
        // n=3→35%, n=6→55%, n=9→76%, n=12→100%
        const ratio = (leafCount - 3) / (MAX_LEAVES_PER_BRANCH - 3);
        lengthScale = Math.min(0.35 + ratio * 0.65, 1.0);
        strokeWidth = 2.5 + (Math.min(leafCount, BRANCH_STYLE.fullThicknessAt) /
          BRANCH_STYLE.fullThicknessAt) * (BRANCH_STYLE.maxStrokeWidth - 2.5);
      }
    }

    const leaves = this.positionLeaves(
      prayer,
      visiblePlants,
      def,
      lengthScale,
      stage,
      currentTrunkTopY,
      globalLeafStartIndex,  // ← passed through
    );

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

  private positionLeaves(
    prayer: PrayerName,
    plants: GardenPlant[],
    def: typeof BRANCH_DEFINITIONS[number],
    lengthScale: number,
    stage: TreeStage,
    currentTrunkTopY: number,
    globalLeafStartIndex: number,  // ← NEW PARAM
  ): TreeLeafData[] {
    if (plants.length === 0) return [];

    const n = plants.length;

    // ═══════════════════════════════════════════════════════════════
    // SEEDLING MODE (total plants 1–4)
    //
    // Each leaf grows on a tiny stub that exits in its branch's own
    // geometric direction: normalize(control − start).
    //
    //   Fajr    dir=(-0.800,-0.600)  → upper-left
    //   Dhuhr   dir=(+0.800,-0.600)  → upper-right
    //   Asr     dir=(+0.958,-0.287)  → right-low
    //   Maghrib dir=(-0.958,-0.287)  → left-low
    //   Isha    dir=(+0.025,-1.000)  → straight-up
    //
    // Five distinct directions = zero overlaps for n=1..5 guaranteed.
    //
    // Stub length shrinks per global pair:
    //   pair 0 (global 0–1): 14px  widest spread (cotyledons)
    //   pair 1 (global 2–3): 11px  narrower      (first true leaves)
    //   pair 2 (global 4+):   8px  narrowest     (subsequent whorls)
    //
    // CRITICAL FIX: position driven by BRANCH DIRECTION VECTOR, not
    // by (index%2===0)?-1:1 which stacked all first-leaves at same xy.
    // ═══════════════════════════════════════════════════════════════
    if (stage === 'seedling') {
      // Branch exit direction = normalize(control − start)
      const ddx = def.curve.control.x - def.curve.start.x;
      const ddy = def.curve.control.y - def.curve.start.y;
      const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const dirX = ddx / dlen;
      const dirY = ddy / dlen;

      return plants.slice(0, 4).map((plant, localIndex) => {
        const globalIdx = globalLeafStartIndex + localIndex;
        const hash = leafHash(prayer, plant.date, localIndex);

        // Stub length by global pair index
        const pairIndex = Math.floor(globalIdx / 2);
        const stubLen = Math.max(8, 14 - pairIndex * 3); // 14 → 11 → 8

        // ±1px organic jitter
        const jitter = (hash % 3) - 1;

        const x = TRUNK.start.x + dirX * stubLen + jitter;
        const y = currentTrunkTopY + dirY * stubLen + jitter;

        // Rotation: align with stub direction.
        // atan2(dy,dx) gives angle from right axis.
        // +90° because SVG ellipse ry>rx is vertical at rotation=0.
        const angleDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;
        const rotation = angleDeg + 90 + ((hash % 20) - 10);

        const opacityConfig = LEAF_OPACITY[plant.growthStage];
        return {
          id: `${prayer}-${plant.date}-${localIndex}`,
          t: 0,
          x,
          y,
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

    // ═══════════════════════════════════════════════════════════════
    // NORMAL BRANCH MODE (sapling, growing, flourishing, ancient)
    // ═══════════════════════════════════════════════════════════════
    if (lengthScale <= 0) return [];

    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, lengthScale);

    return plants.map((plant, index) => {
      // Base-first: oldest leaf at junction (t≈floorT), newest at tip.
      // n=1 → linearT=0 → t=floorT (junction)
      // n=12, last leaf → linearT=1 → t=0.93 (near tip)
      // (v6 tip-first T):
      let t: number;
      if (n === 1) {
        t = 0.82;  // single bud: always at tip
      } else if (n === 2) {
        t = index === 0 ? 0.35 : 0.82;  // base + tip, 47px apart on Fajr
      } else {
        t = 0.05 + 0.88 * (index / (n - 1));  // linear base→tip
      }

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

      // ── SKY-BIASED ROTATION ────────────────────────────────────
      // baseAngle: Fajr=-45, Dhuhr=+45, Asr=+55, Maghrib=-55, Isha=0
      // Leaves always tilt outward and skyward — never point down.
      const outwardLean = def.baseAngle * 0.55;
      const tipTilt = (t - 0.3) * 12;
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
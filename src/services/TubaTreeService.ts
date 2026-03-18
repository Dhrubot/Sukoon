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
import logger from '../utils/logger';
import { GardenPlant, GrowthStage } from '../types/garden';
import {
  BranchDefinition,
  LeafHueVariant,
  LeafTone,
  TreeData,
  TreeBranch,
  TreeLeafData,
  TreeStage,
  SubBranch,
} from '../types/tubaTree';
import { TreeGrowthState } from '../types/treeGrowthState';
import {
  BRANCH_DEFINITIONS,
  TRUNK,
  TRUNK_TOP_PADDING,
  LEAF_OPACITY,
  LEAF_JITTER,
  LEAF_DISTRIBUTION,
  MAX_LEAVES_PER_BRANCH,
  MAX_LEAVES_PER_SUB_BRANCH,
  MAX_TOTAL_LEAVES,
  SUB_BRANCH,
  SUB_BRANCH_STAGES,
  ANCIENT_FULL_THRESHOLD,
  PHYLLOTAXIS,
  quadBezierPoint,
  quadBezierTangentAngle,
  quadBezierPerpendicular,
  scaledBezier,
  leafHash,
  trunkTopY,
  trunkScaleForY,
  trunkScaleFromG,
  trunkBaseWidthFromG,
  maxBranchWidth,
  clampToCanopy,
  ageAdjustedOpacity,
  stageIndex,
} from '../constants/tubaTree';

interface PrimaryBranchPlan {
  def: BranchDefinition;
  lifetimeCount: number;
  recentPlants: GardenPlant[];
}

interface CurveMaterialization {
  curve: BranchDefinition['curve'];
}

interface CrownProfile {
  inputA: number;
  inputB: number;
  outputA: number;
  outputB: number;
  gapCenter: number;
  gapWidth: number;
}

class TubaTreeService {
  buildTreeData(growthState: TreeGrowthState, recentPlants: GardenPlant[]): TreeData {
    const { g, stage } = growthState;
    const plantsByPrayer = this.groupByPrayer(recentPlants);
    const branchPlans = this.planPrimaryBranches(growthState, plantsByPrayer);
    const trunkCurve = this.materializeTrunkCurve(growthState, g, stage);

    // ── CONTINUOUS TRUNK GEOMETRY FROM g ─────────────────────────
    const gScale = trunkScaleFromG(g);
    const trunkWidth = trunkBaseWidthFromG(g);

    // Data-driven override: ensure trunk reaches highest branch with data
    let highestJunctionY = TRUNK.start.y;
    for (const plan of branchPlans) {
      if (plan.lifetimeCount > 0) {
        highestJunctionY = Math.min(highestJunctionY, plan.def.curve.start.y);
      }
    }

    const targetY = highestJunctionY - TRUNK_TOP_PADDING;
    const dataScale = trunkScaleForY(targetY);

    // Seedling: cap trunk height so it stays a short stub
    const effectiveScale = stage === 'seedling'
      ? Math.min(gScale + 0.20, 0.35)
      : Math.max(gScale, dataScale);

    const currentTrunkTopY = trunkTopY(effectiveScale);

    // ── DA VINCI BRANCH WIDTH CONSTRAINT ─────────────────────────
    const activeBranches = branchPlans.length;
    const branchWidthCap = maxBranchWidth(trunkWidth, Math.max(1, activeBranches));

    if (__DEV__) {
      logger.log('[TubaTree] ═══ buildTreeData (v6 continuous) ═══');
      logger.log(`  g: ${g.toFixed(3)}, stage: ${stage}, lifetime: ${growthState.totalLifetimeReflections}`);
      logger.log(`  trunkWidth: ${trunkWidth.toFixed(1)}, gScale: ${gScale.toFixed(3)}, effectiveScale: ${effectiveScale.toFixed(3)}`);
      logger.log(`  branchWidthCap: ${branchWidthCap.toFixed(1)}, activeBranches: ${activeBranches}`);
    }

    // ── BUILD BRANCHES ───────────────────────────────────────────
    let globalLeafStartIndex = 0;

    const branches: TreeBranch[] = branchPlans.map((plan) => {
      const branch = this.buildBranch(
        plan.def,
        plan.recentPlants,
        plan.lifetimeCount,
        stage,
        g,
        currentTrunkTopY,
        branchWidthCap,
        globalLeafStartIndex,
        growthState.totalLifetimeReflections,
      );
      const subLeafCount = branch.subBranches.reduce((s, sb) => s + sb.leaves.length, 0);
      globalLeafStartIndex += Math.min(plan.lifetimeCount, MAX_LEAVES_PER_BRANCH) + subLeafCount;
      return branch;
    });

    const bloomCount = recentPlants.filter(
      (p) => p.growthStage === 'bloom' && p.mood >= 4,
    ).length;

    const totalLeaves = Math.min(growthState.totalLifetimeReflections, MAX_TOTAL_LEAVES);

    if (__DEV__) {
      const totalRenderedLeaves = branches.reduce((sum, b) => {
        const subLeaves = b.subBranches.reduce((s, sb) => s + sb.leaves.length, 0);
        return sum + b.leaves.length + subLeaves;
      }, 0);
      logger.log(`  totalRenderedLeaves: ${totalRenderedLeaves}, bloomCount: ${bloomCount}`);
      branches.forEach((b) => {
        const subLeaves = b.subBranches.reduce((s, sb) => s + sb.leaves.length, 0);
        if (b.leaves.length > 0 || subLeaves > 0) {
          logger.log(`  [${b.prayer}] lengthScale=${b.lengthScale.toFixed(3)}, leaves=${b.leaves.length}, subLeaves=${subLeaves}`);
        }
      });
      logger.log('[TubaTree] ═══════════════════');
    }

    return {
      branches,
      stage,
      totalLeaves,
      bloomCount,
      trunkCurve,
      trunkWidth,
      trunkScale: effectiveScale,
      g,
    };
  }

  private groupByPrayer(plants: GardenPlant[]): Record<string, GardenPlant[]> {
    const groups: Record<string, GardenPlant[]> = {};
    for (const plant of plants) {
      if (!groups[plant.prayer]) groups[plant.prayer] = [];
      groups[plant.prayer].push(plant);
    }
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => a.date.localeCompare(b.date));
    });
    return groups;
  }

  private planPrimaryBranches(
    growthState: TreeGrowthState,
    plantsByPrayer: Record<string, GardenPlant[]>,
  ): PrimaryBranchPlan[] {
    const plans: PrimaryBranchPlan[] = [];
    const orderedPrayers = Array.from(new Set(BRANCH_DEFINITIONS.map((def) => def.prayer)));

    for (const prayer of orderedPrayers) {
      const totalCount = growthState.branchLifetimeLeaves[prayer] || 0;
      if (totalCount <= 0) continue;

      const defs = BRANCH_DEFINITIONS
        .filter((def) => def.prayer === prayer)
        .filter((def) =>
          stageIndex(growthState.stage) >= stageIndex(def.minStage) && totalCount >= def.minLeaves,
        );

      const visibleDefs = (defs.length > 0 ? defs : BRANCH_DEFINITIONS.filter((def) => def.prayer === prayer))
        .slice(0, Math.min(totalCount, defs.length > 0 ? defs.length : 1));

      const lifetimeCounts = this.allocatePositiveCounts(
        totalCount,
        visibleDefs.map((def) => def.weight),
      );
      const prayerPlants = plantsByPrayer[prayer] || [];
      const recentCounts = this.allocateRecentCounts(prayerPlants.length, lifetimeCounts);

      let recentOffset = 0;

      visibleDefs.forEach((def, index) => {
        const recentCount = recentCounts[index] || 0;
        plans.push({
          def,
          lifetimeCount: lifetimeCounts[index] || 0,
          recentPlants: prayerPlants.slice(recentOffset, recentOffset + recentCount),
        });
        recentOffset += recentCount;
      });
    }

    return plans;
  }

  private allocatePositiveCounts(total: number, weights: number[]): number[] {
    if (total <= 0 || weights.length === 0) return [];

    const branchCount = Math.min(total, weights.length);
    const activeWeights = weights.slice(0, branchCount);
    const normalizedTotal = activeWeights.reduce((sum, weight) => sum + weight, 0) || branchCount;
    const counts = new Array(branchCount).fill(1);
    let remaining = total - branchCount;

    if (remaining <= 0) return counts;

    const shares = activeWeights.map((weight) => (weight / normalizedTotal) * remaining);
    const floors = shares.map((share) => Math.floor(share));
    let assigned = 0;

    floors.forEach((floor, index) => {
      counts[index] += floor;
      assigned += floor;
    });

    let leftover = remaining - assigned;
    const order = shares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .sort((a, b) => b.fraction - a.fraction);

    let cursor = 0;
    while (leftover > 0) {
      counts[order[cursor % order.length].index] += 1;
      leftover -= 1;
      cursor += 1;
    }

    return counts;
  }

  private allocateRecentCounts(recentTotal: number, capacities: number[]): number[] {
    if (recentTotal <= 0 || capacities.length === 0) {
      return new Array(capacities.length).fill(0);
    }

    const totalCapacity = capacities.reduce((sum, capacity) => sum + capacity, 0) || capacities.length;
    const counts = new Array(capacities.length).fill(0);
    const shares = capacities.map((capacity) => (capacity / totalCapacity) * recentTotal);

    let assigned = 0;
    shares.forEach((share, index) => {
      const floor = Math.min(capacities[index], Math.floor(share));
      counts[index] = floor;
      assigned += floor;
    });

    let leftover = recentTotal - assigned;
    const order = shares
      .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
      .sort((a, b) => b.fraction - a.fraction);

    let cursor = 0;
    while (leftover > 0 && order.length > 0) {
      const target = order[cursor % order.length].index;
      if (counts[target] < capacities[target]) {
        counts[target] += 1;
        leftover -= 1;
      }
      cursor += 1;
      if (cursor > order.length * Math.max(1, recentTotal)) break;
    }

    return counts;
  }

  private buildCrownProfile(signature: number, mode: 'main' | 'sub'): CrownProfile {
    if (mode === 'main') {
      const inputA = 0.34 + signature * 0.08;
      const inputB = 0.72 + signature * 0.05;
      const outputA = 0.22 + signature * 0.05;
      const outputB = 0.80 + signature * 0.04;

      return {
        inputA,
        inputB,
        outputA,
        outputB,
        gapCenter: (outputA + outputB) * 0.5,
        gapWidth: 0.13 + signature * 0.03,
      };
    }

    const inputA = 0.38 + signature * 0.06;
    const inputB = 0.74 + signature * 0.04;
    const outputA = 0.26 + signature * 0.04;
    const outputB = 0.78 + signature * 0.03;

    return {
      inputA,
      inputB,
      outputA,
      outputB,
      gapCenter: (outputA + outputB) * 0.5,
      gapWidth: 0.11 + signature * 0.02,
    };
  }

  private mapClusteredProgress(linear: number, profile: CrownProfile): number {
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 1.55);
    const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

    if (linear <= profile.inputA) {
      const local = profile.inputA <= 0 ? 0 : linear / profile.inputA;
      return profile.outputA * easeOut(local);
    }

    if (linear <= profile.inputB) {
      const local = (linear - profile.inputA) / Math.max(0.001, profile.inputB - profile.inputA);
      return profile.outputA + (profile.outputB - profile.outputA) * easeInOut(local);
    }

    const local = (linear - profile.inputB) / Math.max(0.001, 1 - profile.inputB);
    return profile.outputB + (1 - profile.outputB) * Math.pow(local, 1.3);
  }

  private buildBranch(
    def: BranchDefinition,
    recentPlants: GardenPlant[],
    lifetimeCount: number,
    stage: TreeStage,
    g: number,
    currentTrunkTopY: number,
    branchWidthCap: number,
    globalLeafStartIndex: number,
    totalLifetimeReflections: number,
  ): TreeBranch {
    const { prayer } = def;
    const { curve } = this.materializeBranchCurve(def, lifetimeCount, g, stage);
    // Use lifetime count for geometry (never regresses)
    const geometryCount = Math.min(lifetimeCount, MAX_LEAVES_PER_BRANCH);

    // Seedling: every branch with lifetime leaves is "visible"
    const branchVisible = stage === 'seedling'
      ? lifetimeCount > 0
      : curve.start.y >= currentTrunkTopY;

    let lengthScale: number;
    let strokeWidth: number;

    if (!branchVisible || geometryCount === 0) {
      lengthScale = 0;
      strokeWidth = 0;
    } else if (stage === 'seedling') {
      lengthScale = 0;
      strokeWidth = 0;
    } else {
      if (geometryCount === 1) {
        lengthScale = 0.50;
        strokeWidth = 1.2;
      } else if (geometryCount === 2) {
        lengthScale = 0.58;
        strokeWidth = 1.8;
      } else {
        const ratio = (geometryCount - 3) / (MAX_LEAVES_PER_BRANCH - 3);
        lengthScale = Math.min(0.35 + ratio * 0.65, 1.0);
        strokeWidth = 2.5 + (Math.min(geometryCount, 10) / 10) * 3.0;
      }
      // Da Vinci constraint: branch never thicker than its allotment
      strokeWidth = Math.min(strokeWidth, branchWidthCap);
    }

    // ── MERGE RECENT + ARCHIVED LEAVES ───────────────────────────
    // recentPlants provide the detail (mood, date, growthStage).
    // If lifetimeCount > recentPlants.length, the difference are archived.
    const visibleRecent = branchVisible ? recentPlants.slice(0, MAX_LEAVES_PER_BRANCH) : [];
    const archivedCount = Math.max(0, geometryCount - visibleRecent.length);

    const leaves = this.positionLeaves(
      prayer,
      visibleRecent,
      archivedCount,
      geometryCount,
      { ...def, curve },
      stage,
      g,
      currentTrunkTopY,
      globalLeafStartIndex,
    );

    // ── OVERFLOW LEAVES → SUB-BRANCHES ──────────────────────────
    // Any leaves beyond MAX_LEAVES_PER_BRANCH spill onto sub-branches.
    const overflowTotal = Math.max(0, lifetimeCount - MAX_LEAVES_PER_BRANCH);
    const overflowRecent = recentPlants.slice(MAX_LEAVES_PER_BRANCH);

    const subBranches = branchVisible
      ? this.computeSubBranches(
          prayer, { ...def, curve }, lengthScale, strokeWidth, stage, g, currentTrunkTopY,
          overflowTotal, overflowRecent,
          globalLeafStartIndex + leaves.length,
          totalLifetimeReflections,
        )
      : [];

    return {
      id: def.id,
      prayer,
      curve,
      lengthScale,
      strokeWidth,
      baseAngle: def.baseAngle,
      leaves,
      subBranches,
    };
  }

  private materializeBranchCurve(
    def: BranchDefinition,
    lifetimeCount: number,
    g: number,
    stage: TreeStage,
  ): CurveMaterialization {
    const curve = def.curve;
    const maturity = Math.min(1, lifetimeCount / Math.max(6, def.minLeaves + 6));
    const stageFactor = Math.max(0, stageIndex(stage)) / 4;
    const growthFactor = Math.max(maturity, stageFactor * 0.85, g * 0.7);
    const signature = (leafHash(def.id, def.prayer, 0) % 100) / 100;
    const centered = (signature - 0.5) * 2;
    const secondaryFactor = def.weight < 0.5 ? 1 : 0.55;
    const angleSign = def.baseAngle === 0 ? centered || 1 : Math.sign(def.baseAngle);
    const ancientLift = stage === 'ancient' ? 7 + g * 8 : 0;
    const upwardLift = (6 + 10 * secondaryFactor) * growthFactor + ancientLift * 0.45;
    const controlLateral = (4 + 8 * secondaryFactor) * angleSign * growthFactor + centered * 4;
    const endLateral = (8 + 16 * secondaryFactor) * angleSign * growthFactor + centered * 8;
    const endRise = upwardLift + Math.abs(centered) * 5 * growthFactor + ancientLift;

    return {
      curve: {
        start: curve.start,
        control: {
          x: curve.control.x + controlLateral,
          y: curve.control.y - upwardLift * 0.5 - ancientLift * 0.2,
        },
        end: {
          x: curve.end.x + endLateral,
          y: curve.end.y - endRise,
        },
      },
    };
  }

  private materializeTrunkCurve(
    growthState: TreeGrowthState,
    g: number,
    stage: TreeStage,
  ): BranchDefinition['curve'] {
    const leftMass = (growthState.branchLifetimeLeaves.Fajr || 0) + (growthState.branchLifetimeLeaves.Maghrib || 0) * 0.92;
    const rightMass = (growthState.branchLifetimeLeaves.Dhuhr || 0) + (growthState.branchLifetimeLeaves.Asr || 0) * 0.92;
    const centerMass = growthState.branchLifetimeLeaves.Isha || 0;
    const denominator = Math.max(1, leftMass + rightMass + centerMass * 0.4);
    const asymmetry = Math.max(-1, Math.min(1, (rightMass - leftMass) / denominator));
    const ageFactor = Math.min(1, 0.35 + g * 0.8);
    const controlShift = asymmetry * (3 + 5 * ageFactor);
    const endShift = asymmetry * (5 + 8 * ageFactor);
    const crownNudge = centerMass > Math.max(leftMass, rightMass) ? 0 : asymmetry * 1.2;
    const ancientLift = stage === 'ancient' ? 8 + g * 10 : 0;

    return {
      start: TRUNK.start,
      control: {
        x: TRUNK.control.x + controlShift,
        y: TRUNK.control.y - g * 2 - ancientLift * 0.35,
      },
      end: {
        x: TRUNK.end.x + endShift + crownNudge,
        y: TRUNK.end.y - g * 3 - ancientLift,
      },
    };
  }

  private resolveLeafTone(
    growthStage: GrowthStage,
    ageFraction: number,
    t: number,
    hash: number,
  ): LeafTone {
    if (growthStage === 'seed' || ageFraction < 0.48 || t >= 0.88) {
      return 'fresh';
    }

    return hash % 5 === 0 ? 'aged' : 'fresh';
  }

  private resolveLeafHueVariant(
    growthStage: GrowthStage,
    ageFraction: number,
    t: number,
    hash: number,
  ): LeafHueVariant {
    if (growthStage === 'seed' || t >= 0.90 || ageFraction < 0.18) {
      return 'base';
    }

    const bucket = hash % 12;
    if (bucket <= 6) return 'base';
    if (bucket <= 8) return 'sage';
    if (bucket <= 10) return 'olive';
    return 'amber';
  }

  private positionLeaves(
    prayer: PrayerName,
    recentPlants: GardenPlant[],
    archivedCount: number,
    totalCount: number,
    def: typeof BRANCH_DEFINITIONS[number],
    stage: TreeStage,
    g: number,
    currentTrunkTopY: number,
    globalLeafStartIndex: number,
  ): TreeLeafData[] {
    if (totalCount === 0) return [];

    const n = totalCount;

    // ═══════════════════════════════════════════════════════════════
    // SEEDLING MODE — preserved from v5, with isArchived + ageFraction
    // ═══════════════════════════════════════════════════════════════
    if (stage === 'seedling') {
      const ddx = def.curve.control.x - def.curve.start.x;
      const ddy = def.curve.control.y - def.curve.start.y;
      const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const dirX = ddx / dlen;
      const dirY = ddy / dlen;

      const seedlingLeaves: TreeLeafData[] = [];
      const seedlingN = Math.min(n, 4);

      for (let localIndex = 0; localIndex < seedlingN; localIndex++) {
        const globalIdx = globalLeafStartIndex + localIndex;
        const plant = recentPlants[localIndex];
        const isArchived = !plant;
        const hash = leafHash(prayer, plant?.date ?? `archived-${localIndex}`, localIndex);

        const pairIndex = Math.floor(globalIdx / 2);
        const stubLen = Math.max(8, 14 - pairIndex * 3);
        const jitter = (hash % 3) - 1;

        const x = TRUNK.start.x + dirX * stubLen + jitter;
        const y = currentTrunkTopY + dirY * stubLen + jitter;

        const angleDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;
        const rotation = angleDeg + 90 + ((hash % 20) - 10);

        const growthStage: GrowthStage = plant?.growthStage ?? 'sprout';
        const opacityConfig = LEAF_OPACITY[growthStage];
        const baseOpacity = isArchived ? opacityConfig.base * 0.85 : opacityConfig.base;
        const ageFraction = seedlingN > 1 ? 1 - (localIndex / (seedlingN - 1)) : 0;

        seedlingLeaves.push({
          id: `${prayer}-${plant?.date ?? `arch-${localIndex}`}-${localIndex}`,
          t: 0,
          x,
          y,
          rotation,
          growthStage,
          isBloom: false,
          hasText: plant?.hasText ?? false,
          opacity: ageAdjustedOpacity(baseOpacity, ageFraction),
          isArchived,
          ageFraction,
          tone: 'fresh',
          hueVariant: 'base',
          prayer,
          date: plant?.date ?? '',
          mood: plant?.mood ?? 3,
        });
      }
      return seedlingLeaves;
    }

    // ═══════════════════════════════════════════════════════════════
    // NORMAL BRANCH MODE — phyllotaxis + canopy + age coloring
    // ═══════════════════════════════════════════════════════════════

    // Compute branch lengthScale from geometry count (same logic as buildBranch)
    let lengthScale: number;
    if (n === 1) {
      lengthScale = 0.50;
    } else if (n === 2) {
      lengthScale = 0.58;
    } else {
      const ratio = (n - 3) / (MAX_LEAVES_PER_BRANCH - 3);
      lengthScale = Math.min(0.35 + ratio * 0.65, 1.0);
    }

    if (lengthScale <= 0) return [];

    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, lengthScale);
    const leaves: TreeLeafData[] = [];
    const branchSignature = (leafHash(def.id, prayer, n) % 100) / 100;
    const crownProfile = this.buildCrownProfile(branchSignature, 'main');

    // Build merged leaf list: archived at base, recent at tip
    // Index 0 = oldest (base), index n-1 = newest (tip)
    for (let index = 0; index < n; index++) {
      const isArchived = index < archivedCount;
      const recentIdx = index - archivedCount;
      const plant = isArchived ? null : (recentPlants[recentIdx] ?? null);

      // ── T-POSITION ──────────────────────────────────────────
      let t: number;
      if (n === 1) {
        t = LEAF_DISTRIBUTION.mainTipT;
      } else if (n === 2) {
        t = index === 0 ? 0.42 : LEAF_DISTRIBUTION.mainTipT;
      } else {
        const linear = index / (n - 1);
        const clustered = this.mapClusteredProgress(linear, crownProfile);

        t = index === n - 1
          ? LEAF_DISTRIBUTION.mainTipT
          : LEAF_DISTRIBUTION.floorT
            + (LEAF_DISTRIBUTION.mainTipT - LEAF_DISTRIBUTION.floorT) * clustered;
      }

      const pos = quadBezierPoint(curve.start, scaled.control, scaled.end, t);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, t);

      // ── PHYLLOTAXIS: alternating sides + tightening offset ──
      const hash = leafHash(prayer, plant?.date ?? `arch-${index}`, index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * (1 - t * PHYLLOTAXIS.spiralTightening);
      const clusterSpread = 1 + Math.sin((index / Math.max(1, n - 1)) * Math.PI * 2 + branchSignature * Math.PI) * 0.14;
      const corridorProximity = Math.max(
        0,
        1 - Math.abs((t - crownProfile.gapCenter) / Math.max(0.001, crownProfile.gapWidth)),
      );
      const jitterFrac = ((hash % 100) / 100) * 0.3;
      const corridorTightening = 1 - corridorProximity * 0.42;
      const perpMagnitude = (offsetMag + jitterFrac)
        * LEAF_JITTER.maxOffset
        * clusterSpread
        * corridorTightening
        * phyllSign;

      let x = pos.x + perp.x * perpMagnitude;
      let y = pos.y + perp.y * perpMagnitude;

      // ── CANOPY CLAMP ────────────────────────────────────────
      const clamped = clampToCanopy(x, y, currentTrunkTopY);
      x = clamped.x;
      y = clamped.y;

      // ── ROTATION (sky-biased + phyllotaxis influence) ───────
      const outwardLean = def.baseAngle * 0.55;
      const tipTilt = (t - 0.3) * 12;
      const phyllRot = phyllSign * PHYLLOTAXIS.baseRotationSpread * (1 - t * 0.5);
      const rotJitter = ((hash % 60 - 30) / 30) * 14;
      const rotation = outwardLean + tipTilt + phyllRot + rotJitter;

      // ── GROWTH STAGE + OPACITY ──────────────────────────────
      const growthStage: GrowthStage = plant?.growthStage ?? 'sprout';
      const opacityConfig = LEAF_OPACITY[growthStage];
      const opacityVariance = ((hash % 50 - 25) / 25) * opacityConfig.variance;
      const rawOpacity = isArchived
        ? opacityConfig.base * 0.85
        : Math.max(0.4, Math.min(1, opacityConfig.base + opacityVariance - corridorProximity * 0.06));

      // ── AGE FRACTION ────────────────────────────────────────
      // 0 = newest (tip), 1 = oldest (base)
      const ageFraction = n > 1 ? 1 - (index / (n - 1)) : 0;
      const opacity = ageAdjustedOpacity(rawOpacity, ageFraction);

      const isBloom = !isArchived && (plant?.mood ?? 0) >= 4 && growthStage === 'bloom';
      const tone = this.resolveLeafTone(growthStage, ageFraction, t, hash);
      const hueVariant = this.resolveLeafHueVariant(growthStage, ageFraction, t, hash);
      leaves.push({
        id: `${prayer}-${plant?.date ?? `arch-${index}`}-${index}`,
        t,
        x,
        y,
        rotation,
        growthStage,
        isBloom,
        hasText: plant?.hasText ?? false,
        opacity,
        isArchived,
        ageFraction,
        tone,
        hueVariant,
        prayer,
        date: plant?.date ?? '',
        mood: plant?.mood ?? 3,
      });
    }

    return leaves;
  }

  private computeSubBranches(
    prayer: PrayerName,
    def: typeof BRANCH_DEFINITIONS[number],
    parentLengthScale: number,
    parentStrokeWidth: number,
    stage: TreeStage,
    g: number,
    currentTrunkTopY: number,
    overflowTotal: number,
    overflowRecent: GardenPlant[],
    subLeafGlobalStart: number,
    totalLifetimeReflections: number,
  ): SubBranch[] {
    // Resolve effective sub-branch count: ancientFull (3) at 1000+ reflections
    const effectiveStage = (stage === 'ancient' && totalLifetimeReflections >= ANCIENT_FULL_THRESHOLD)
      ? 'ancientFull'
      : stage;
    const maxSubs = SUB_BRANCH_STAGES[effectiveStage] ?? 0;
    if (maxSubs === 0 || parentLengthScale < 0.4) return [];
    const actualSubCount = Math.min(maxSubs, overflowTotal);
    if (actualSubCount === 0) return [];

    const results: SubBranch[] = [];
    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, parentLengthScale);
    const subCounts = this.allocatePositiveCounts(
      overflowTotal,
      SUB_BRANCH.forkT.slice(0, actualSubCount).map((forkT) => 1 - forkT + 0.2),
    );
    const recentCounts = this.allocateRecentCounts(overflowRecent.length, subCounts);

    let overflowOffset = 0;
    let recentOffset = 0;

    for (let i = 0; i < actualSubCount; i++) {
      const forkT = SUB_BRANCH.forkT[i] ?? 0.35;
      const direction = SUB_BRANCH.directions[i] ?? 1;
      const branchSignature = (leafHash(def.id, `${prayer}-sub`, i) % 100) / 100;
      const centeredSignature = (branchSignature - 0.5) * 2;

      const forkPoint = quadBezierPoint(curve.start, scaled.control, scaled.end, forkT);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, forkT);
      const tangent = quadBezierTangentAngle(curve.start, scaled.control, scaled.end, forkT);

      const spread = (SUB_BRANCH.spread + centeredSignature * 8) * direction;
      const subLength = SUB_BRANCH.lengthRatio * parentLengthScale * (76 + branchSignature * 18);
      const tangentRad = (tangent * Math.PI) / 180;

      const endX = forkPoint.x + Math.cos(tangentRad) * subLength + perp.x * spread;
      const endY = forkPoint.y + Math.sin(tangentRad) * subLength + perp.y * spread - (6 + branchSignature * 6);

      const ctrlX = forkPoint.x
        + Math.cos(tangentRad) * subLength * SUB_BRANCH.controlFactor
        + perp.x * spread * (SUB_BRANCH.controlSpreadFactor + centeredSignature * 0.08);
      const ctrlY = forkPoint.y
        + Math.sin(tangentRad) * subLength * SUB_BRANCH.controlFactor
        + perp.y * spread * (SUB_BRANCH.controlSpreadFactor + centeredSignature * 0.08)
        - (3 + branchSignature * 4);

      // ── Position overflow leaves on this sub-branch ──────────
      const subLeafCount = Math.min(subCounts[i] ?? 0, MAX_LEAVES_PER_SUB_BRANCH);
      if (subLeafCount === 0) {
        continue;
      }
      const subRecentCount = Math.min(recentCounts[i] ?? 0, subLeafCount);
      const subRecentSlice = overflowRecent.slice(recentOffset, recentOffset + subRecentCount);
      const subArchivedCount = Math.max(0, subLeafCount - subRecentSlice.length);

      const subCurve = {
        start: forkPoint,
        control: { x: ctrlX, y: ctrlY },
        end: { x: endX, y: endY },
      };

      const subLeaves = this.positionSubBranchLeaves(
        prayer, subCurve, subLeafCount, subRecentSlice, subArchivedCount,
        def.baseAngle, direction, g, currentTrunkTopY,
        subLeafGlobalStart + overflowOffset,
      );

      overflowOffset += subLeafCount;
      recentOffset += subRecentCount;

      results.push({
        curve: subCurve,
        strokeWidth: parentStrokeWidth * SUB_BRANCH.strokeRatio,
        opacity: SUB_BRANCH.opacity,
        leaves: subLeaves,
      });
    }

    return results;
  }

  // ─── Position leaves along a sub-branch curve ───────────────────
  private positionSubBranchLeaves(
    prayer: PrayerName,
    curve: { start: { x: number; y: number }; control: { x: number; y: number }; end: { x: number; y: number } },
    totalCount: number,
    recentPlants: GardenPlant[],
    archivedCount: number,
    parentBaseAngle: number,
    direction: number,
    g: number,
    currentTrunkTopY: number,
    globalStartIndex: number,
  ): TreeLeafData[] {
    if (totalCount === 0) return [];

    const n = totalCount;
    const leaves: TreeLeafData[] = [];
    const branchSignature = (leafHash(prayer, `sub-${globalStartIndex}`, n) % 100) / 100;
    const crownProfile = this.buildCrownProfile(branchSignature, 'sub');

    for (let index = 0; index < n; index++) {
      const isArchived = index < archivedCount;
      const recentIdx = index - archivedCount;
      const plant = isArchived ? null : (recentPlants[recentIdx] ?? null);

      // ── T-POSITION: spread along sub-branch ────────────────
      let t: number;
      if (n === 1) {
        t = LEAF_DISTRIBUTION.subTipT;
      } else {
        const linear = index / (n - 1);
        const clustered = this.mapClusteredProgress(linear, crownProfile);
        t = index === n - 1
          ? LEAF_DISTRIBUTION.subTipT
          : 0.18 + (LEAF_DISTRIBUTION.subTipT - 0.18) * clustered;
      }

      const pos = quadBezierPoint(curve.start, curve.control, curve.end, t);
      const perp = quadBezierPerpendicular(curve.start, curve.control, curve.end, t);

      // ── PHYLLOTAXIS: alternating sides, tighter than main branch ──
      const hash = leafHash(prayer, plant?.date ?? `sub-${index}`, globalStartIndex + index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * 0.6 * (1 - t * 0.5);
      const clusterSpread = 1 + Math.sin((index / Math.max(1, n - 1)) * Math.PI * 2 + branchSignature * Math.PI) * 0.10;
      const corridorProximity = Math.max(
        0,
        1 - Math.abs((t - crownProfile.gapCenter) / Math.max(0.001, crownProfile.gapWidth)),
      );
      const jitterFrac = ((hash % 100) / 100) * 0.2;
      const perpMag = (offsetMag + jitterFrac)
        * LEAF_JITTER.maxOffset
        * 0.7
        * clusterSpread
        * (1 - corridorProximity * 0.34)
        * phyllSign;

      let x = pos.x + perp.x * perpMag;
      let y = pos.y + perp.y * perpMag;

      // ── CANOPY CLAMP ──────────────────────────────────────
      const clamped = clampToCanopy(x, y, currentTrunkTopY);
      x = clamped.x;
      y = clamped.y;

      // ── ROTATION ──────────────────────────────────────────
      const outwardLean = parentBaseAngle * 0.4 * direction;
      const tipTilt = (t - 0.3) * 8;
      const phyllRot = phyllSign * 15 * (1 - t * 0.5);
      const rotJitter = ((hash % 40 - 20) / 20) * 10;
      const rotation = outwardLean + tipTilt + phyllRot + rotJitter;

      // ── GROWTH STAGE + OPACITY ────────────────────────────
      const growthStage: GrowthStage = plant?.growthStage ?? 'sprout';
      const opacityConfig = LEAF_OPACITY[growthStage];
      const rawOpacity = isArchived
        ? opacityConfig.base * 0.80
        : Math.max(0.4, Math.min(1, opacityConfig.base - corridorProximity * 0.05));

      // ── AGE FRACTION ──────────────────────────────────────
      // Sub-branch leaves are newer than main branch leaves
      const ageFraction = n > 1 ? 1 - (index / (n - 1)) : 0;
      // Scale down: sub-branch leaves are overall younger
      const adjustedAge = ageFraction * 0.6;
      const opacity = ageAdjustedOpacity(rawOpacity, adjustedAge);

      const isBloom = !isArchived && (plant?.mood ?? 0) >= 4 && growthStage === 'bloom';
      const tone = this.resolveLeafTone(growthStage, adjustedAge, t, hash);
      const hueVariant = this.resolveLeafHueVariant(growthStage, adjustedAge, t, hash);
      leaves.push({
        id: `${prayer}-sub-${plant?.date ?? `arch-${index}`}-${globalStartIndex + index}`,
        t,
        x,
        y,
        rotation,
        growthStage,
        isBloom,
        hasText: plant?.hasText ?? false,
        opacity,
        isArchived,
        ageFraction: adjustedAge,
        tone,
        hueVariant,
        prayer,
        date: plant?.date ?? '',
        mood: plant?.mood ?? 3,
      });
    }

    return leaves;
  }
}

export default new TubaTreeService();

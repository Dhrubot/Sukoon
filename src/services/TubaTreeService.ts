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
  LeafRenderKind,
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
  STAGE_THRESHOLDS,
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
  TREE_STAGE_VISUALS,
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

interface ResolvedBranchGeometry {
  curve: BranchDefinition['curve'];
  renderedCurve: BranchDefinition['curve'];
  lengthScale: number;
  strokeWidth: number;
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
    const stageProfile = TREE_STAGE_VISUALS[stage];
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
    const effectiveScale = stageIndex(stage) <= stageIndex('sapling')
      ? Math.min(
          Math.max(gScale + stageProfile.trunkBoost, stageProfile.minTrunkScale),
          stageProfile.stemScaleCap,
        )
      : Math.max(gScale, dataScale, stageProfile.minTrunkScale);

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

    const rawBranches: TreeBranch[] = branchPlans.map((plan) => {
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
    const branches = stage === 'seedling'
      ? this.resolveSeedlingLeafSeparation(rawBranches)
      : rawBranches;

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
    const orderedPrayers: PrayerName[] = ['Maghrib', 'Fajr', 'Isha', 'Dhuhr', 'Asr'];

    for (const prayer of orderedPrayers) {
      const totalCount = growthState.branchLifetimeLeaves[prayer] || 0;
      const prayerDefs = BRANCH_DEFINITIONS.filter((def) => def.prayer === prayer);
      const primaryDef = prayerDefs.find((def) => this.isPrimaryDefinition(def));
      if (totalCount <= 0 || !primaryDef) continue;

      const defs = prayerDefs
        .filter((def) =>
          stageIndex(growthState.stage) >= stageIndex(def.minStage)
            && (totalCount >= def.minLeaves || this.isPrimaryDefinition(def)),
        );
      if (defs.length === 0) continue;

      const visibleDefs = defs.slice(0, Math.max(1, Math.min(Math.max(totalCount, 1), defs.length)));

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

  private isPrimaryDefinition(def: BranchDefinition): boolean {
    return def.id.endsWith('primary');
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
    const stageProfile = TREE_STAGE_VISUALS[this.currentStage];
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
        gapWidth: 0.13 + signature * 0.03 + stageProfile.gapWidthBoost,
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
      gapWidth: 0.11 + signature * 0.02 + stageProfile.gapWidthBoost * 0.7,
    };
  }

  private currentStage: TreeStage = 'seedling';

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
    this.currentStage = stage;
    const { prayer } = def;
    const { curve } = this.materializeBranchCurve(def, lifetimeCount, g, stage, totalLifetimeReflections);
    const branchStageScale = this.resolveStageBranchScale(def, stage);
    const isPrimary = this.isPrimaryDefinition(def);
    const showEarlyStem = stageIndex(stage) <= stageIndex('sapling') && isPrimary;
    // Use lifetime count for geometry (never regresses)
    const geometryCount = Math.min(lifetimeCount, MAX_LEAVES_PER_BRANCH);

    const branchVisible = showEarlyStem
      ? true
      : lifetimeCount > 0 && curve.start.y >= currentTrunkTopY;

    let lengthScale: number;
    let strokeWidth: number;

    if (!branchVisible) {
      lengthScale = 0;
      strokeWidth = 0;
    } else if (geometryCount === 0 && showEarlyStem) {
      lengthScale = stage === 'seedling' ? 0.20 : 0.28;
      strokeWidth = stage === 'seedling' ? 1.0 : 1.25;
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
      lengthScale = Math.max(0.18, Math.min(1, lengthScale * branchStageScale));
      strokeWidth *= 0.9 + branchStageScale * 0.1;
      if (stage === 'seedling') {
        lengthScale = Math.min(lengthScale, def.prayer === 'Isha' ? 0.38 : 0.32);
      }
    }

    const branchGeometry = this.resolveBranchGeometry(curve, lengthScale, strokeWidth);

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
      currentTrunkTopY,
      globalLeafStartIndex,
      branchGeometry,
    );

    // ── OVERFLOW LEAVES → SUB-BRANCHES ──────────────────────────
    // Any leaves beyond MAX_LEAVES_PER_BRANCH spill onto sub-branches.
    const overflowTotal = Math.max(0, lifetimeCount - MAX_LEAVES_PER_BRANCH);
    const overflowRecent = recentPlants.slice(MAX_LEAVES_PER_BRANCH);

    const subBranches = branchVisible
      ? this.computeSubBranches(
          prayer, { ...def, curve }, branchGeometry, stage, currentTrunkTopY,
          overflowTotal, overflowRecent,
          globalLeafStartIndex + leaves.length,
          totalLifetimeReflections,
        )
      : [];

    return {
      id: def.id,
      prayer,
      curve: branchGeometry.curve,
      lengthScale: branchGeometry.lengthScale,
      strokeWidth: branchGeometry.strokeWidth,
      baseAngle: def.baseAngle,
      leaves,
      subBranches,
    };
  }

  private resolveBranchGeometry(
    curve: BranchDefinition['curve'],
    lengthScale: number,
    strokeWidth: number,
  ): ResolvedBranchGeometry {
    const scaled = scaledBezier(curve.start, curve.control, curve.end, lengthScale);
    return {
      curve,
      renderedCurve: {
        start: curve.start,
        control: scaled.control,
        end: scaled.end,
      },
      lengthScale,
      strokeWidth,
    };
  }

  private materializeBranchCurve(
    def: BranchDefinition,
    lifetimeCount: number,
    g: number,
    stage: TreeStage,
    totalLifetimeReflections: number,
  ): CurveMaterialization {
    if (stage === 'seedling' || stage === 'sapling') {
      return this.materializeJuvenileBranchCurve(def, lifetimeCount, stage);
    }

    const mature = this.materializeMatureBranchCurve(def, lifetimeCount, g, stage);
    if (stage !== 'growing') {
      return mature;
    }

    const stageProgress = this.resolveStageProgress(stage, totalLifetimeReflections);
    const juvenile = this.materializeJuvenileBranchCurve(def, Math.max(1, lifetimeCount), 'sapling');
    const primaryBlendFloor = def.weight < 0.5 ? 0.34 : 0.20;
    const blend = Math.max(primaryBlendFloor, Math.min(1, primaryBlendFloor + stageProgress * 0.8));

    return {
      curve: this.blendCurve(juvenile.curve, mature.curve, blend),
    };
  }

  private materializeMatureBranchCurve(
    def: BranchDefinition,
    lifetimeCount: number,
    g: number,
    stage: TreeStage,
  ): CurveMaterialization {
    const stageProfile = TREE_STAGE_VISUALS[stage];
    const curve = def.curve;
    const maturity = Math.min(1, lifetimeCount / Math.max(6, def.minLeaves + 6));
    const stageFactor = Math.max(0, stageIndex(stage)) / 4;
    const growthFactor = Math.max(maturity, stageFactor * 0.85, g * 0.7);
    const signature = (leafHash(def.id, def.prayer, 0) % 100) / 100;
    const centered = (signature - 0.5) * 2;
    const secondaryFactor = def.weight < 0.5 ? 1 : 0.55;
    const angleSign = def.baseAngle === 0 ? centered || 1 : Math.sign(def.baseAngle);
    const ancientLift = stage === 'ancient' ? 7 + g * 8 : 0;
    const upwardLift = (6 + 10 * secondaryFactor) * growthFactor + ancientLift * 0.45 + stageProfile.branchRiseBoost;
    const controlLateral = (4 + 8 * secondaryFactor) * angleSign * growthFactor + centered * 4;
    const endLateral = (8 + 16 * secondaryFactor) * angleSign * growthFactor + centered * 8;
    const endRise = upwardLift + Math.abs(centered) * 5 * growthFactor + ancientLift;
    const topNarrowing = stage === 'ancient' && def.prayer === 'Isha' ? 0.76 : 1;
    const lateralScale = def.weight < 0.5 ? 0.88 : 1;
    const spreadBonus = def.prayer === 'Isha'
      ? stageProfile.leaderSpreadBonus
      : (def.prayer === 'Fajr' || def.prayer === 'Dhuhr')
        ? stageProfile.leaderSpreadBonus * 0.55
        : 0;
    const spreadScale = stageProfile.branchSpreadScale + spreadBonus;
    const origin = {
      x: 160 + centered * (stageProfile.branchOriginPull > 0.5 ? 1.2 : 0.6),
      y: stageProfile.branchOriginY,
    };
    const start = {
      x: curve.start.x + (origin.x - curve.start.x) * stageProfile.branchOriginPull,
      y: curve.start.y + (origin.y - curve.start.y) * stageProfile.branchOriginPull,
    };
    const controlBase = {
      x: start.x + (curve.control.x - curve.start.x) * spreadScale,
      y: start.y + (curve.control.y - curve.start.y) * spreadScale,
    };
    const endBase = {
      x: start.x + (curve.end.x - curve.start.x) * spreadScale,
      y: start.y + (curve.end.y - curve.start.y) * spreadScale,
    };

    return {
      curve: {
        start,
        control: {
          x: controlBase.x + controlLateral * lateralScale,
          y: controlBase.y - upwardLift * 0.5 - ancientLift * 0.2,
        },
        end: {
          x: endBase.x + endLateral * lateralScale * topNarrowing,
          y: endBase.y - endRise,
        },
      },
    };
  }

  private resolveStageProgress(stage: TreeStage, totalLifetimeReflections: number): number {
    const threshold = STAGE_THRESHOLDS.find((candidate) => candidate.stage === stage);
    if (!threshold) return 1;
    if (!Number.isFinite(threshold.max)) return 1;
    const range = Math.max(1, threshold.max - threshold.min);
    const linear = Math.max(0, Math.min(1, (totalLifetimeReflections - threshold.min) / range));
    return Math.pow(linear, 0.82);
  }

  private blendCurve(
    from: BranchDefinition['curve'],
    to: BranchDefinition['curve'],
    t: number,
  ): BranchDefinition['curve'] {
    const mix = (a: number, b: number) => a + (b - a) * t;
    return {
      start: {
        x: mix(from.start.x, to.start.x),
        y: mix(from.start.y, to.start.y),
      },
      control: {
        x: mix(from.control.x, to.control.x),
        y: mix(from.control.y, to.control.y),
      },
      end: {
        x: mix(from.end.x, to.end.x),
        y: mix(from.end.y, to.end.y),
      },
    };
  }

  private materializeJuvenileBranchCurve(
    def: BranchDefinition,
    lifetimeCount: number,
    stage: TreeStage,
  ): CurveMaterialization {
    const stageProfile = TREE_STAGE_VISUALS[stage];
    const rankMap: Record<PrayerName, number> = {
      Maghrib: -2,
      Fajr: -1,
      Isha: 0,
      Dhuhr: 1,
      Asr: 2,
    };
    const rank = rankMap[def.prayer] ?? 0;
    const isLeader = def.prayer === 'Isha';
    const isShoulder = def.prayer === 'Fajr' || def.prayer === 'Dhuhr';
    const growthFactor = Math.min(1, lifetimeCount / (stage === 'seedling' ? 3 : 8));
    const nodeBand = isLeader ? 0 : isShoulder ? 1 : 2;
    const emergenceSpread = stage === 'seedling' ? 0.12 : 0.16;
    const peelSpread = stage === 'seedling'
      ? isLeader
        ? 0.05
        : isShoulder
          ? 0.48
          : 0.68
      : isLeader
        ? 0.10
        : isShoulder
          ? 0.86
          : 1.08;
    const baseX = 160 + rank * stageProfile.juvenileNodeSpread * emergenceSpread;
    const baseY = stageProfile.branchOriginY + nodeBand * stageProfile.juvenileNodeStep;
    const angleDeg = stage === 'seedling'
      ? isLeader
        ? 1
        : isShoulder
          ? rank * 10
          : rank * 12
      : isLeader
        ? 3
        : isShoulder
          ? rank * 16
          : rank * 20;
    const angleRad = (angleDeg * Math.PI) / 180;
    const lengthBase = stageProfile.juvenileBaseLength
      * (isLeader ? 1.14 : isShoulder ? 0.94 : 0.82);
    const length = lengthBase + stageProfile.juvenileLengthGain * growthFactor;
    const emergenceRise = (stage === 'seedling' ? 4.8 : 7.2)
      + growthFactor * (stage === 'seedling' ? 2.0 : 3.0)
      + (isLeader ? 1.4 : 0);
    const peelLength = Math.max(6, length - emergenceRise);
    const peelX = 160 + rank * stageProfile.juvenileNodeSpread * peelSpread;
    const end = {
      x: peelX + Math.sin(angleRad) * peelLength,
      y: baseY - emergenceRise - Math.cos(angleRad) * peelLength,
    };
    const control = {
      x: baseX + rank * stageProfile.juvenileNodeSpread * (stage === 'seedling' ? 0.22 : 0.30),
      y: baseY - emergenceRise,
    };

    return {
      curve: {
        start: {
          x: baseX,
          y: baseY,
        },
        control,
        end,
      },
    };
  }

  private materializeTrunkCurve(
    growthState: TreeGrowthState,
    g: number,
    stage: TreeStage,
  ): BranchDefinition['curve'] {
    const stageProfile = TREE_STAGE_VISUALS[stage];
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
    const stageLift = stageProfile.branchRiseBoost * 0.6;

    return {
      start: TRUNK.start,
      control: {
        x: TRUNK.control.x + controlShift,
        y: TRUNK.control.y - g * 2 - ancientLift * 0.35 - stageLift * 0.4,
      },
      end: {
        x: TRUNK.end.x + endShift + crownNudge,
        y: TRUNK.end.y - g * 3 - ancientLift - stageLift,
      },
    };
  }

  private resolveStageBranchScale(def: BranchDefinition, stage: TreeStage): number {
    const profile = TREE_STAGE_VISUALS[stage];
    const isSecondary = def.weight < 0.5;
    const base = isSecondary ? profile.branchSecondaryScale : profile.branchPrimaryScale;

    if (stage === 'seedling') {
      if (def.prayer === 'Isha') return base * (isSecondary ? 0.76 : 1.0);
      if (def.prayer === 'Fajr' || def.prayer === 'Dhuhr') return base * (isSecondary ? 0.70 : 0.92);
      return base * (isSecondary ? 0.62 : 0.84);
    }

    if (stage === 'sapling') {
      if (def.prayer === 'Isha') return base * (isSecondary ? 0.92 : 1.05);
      if (def.prayer === 'Fajr' || def.prayer === 'Dhuhr') return base * (isSecondary ? 0.84 : 0.94);
      return base * (isSecondary ? 0.74 : 0.82);
    }

    if (def.prayer === 'Isha') return base * (isSecondary ? 1.04 : 1.10);
    if (def.prayer === 'Fajr' || def.prayer === 'Dhuhr') return base * (isSecondary ? 0.98 : 1.0);
    return base * (isSecondary ? 0.92 : 0.88);
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

  private resolveLeafRenderKind(
    stage: TreeStage,
    def: BranchDefinition,
    totalCount: number,
    index: number,
  ): LeafRenderKind {
    if (stage === 'seedling') {
      if (index === 0) return 'leaf';
      if (index === 1) return 'leaf';
      if (index === 2 || index === 3) return 'paired';
      return index % 2 === 0 ? 'cluster' : 'bud';
    }

    if (stage === 'sapling') {
      const isLeader = def.prayer === 'Isha';
      const isShoulder = def.prayer === 'Fajr' || def.prayer === 'Dhuhr';
      const leafQuota = isLeader
        ? Math.max(5, Math.round(totalCount * 0.38))
        : isShoulder
          ? Math.max(4, Math.round(totalCount * 0.33))
          : Math.max(3, Math.round(totalCount * 0.28));
      const pairedQuota = isLeader
        ? Math.max(4, Math.round(totalCount * 0.32))
        : isShoulder
          ? Math.max(3, Math.round(totalCount * 0.36))
          : Math.max(2, Math.round(totalCount * 0.36));

      if (index >= totalCount - leafQuota) return 'leaf';
      if (index >= totalCount - leafQuota - pairedQuota) {
        return index % 2 === 0 ? 'paired' : 'cluster';
      }
      return index % 3 === 0 ? 'cluster' : 'bud';
    }

    return 'leaf';
  }

  private resolveEarlyGrowthStage(
    renderKind: LeafRenderKind,
    plant: GardenPlant | null | undefined,
  ): GrowthStage {
    if (renderKind === 'bud') return 'seed';
    if (renderKind === 'paired' || renderKind === 'cotyledon') return 'sprout';
    return plant?.growthStage ?? 'sprout';
  }

  private getPrayerLaneVector(
    prayer: PrayerName,
  ): { x: number; y: number } {
    return ({
      Maghrib: { x: -0.88, y: 0.34 },
      Fajr: { x: -0.68, y: -0.74 },
      Isha: { x: 0, y: -1 },
      Dhuhr: { x: 0.68, y: -0.74 },
      Asr: { x: 0.88, y: 0.34 },
    } as const)[prayer];
  }

  private getSeedlingLaneOffset(
    prayer: PrayerName,
    localIndex: number,
    totalCount: number,
    renderKind: LeafRenderKind,
  ): { x: number; y: number } {
    const lane = this.getPrayerLaneVector(prayer);
    const normal = { x: -lane.y, y: lane.x };
    const baseAlong = [0.22, 1.46, 2.54, 3.36, 4.10, 4.72, 5.28, 5.78];
    const baseAcross = [0, 0.42, -0.22, 0.30, -0.20, 0.16, -0.14, 0.12];
    const slot = Math.min(localIndex, baseAlong.length - 1);
    const hierarchyScale = renderKind === 'leaf'
      ? 1.08
      : renderKind === 'paired'
        ? 0.95
        : renderKind === 'cluster'
          ? 0.84
          : 0.78;
    const occupancyLift = 0.98 + Math.min(0.10, totalCount * 0.018);
    const laneBase = ({
      Maghrib: { x: -0.46, y: 0.46 },
      Fajr: { x: -0.34, y: -0.24 },
      Isha: { x: 0, y: -0.46 },
      Dhuhr: { x: 0.34, y: -0.24 },
      Asr: { x: 0.46, y: 0.46 },
    } as const)[prayer];

    return {
      x: laneBase.x
        + lane.x * baseAlong[slot] * hierarchyScale * occupancyLift
        + normal.x * baseAcross[slot] * hierarchyScale,
      y: laneBase.y
        + lane.y * baseAlong[slot] * hierarchyScale * occupancyLift
        + normal.y * baseAcross[slot] * hierarchyScale,
    };
  }

  private getSeedlingLaneT(localIndex: number): number {
    const slotTs = [0.90, 0.922, 0.938, 0.950, 0.960, 0.968, 0.974, 0.979];
    return slotTs[Math.min(localIndex, slotTs.length - 1)];
  }

  private resolveSeedlingLeafSeparation(branches: TreeBranch[]): TreeBranch[] {
    const minDistance = 4.3;
    const centerX = 160;
    const centerY = 242;

    const clonedBranches = branches.map((branch) => ({
      ...branch,
      leaves: branch.leaves.map((leaf) => ({ ...leaf })),
      subBranches: branch.subBranches.map((subBranch) => ({
        ...subBranch,
        leaves: subBranch.leaves.map((leaf) => ({ ...leaf })),
      })),
    }));

    const orderedLeaves = clonedBranches
      .flatMap((branch) => branch.leaves)
      .sort((a, b) => b.ageFraction - a.ageFraction);

    for (let i = 0; i < orderedLeaves.length; i += 1) {
      const leaf = orderedLeaves[i];
      for (let j = 0; j < i; j += 1) {
        const other = orderedLeaves[j];
        const dx = leaf.x - other.x;
        const dy = leaf.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minDistance || distance === 0) continue;

        const lane = this.getPrayerLaneVector(leaf.prayer as PrayerName);
        const push = minDistance - distance;
        leaf.x += lane.x * push * 0.74 + (leaf.x >= centerX ? 0.08 : -0.08) * push;
        leaf.y += lane.y * push * 0.56 + (leaf.y <= centerY ? -0.04 : 0.04) * push;
      }
    }

    return clonedBranches;
  }

  private positionLeaves(
    prayer: PrayerName,
    recentPlants: GardenPlant[],
    archivedCount: number,
    totalCount: number,
    def: typeof BRANCH_DEFINITIONS[number],
    stage: TreeStage,
    currentTrunkTopY: number,
    globalLeafStartIndex: number,
    branchGeometry: ResolvedBranchGeometry,
  ): TreeLeafData[] {
    if (totalCount === 0) return [];
    const stageProfile = TREE_STAGE_VISUALS[stage];
    const { renderedCurve } = branchGeometry;

    const n = totalCount;

    // ═══════════════════════════════════════════════════════════════
    // SEEDLING MODE — preserved from v5, with isArchived + ageFraction
    // ═══════════════════════════════════════════════════════════════
    if (stage === 'seedling') {
      const seedlingLeaves: TreeLeafData[] = [];
      const seedlingN = n;

      for (let localIndex = 0; localIndex < seedlingN; localIndex++) {
        const plant = recentPlants[localIndex];
        const isArchived = !plant;
        const hash = leafHash(prayer, plant?.date ?? `archived-${localIndex}`, localIndex);
        const t = this.getSeedlingLaneT(localIndex);
        const pos = quadBezierPoint(
          renderedCurve.start,
          renderedCurve.control,
          renderedCurve.end,
          t,
        );
        const perp = quadBezierPerpendicular(
          renderedCurve.start,
          renderedCurve.control,
          renderedCurve.end,
          t,
        );
        const renderKind = this.resolveLeafRenderKind(stage, def, totalCount, localIndex);
        const slotOffset = this.getSeedlingLaneOffset(def.prayer, localIndex, seedlingN, renderKind);
        const branchOffset = renderKind === 'leaf'
          ? 0.16
          : renderKind === 'paired'
            ? 0.12
            : renderKind === 'cluster'
              ? 0.08
              : 0.05;
        const x = pos.x + perp.x * branchOffset + slotOffset.x;
        const y = pos.y + perp.y * branchOffset + slotOffset.y;

        const angleDeg = quadBezierTangentAngle(
          renderedCurve.start,
          renderedCurve.control,
          renderedCurve.end,
          t,
        );
        const rotation = angleDeg + 90 + ((hash % 12) - 6);
        const growthStage = this.resolveEarlyGrowthStage(renderKind, plant);
        const opacityConfig = LEAF_OPACITY[growthStage];
        const baseOpacity = isArchived ? opacityConfig.base * 0.85 : opacityConfig.base;
        const ageFraction = seedlingN > 1 ? 1 - (localIndex / (seedlingN - 1)) : 0;

        seedlingLeaves.push({
          id: `${prayer}-${plant?.date ?? `arch-${localIndex}`}-${localIndex}`,
          t,
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
          renderKind,
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
    const leaves: TreeLeafData[] = [];
    const branchSignature = (leafHash(def.id, prayer, n) % 100) / 100;
    const crownProfile = this.buildCrownProfile(branchSignature, 'main');

    // Build merged leaf list: archived at base, recent at tip
    // Index 0 = oldest (base), index n-1 = newest (tip)
    for (let index = 0; index < n; index++) {
      const isArchived = index < archivedCount;
      const recentIdx = index - archivedCount;
      const plant = isArchived ? null : (recentPlants[recentIdx] ?? null);
      const renderKind = this.resolveLeafRenderKind(stage, def, n, index);

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
          : stageProfile.mainLeafStartT
            + (LEAF_DISTRIBUTION.mainTipT - stageProfile.mainLeafStartT) * clustered;
      }

      const pos = quadBezierPoint(
        renderedCurve.start,
        renderedCurve.control,
        renderedCurve.end,
        t,
      );
      const perp = quadBezierPerpendicular(
        renderedCurve.start,
        renderedCurve.control,
        renderedCurve.end,
        t,
      );

      // ── PHYLLOTAXIS: alternating sides + tightening offset ──
      const hash = leafHash(prayer, plant?.date ?? `arch-${index}`, index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * (1 - t * PHYLLOTAXIS.spiralTightening);
      const sprayPhase = (index % 4) - 1.5;
      const clusterSpread = 1 + Math.sin((index / Math.max(1, n - 1)) * Math.PI * 2 + branchSignature * Math.PI) * 0.14;
      const corridorProximity = Math.max(
        0,
        1 - Math.abs((t - crownProfile.gapCenter) / Math.max(0.001, crownProfile.gapWidth)),
      );
      const jitterFrac = ((hash % 100) / 100) * 0.3;
      const corridorTightening = 1 - corridorProximity * stageProfile.corridorStrength;
      const earlyTightening = stage === 'sapling'
        ? renderKind === 'bud'
          ? 1.02
          : renderKind === 'paired' || renderKind === 'cluster'
            ? 1.18
            : 1.24
        : 1;
      const perpMagnitude = (offsetMag + jitterFrac)
        * LEAF_JITTER.maxOffset
        * clusterSpread
        * stageProfile.leafOffsetScale
        * corridorTightening
        * (1 + (sprayPhase / 3) * stageProfile.spraySpread * 0.16)
        * earlyTightening
        * phyllSign;

      let x = pos.x + perp.x * perpMagnitude;
      let y = pos.y + perp.y * perpMagnitude - (stage === 'sapling' ? 0.55 : 0);
      if (stage === 'sapling') {
        const lane = this.getPrayerLaneVector(def.prayer);
        const laneProgress = n === 1 ? 1 : index / (n - 1);
        const liftBand = renderKind === 'leaf'
          ? 1.10
          : renderKind === 'paired' || renderKind === 'cluster'
            ? 0.82
            : 0.42;
        const laneSpread = renderKind === 'leaf'
          ? 1.14
          : renderKind === 'paired' || renderKind === 'cluster'
            ? 0.92
            : 0.66;
        x += sprayPhase * 0.16 + ((index % 3) - 1) * 0.12
          + lane.x * (0.30 + laneProgress * 2.35) * laneSpread;
        y += lane.y * (0.22 + laneProgress * 2.04) * laneSpread
          - liftBand
          + (index % 2 === 0 ? 0.12 : -0.05)
          - index * 0.012;
      } else if (stage === 'growing') {
        const lane = this.getPrayerLaneVector(def.prayer);
        const shoulderBoost = def.prayer === 'Fajr' || def.prayer === 'Dhuhr'
          ? 1.16
          : def.prayer === 'Maghrib' || def.prayer === 'Asr'
            ? 1.08
            : 1;
        x += sprayPhase * 0.18 * shoulderBoost
          + lane.x * (def.prayer === 'Isha' ? 0.14 : 0.26)
          + (def.prayer === 'Fajr' || def.prayer === 'Isha' ? -0.05 : def.prayer === 'Dhuhr' ? 0.05 : 0);
        y += lane.y * (def.prayer === 'Isha' ? 0.10 : 0.18)
          - (renderKind === 'leaf' ? 0.18 : 0.06) * shoulderBoost;
      }

      // ── CANOPY CLAMP ────────────────────────────────────────
      const clamped = clampToCanopy(x, y, currentTrunkTopY, {
        radiusX: stageProfile.canopyRadiusX,
        radiusY: stageProfile.canopyRadiusY,
        centerYOffset: stageProfile.canopyCenterYOffset,
        grace: stageProfile.canopyGrace,
        softness: stageProfile.canopySoftness,
      });
      x = clamped.x;
      y = clamped.y;

      // ── ROTATION (sky-biased + phyllotaxis influence) ───────
      const outwardLean = def.baseAngle * 0.55;
      const tipTilt = (t - 0.3) * 12;
      const phyllRot = phyllSign * PHYLLOTAXIS.baseRotationSpread * (1 - t * 0.5);
      const rotJitter = ((hash % 60 - 30) / 30) * 14;
      const rotation = outwardLean
        + tipTilt
        + phyllRot
        + rotJitter
        + sprayPhase * stageProfile.spraySpread * 1.8
        + (stage === 'sapling' && renderKind === 'paired' ? phyllSign * 5 : 0);

      // ── GROWTH STAGE + OPACITY ──────────────────────────────
      const growthStage = stage === 'sapling'
        ? this.resolveEarlyGrowthStage(renderKind, plant)
        : (plant?.growthStage ?? 'sprout');
      const ageFraction = n > 1 ? 1 - (index / (n - 1)) : 0;
      const opacityConfig = LEAF_OPACITY[growthStage];
      const opacityVariance = ((hash % 50 - 25) / 25) * opacityConfig.variance;
      const rawOpacity = isArchived
        ? opacityConfig.base * 0.82
        : Math.max(
            stage === 'growing' ? 0.42 : 0.36,
            Math.min(
              1,
              opacityConfig.base
                + opacityVariance
                - corridorProximity * (stage === 'growing' ? 0.015 : 0.06)
                - (ageFraction > 0.42 ? 0.04 : 0),
            ),
          );

      // ── AGE FRACTION ────────────────────────────────────────
      // 0 = newest (tip), 1 = oldest (base)
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
        renderKind,
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
    branchGeometry: ResolvedBranchGeometry,
    stage: TreeStage,
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
    if (maxSubs === 0 || branchGeometry.lengthScale < 0.4) return [];
    const actualSubCount = Math.min(maxSubs, overflowTotal);
    if (actualSubCount === 0) return [];

    const results: SubBranch[] = [];
    const parentCurve = branchGeometry.renderedCurve;
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

      const forkPoint = quadBezierPoint(
        parentCurve.start,
        parentCurve.control,
        parentCurve.end,
        forkT,
      );
      const perp = quadBezierPerpendicular(
        parentCurve.start,
        parentCurve.control,
        parentCurve.end,
        forkT,
      );
      const tangent = quadBezierTangentAngle(
        parentCurve.start,
        parentCurve.control,
        parentCurve.end,
        forkT,
      );

      const spread = (SUB_BRANCH.spread + centeredSignature * 8) * direction;
      const subLength = SUB_BRANCH.lengthRatio * branchGeometry.lengthScale * (76 + branchSignature * 18);
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
        def.baseAngle, direction, currentTrunkTopY,
        subLeafGlobalStart + overflowOffset,
      );

      overflowOffset += subLeafCount;
      recentOffset += subRecentCount;

      results.push({
        curve: subCurve,
        strokeWidth: branchGeometry.strokeWidth * SUB_BRANCH.strokeRatio,
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
    currentTrunkTopY: number,
    globalStartIndex: number,
  ): TreeLeafData[] {
    if (totalCount === 0) return [];
    const stageProfile = TREE_STAGE_VISUALS[this.currentStage];

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
          : stageProfile.subLeafStartT
            + (LEAF_DISTRIBUTION.subTipT - stageProfile.subLeafStartT) * clustered;
      }

      const pos = quadBezierPoint(curve.start, curve.control, curve.end, t);
      const perp = quadBezierPerpendicular(curve.start, curve.control, curve.end, t);

      // ── PHYLLOTAXIS: alternating sides, tighter than main branch ──
      const hash = leafHash(prayer, plant?.date ?? `sub-${index}`, globalStartIndex + index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * 0.6 * (1 - t * 0.5);
      const sprayPhase = (index % 3) - 1;
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
        * stageProfile.leafOffsetScale
        * (1 - corridorProximity * stageProfile.corridorStrength * 0.8)
        * (1 + sprayPhase * stageProfile.spraySpread * 0.08)
        * phyllSign;

      let x = pos.x + perp.x * perpMag;
      let y = pos.y + perp.y * perpMag;

      // ── CANOPY CLAMP ──────────────────────────────────────
      const clamped = clampToCanopy(x, y, currentTrunkTopY, {
        radiusX: stageProfile.canopyRadiusX,
        radiusY: stageProfile.canopyRadiusY,
        centerYOffset: stageProfile.canopyCenterYOffset,
        grace: stageProfile.canopyGrace,
        softness: stageProfile.canopySoftness,
      });
      x = clamped.x;
      y = clamped.y;

      // ── ROTATION ──────────────────────────────────────────
      const outwardLean = parentBaseAngle * 0.4 * direction;
      const tipTilt = (t - 0.3) * 8;
      const phyllRot = phyllSign * 15 * (1 - t * 0.5);
      const rotJitter = ((hash % 40 - 20) / 20) * 10;
      const rotation = outwardLean + tipTilt + phyllRot + rotJitter + sprayPhase * stageProfile.spraySpread * 1.6;

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
        renderKind: 'leaf',
        prayer,
        date: plant?.date ?? '',
        mood: plant?.mood ?? 3,
      });
    }

    return leaves;
  }
}

export default new TubaTreeService();

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
import { TreeData, TreeBranch, TreeLeafData, TreeStage, SubBranch } from '../types/tubaTree';
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
} from '../constants/tubaTree';

class TubaTreeService {
  buildTreeData(growthState: TreeGrowthState, recentPlants: GardenPlant[]): TreeData {
    const { g, stage } = growthState;
    const plantsByPrayer = this.groupByPrayer(recentPlants);

    // ── CONTINUOUS TRUNK GEOMETRY FROM g ─────────────────────────
    const gScale = trunkScaleFromG(g);
    const trunkWidth = trunkBaseWidthFromG(g);

    // Data-driven override: ensure trunk reaches highest branch with data
    let highestJunctionY = TRUNK.start.y;
    for (const def of BRANCH_DEFINITIONS) {
      const lifetimeCount = growthState.branchLifetimeLeaves[def.prayer] || 0;
      if (lifetimeCount > 0) {
        highestJunctionY = Math.min(highestJunctionY, def.curve.start.y);
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
    const activeBranches = BRANCH_DEFINITIONS.filter(
      (def) => (growthState.branchLifetimeLeaves[def.prayer] || 0) > 0,
    ).length;
    const branchWidthCap = maxBranchWidth(trunkWidth, Math.max(1, activeBranches));

    if (__DEV__) {
      logger.log('[TubaTree] ═══ buildTreeData (v6 continuous) ═══');
      logger.log(`  g: ${g.toFixed(3)}, stage: ${stage}, lifetime: ${growthState.totalLifetimeReflections}`);
      logger.log(`  trunkWidth: ${trunkWidth.toFixed(1)}, gScale: ${gScale.toFixed(3)}, effectiveScale: ${effectiveScale.toFixed(3)}`);
      logger.log(`  branchWidthCap: ${branchWidthCap.toFixed(1)}, activeBranches: ${activeBranches}`);
    }

    // ── BUILD BRANCHES ───────────────────────────────────────────
    let globalLeafStartIndex = 0;

    const branches: TreeBranch[] = BRANCH_DEFINITIONS.map((def) => {
      const branchPlants = plantsByPrayer[def.prayer] || [];
      const lifetimeCount = growthState.branchLifetimeLeaves[def.prayer] || 0;
      const branch = this.buildBranch(
        def.prayer,
        branchPlants,
        lifetimeCount,
        def,
        stage,
        g,
        currentTrunkTopY,
        branchWidthCap,
        globalLeafStartIndex,
        growthState.totalLifetimeReflections,
      );
      const subLeafCount = branch.subBranches.reduce((s, sb) => s + sb.leaves.length, 0);
      globalLeafStartIndex += Math.min(
        Math.max(lifetimeCount, branchPlants.length),
        MAX_LEAVES_PER_BRANCH,
      ) + subLeafCount;
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
    return groups;
  }

  private buildBranch(
    prayer: PrayerName,
    recentPlants: GardenPlant[],
    lifetimeCount: number,
    def: typeof BRANCH_DEFINITIONS[number],
    stage: TreeStage,
    g: number,
    currentTrunkTopY: number,
    branchWidthCap: number,
    globalLeafStartIndex: number,
    totalLifetimeReflections: number,
  ): TreeBranch {
    // Use lifetime count for geometry (never regresses)
    const geometryCount = Math.min(lifetimeCount, MAX_LEAVES_PER_BRANCH);

    // Seedling: every branch with lifetime leaves is "visible"
    const branchVisible = stage === 'seedling'
      ? lifetimeCount > 0
      : def.curve.start.y >= currentTrunkTopY;

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
      def,
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
          prayer, def, lengthScale, strokeWidth, stage, g, currentTrunkTopY,
          overflowTotal, overflowRecent,
          globalLeafStartIndex + leaves.length,
          totalLifetimeReflections,
        )
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

    // Build merged leaf list: archived at base, recent at tip
    // Index 0 = oldest (base), index n-1 = newest (tip)
    for (let index = 0; index < n; index++) {
      const isArchived = index < archivedCount;
      const recentIdx = index - archivedCount;
      const plant = isArchived ? null : (recentPlants[recentIdx] ?? null);

      // ── T-POSITION ──────────────────────────────────────────
      let t: number;
      if (n === 1) {
        t = 0.82;
      } else if (n === 2) {
        t = index === 0 ? 0.35 : 0.82;
      } else {
        t = LEAF_DISTRIBUTION.floorT + LEAF_DISTRIBUTION.range * (index / (n - 1));
      }

      const pos = quadBezierPoint(curve.start, scaled.control, scaled.end, t);
      const perp = quadBezierPerpendicular(curve.start, scaled.control, scaled.end, t);

      // ── PHYLLOTAXIS: alternating sides + tightening offset ──
      const hash = leafHash(prayer, plant?.date ?? `arch-${index}`, index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * (1 - t * PHYLLOTAXIS.spiralTightening);
      const jitterFrac = ((hash % 100) / 100) * 0.3;
      const perpMagnitude = (offsetMag + jitterFrac) * LEAF_JITTER.maxOffset * phyllSign;

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
        : Math.max(0.4, Math.min(1, opacityConfig.base + opacityVariance));

      // ── AGE FRACTION ────────────────────────────────────────
      // 0 = newest (tip), 1 = oldest (base)
      const ageFraction = n > 1 ? 1 - (index / (n - 1)) : 0;
      const opacity = ageAdjustedOpacity(rawOpacity, ageFraction);

      const isBloom = !isArchived && (plant?.mood ?? 0) >= 4 && growthStage === 'bloom';

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

    const results: SubBranch[] = [];
    const { curve } = def;
    const scaled = scaledBezier(curve.start, curve.control, curve.end, parentLengthScale);

    let overflowOffset = 0;

    for (let i = 0; i < maxSubs; i++) {
      const forkT = SUB_BRANCH.forkT[i] ?? 0.35;
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

      // ── Position overflow leaves on this sub-branch ──────────
      const subOverflowAvail = Math.max(0, overflowTotal - overflowOffset);
      const subLeafCount = Math.min(subOverflowAvail, MAX_LEAVES_PER_SUB_BRANCH);
      const subRecentSlice = overflowRecent.slice(overflowOffset, overflowOffset + subLeafCount);
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

      results.push({
        d: `M ${forkPoint.x.toFixed(1)} ${forkPoint.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
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

    for (let index = 0; index < n; index++) {
      const isArchived = index < archivedCount;
      const recentIdx = index - archivedCount;
      const plant = isArchived ? null : (recentPlants[recentIdx] ?? null);

      // ── T-POSITION: spread along sub-branch ────────────────
      let t: number;
      if (n === 1) {
        t = 0.65;
      } else {
        t = 0.15 + 0.70 * (index / (n - 1));
      }

      const pos = quadBezierPoint(curve.start, curve.control, curve.end, t);
      const perp = quadBezierPerpendicular(curve.start, curve.control, curve.end, t);

      // ── PHYLLOTAXIS: alternating sides, tighter than main branch ──
      const hash = leafHash(prayer, plant?.date ?? `sub-${index}`, globalStartIndex + index);
      const phyllSign = (index % 2 === 0) ? 1 : -1;
      const offsetMag = PHYLLOTAXIS.alternateOffset * 0.6 * (1 - t * 0.5);
      const jitterFrac = ((hash % 100) / 100) * 0.2;
      const perpMag = (offsetMag + jitterFrac) * LEAF_JITTER.maxOffset * 0.7 * phyllSign;

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
        : Math.max(0.4, Math.min(1, opacityConfig.base));

      // ── AGE FRACTION ──────────────────────────────────────
      // Sub-branch leaves are newer than main branch leaves
      const ageFraction = n > 1 ? 1 - (index / (n - 1)) : 0;
      // Scale down: sub-branch leaves are overall younger
      const adjustedAge = ageFraction * 0.6;
      const opacity = ageAdjustedOpacity(rawOpacity, adjustedAge);

      const isBloom = !isArchived && (plant?.mood ?? 0) >= 4 && growthStage === 'bloom';

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
        prayer,
        date: plant?.date ?? '',
        mood: plant?.mood ?? 3,
      });
    }

    return leaves;
  }
}

export default new TubaTreeService();
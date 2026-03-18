import TubaTreeService from '../services/TubaTreeService';
import { computeG, computeStage, quadBezierPoint, scaledBezier } from '../constants/tubaTree';
import { PrayerName } from '../types';
import { GardenPlant } from '../types/garden';
import { TreeGrowthState, TREE_GROWTH_STATE_VERSION } from '../types/treeGrowthState';
import { BezierCurve, TreeBranch, TreeLeafData, TreeStage } from '../types/tubaTree';
import { getTreeStageTransform, transformBounds } from '../utils/treeLayout';

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function makePlants(perPrayer: number): GardenPlant[] {
  const plants: GardenPlant[] = [];

  PRAYERS.forEach((prayer, prayerIndex) => {
    for (let i = 0; i < perPrayer; i++) {
      const day = String(i + 1).padStart(2, '0');
      plants.push({
        prayer,
        date: `2026-03-${day}`,
        growthStage: i % 4 === 0 ? 'bloom' : i % 3 === 0 ? 'seed' : 'sprout',
        mood: i % 4 === 0 ? 5 : i % 3 === 0 ? 2 : 3,
        hasText: i % 2 === 0,
        emoji: '🌿',
      });
    }
  });

  return plants;
}

function makeState(totalPerPrayer: number): TreeGrowthState {
  const totalLifetimeReflections = totalPerPrayer * PRAYERS.length;

  return {
    version: TREE_GROWTH_STATE_VERSION,
    totalLifetimeReflections,
    g: computeG(totalLifetimeReflections),
    stage: computeStage(totalLifetimeReflections),
    branchLifetimeLeaves: {
      Fajr: totalPerPrayer,
      Dhuhr: totalPerPrayer,
      Asr: totalPerPrayer,
      Maghrib: totalPerPrayer,
      Isha: totalPerPrayer,
    },
    lifetimeBlooms: Math.floor(totalLifetimeReflections * 0.25),
    firstReflectionDate: '2026-01-01',
    lastUpdated: '2026-03-18T00:00:00.000Z',
  };
}

function makePlantsFromCounts(counts: Record<PrayerName, number>): GardenPlant[] {
  const plants: GardenPlant[] = [];

  PRAYERS.forEach((prayer) => {
    for (let i = 0; i < counts[prayer]; i++) {
      const day = String(i + 1).padStart(2, '0');
      plants.push({
        prayer,
        date: `2026-03-${day}`,
        growthStage: i % 4 === 0 ? 'bloom' : i % 3 === 0 ? 'seed' : 'sprout',
        mood: i % 4 === 0 ? 5 : i % 3 === 0 ? 2 : 3,
        hasText: i % 2 === 0,
        emoji: '🌿',
      });
    }
  });

  return plants;
}

function makeStateFromCounts(counts: Record<PrayerName, number>): TreeGrowthState {
  const totalLifetimeReflections = PRAYERS.reduce((sum, prayer) => sum + counts[prayer], 0);

  return {
    version: TREE_GROWTH_STATE_VERSION,
    totalLifetimeReflections,
    g: computeG(totalLifetimeReflections),
    stage: computeStage(totalLifetimeReflections),
    branchLifetimeLeaves: counts,
    lifetimeBlooms: Math.floor(totalLifetimeReflections * 0.25),
    firstReflectionDate: '2026-01-01',
    lastUpdated: '2026-03-18T00:00:00.000Z',
  };
}

function distributeTotal(total: number): Record<PrayerName, number> {
  const base = Math.floor(total / PRAYERS.length);
  const remainder = total % PRAYERS.length;

  return PRAYERS.reduce<Record<PrayerName, number>>((acc, prayer, index) => {
    acc[prayer] = base + (index < remainder ? 1 : 0);
    return acc;
  }, {} as Record<PrayerName, number>);
}

function renderedMainCurve(branch: TreeBranch): BezierCurve {
  const scaled = scaledBezier(branch.curve.start, branch.curve.control, branch.curve.end, branch.lengthScale);
  return {
    start: branch.curve.start,
    control: scaled.control,
    end: scaled.end,
  };
}

function anchorDistance(leaf: TreeLeafData, curve: BezierCurve): number {
  const anchor = quadBezierPoint(curve.start, curve.control, curve.end, leaf.t);
  return Math.hypot(leaf.x - anchor.x, leaf.y - anchor.y);
}

function expectBranchAnchoring(branch: TreeBranch, stage: TreeStage): void {
  const mainCurve = renderedMainCurve(branch);
  const maxMainDistance = stage === 'seedling' ? 6.6 : stage === 'sapling' ? 12 : 18;
  const maxSubDistance = stage === 'seedling' ? 4 : stage === 'sapling' ? 10 : 14;

  branch.leaves.forEach((leaf) => {
    expect(anchorDistance(leaf, mainCurve)).toBeLessThanOrEqual(maxMainDistance);
  });

  branch.subBranches.forEach((subBranch) => {
    subBranch.leaves.forEach((leaf) => {
      expect(anchorDistance(leaf, subBranch.curve)).toBeLessThanOrEqual(maxSubDistance);
    });
  });
}

function countSeparatedLeaves(leaves: TreeLeafData[], minDistance: number): number {
  const accepted: TreeLeafData[] = [];

  leaves.forEach((leaf) => {
    const isSeparated = accepted.every(
      (candidate) => Math.hypot(candidate.x - leaf.x, candidate.y - leaf.y) >= minDistance,
    );
    if (isSeparated) {
      accepted.push(leaf);
    }
  });

  return accepted.length;
}

describe('TubaTreeService', () => {
  it('allocates multiple primary branches per prayer for mature trees', () => {
    const tree = TubaTreeService.buildTreeData(makeState(100), makePlants(20));

    const branchesPerPrayer = tree.branches.reduce<Record<string, number>>((acc, branch) => {
      acc[branch.prayer] = (acc[branch.prayer] || 0) + 1;
      return acc;
    }, {});

    PRAYERS.forEach((prayer) => {
      expect(branchesPerPrayer[prayer]).toBeGreaterThanOrEqual(2);
    });
  });

  it('keeps visible branch and sub-branch tips populated with leaves', () => {
    const tree = TubaTreeService.buildTreeData(makeState(100), makePlants(20));

    tree.branches.forEach((branch) => {
      expect(branch.leaves.length).toBeGreaterThan(0);
      expect(branch.leaves[branch.leaves.length - 1].t).toBeGreaterThanOrEqual(0.94);

      branch.subBranches.forEach((subBranch) => {
        expect(subBranch.leaves.length).toBeGreaterThan(0);
        expect(subBranch.leaves[subBranch.leaves.length - 1].t).toBeGreaterThanOrEqual(0.92);
      });
    });
  });

  it('leans the trunk toward the heavier side of the canopy without changing the tester contract', () => {
    const balanced = TubaTreeService.buildTreeData(makeState(20), makePlants(6));

    const rightHeavyState = {
      ...makeState(20),
      branchLifetimeLeaves: {
        Fajr: 6,
        Dhuhr: 28,
        Asr: 28,
        Maghrib: 6,
        Isha: 12,
      },
      totalLifetimeReflections: 80,
      g: computeG(80),
      stage: computeStage(80),
    };

    const rightHeavy = TubaTreeService.buildTreeData(rightHeavyState, makePlants(6));

    expect(Math.abs(balanced.trunkCurve.end.x - 160)).toBeLessThan(2);
    expect(rightHeavy.trunkCurve.end.x).toBeGreaterThan(balanced.trunkCurve.end.x);
  });

  it('creates crown pockets with non-uniform spacing instead of a flat canopy spread', () => {
    const tree = TubaTreeService.buildTreeData(makeState(28), makePlants(10));
    const branch = tree.branches.find((candidate) => candidate.leaves.length >= 8);

    expect(branch).toBeTruthy();

    const deltas = branch!.leaves
      .map((leaf) => leaf.t)
      .slice(1)
      .map((t, index) => t - branch!.leaves[index].t);

    const minDelta = Math.min(...deltas);
    const maxDelta = Math.max(...deltas);

    expect(maxDelta).toBeGreaterThan(minDelta * 1.45);
  });

  it('renders every seedling reflection as a visible growth unit across all five prayer stems', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 2,
      Dhuhr: 2,
      Asr: 2,
      Maghrib: 1,
      Isha: 1,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );

    const primaryBranches = seedling.branches.filter((branch) => branch.id.endsWith('primary'));
    const visibleUnits = seedling.branches.reduce((sum, branch) => sum + branch.leaves.length, 0);
    const fullLeafUnits = seedling.branches.flatMap((branch) => branch.leaves)
      .filter((leaf) => leaf.renderKind === 'leaf');
    const readableUnits = seedling.branches.flatMap((branch) => branch.leaves)
      .filter((leaf) => leaf.renderKind !== 'bud');

    expect(seedling.stage).toBe('seedling');
    expect(primaryBranches).toHaveLength(5);
    expect(visibleUnits).toBe(8);
    expect(fullLeafUnits.length).toBeGreaterThanOrEqual(5);
    expect(fullLeafUnits.length).toBeLessThanOrEqual(8);
    expect(readableUnits.length).toBeGreaterThanOrEqual(6);
    expect(Math.max(...primaryBranches.map((branch) => branch.lengthScale))).toBeLessThanOrEqual(0.38);
    expect(seedling.trunkScale).toBeLessThanOrEqual(0.30);
  });

  it('renders a single first reflection as exactly one visible unit', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 1,
      Dhuhr: 0,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );
    const leaves = seedling.branches.flatMap((branch) => branch.leaves);

    expect(seedling.stage).toBe('seedling');
    expect(leaves).toHaveLength(1);
    expect(leaves[0].renderKind).toBe('leaf');
    expect(Math.abs(leaves[0].x - 160)).toBeLessThanOrEqual(4.5);
  });

  it('keeps the first two reflections visually distinct', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 2,
      Dhuhr: 0,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );
    const leaves = seedling.branches.flatMap((branch) => branch.leaves);

    expect(leaves).toHaveLength(2);
    expect(Math.hypot(leaves[0].x - leaves[1].x, leaves[0].y - leaves[1].y)).toBeGreaterThanOrEqual(3.2);
  });

  it('extends repeated prayer reflections along the same early lane', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 4,
      Dhuhr: 0,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );
    const branch = seedling.branches.find((candidate) => candidate.prayer === 'Fajr');

    expect(branch).toBeTruthy();
    expect(branch!.leaves).toHaveLength(4);
    expect(branch!.leaves.every((leaf) => leaf.x < 160)).toBe(true);
    expect(Math.min(...branch!.leaves.map((leaf) => leaf.y))).toBeLessThan(branch!.leaves[0].y);
  });

  it('keeps zero-count prayers hidden in early stages until that prayer is completed', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 8,
      Dhuhr: 0,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );

    const primaryBranches = seedling.branches.filter((branch) => branch.id.endsWith('primary'));

    expect(primaryBranches).toHaveLength(1);
    expect(primaryBranches[0].prayer).toBe('Fajr');
  });

  it('reveals each prayer only when that prayer receives its first reflection', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 1,
      Dhuhr: 1,
      Asr: 0,
      Maghrib: 0,
      Isha: 0,
    };
    const tree = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );

    const visibleBranches = tree.branches.filter((branch) => branch.id.endsWith('primary'));

    expect(tree.stage).toBe('seedling');
    expect(visibleBranches.map((branch) => branch.prayer).sort()).toEqual(['Dhuhr', 'Fajr']);
    expect(visibleBranches.every((branch) => branch.leaves.length === 1)).toBe(true);
  });

  it('gives saplings five prayer stems with clear leader and supporting hierarchy', () => {
    const sapling = TubaTreeService.buildTreeData(makeState(9), makePlants(4));
    const primaryBranches = sapling.branches.filter((branch) => branch.id.endsWith('primary'));
    const leader = primaryBranches.find((branch) => branch.prayer === 'Isha');
    const lowerShoulder = primaryBranches.find((branch) => branch.prayer === 'Maghrib');
    const startRows = new Set(primaryBranches.map((branch) => Math.round(branch.curve.start.y)));

    expect(sapling.stage).toBe('sapling');
    expect(primaryBranches).toHaveLength(5);
    expect(leader).toBeTruthy();
    expect(lowerShoulder).toBeTruthy();
    expect(leader!.lengthScale).toBeGreaterThan(lowerShoulder!.lengthScale);
    expect(startRows.size).toBeGreaterThan(1);
    expect(sapling.trunkScale).toBeLessThanOrEqual(0.44);
  });

  it('keeps most seedling reflection units perceptually separable instead of collapsing into a blob', () => {
    const counts: Record<PrayerName, number> = {
      Fajr: 2,
      Dhuhr: 2,
      Asr: 2,
      Maghrib: 1,
      Isha: 1,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );
    const leaves = seedling.branches.flatMap((branch) => branch.leaves);

    expect(countSeparatedLeaves(leaves, 3.4)).toBeGreaterThanOrEqual(6);
  });

  it('keeps juvenile branch origins fused near the trunk corridor in early stages', () => {
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts({ Fajr: 2, Dhuhr: 2, Asr: 1, Maghrib: 1, Isha: 2 }),
      makePlantsFromCounts({ Fajr: 2, Dhuhr: 2, Asr: 1, Maghrib: 1, Isha: 2 }),
    );
    const sapling = TubaTreeService.buildTreeData(makeState(9), makePlants(4));

    const seedlingCorridor = Math.max(
      ...seedling.branches.map((branch) => Math.abs(branch.curve.start.x - 160)),
    );
    const saplingCorridor = Math.max(
      ...sapling.branches
        .filter((branch) => branch.id.endsWith('primary'))
        .map((branch) => Math.abs(branch.curve.start.x - 160)),
    );

    expect(seedlingCorridor).toBeLessThanOrEqual(3.5);
    expect(saplingCorridor).toBeLessThanOrEqual(5.5);
  });

  it('keeps early growing geometry closer to sapling than flourishing', () => {
    const sapling = TubaTreeService.buildTreeData(makeState(9), makePlants(4));
    const earlyGrowingCounts = distributeTotal(80);
    const earlyGrowing = TubaTreeService.buildTreeData(
      makeStateFromCounts(earlyGrowingCounts),
      makePlantsFromCounts(earlyGrowingCounts),
    );
    const flourishingCounts = distributeTotal(500);
    const flourishing = TubaTreeService.buildTreeData(
      makeStateFromCounts(flourishingCounts),
      makePlantsFromCounts(flourishingCounts),
    );

    const width = (tree: ReturnType<typeof TubaTreeService.buildTreeData>) => {
      const xs = tree.branches.flatMap((branch) => [
        ...branch.leaves.map((leaf) => leaf.x),
        ...branch.subBranches.flatMap((subBranch) => subBranch.leaves.map((leaf) => leaf.x)),
      ]);
      return Math.max(...xs) - Math.min(...xs);
    };

    const earlyGrowingWidth = width(earlyGrowing);
    const saplingWidth = width(sapling);
    const flourishingWidth = width(flourishing);

    expect(earlyGrowing.stage).toBe('growing');
    expect(Math.abs(earlyGrowingWidth - saplingWidth)).toBeLessThan(
      Math.abs(flourishingWidth - earlyGrowingWidth),
    );
    expect(earlyGrowingWidth).toBeGreaterThan(saplingWidth * 1.25);
  });

  it('gives saplings substantially more medium-readable units than seedlings', () => {
    const seedlingCounts: Record<PrayerName, number> = {
      Fajr: 2,
      Dhuhr: 2,
      Asr: 2,
      Maghrib: 1,
      Isha: 1,
    };
    const seedling = TubaTreeService.buildTreeData(
      makeStateFromCounts(seedlingCounts),
      makePlantsFromCounts(seedlingCounts),
    );
    const sapling = TubaTreeService.buildTreeData(makeState(9), makePlants(4));

    const mediumCount = (tree: ReturnType<typeof TubaTreeService.buildTreeData>) => (
      tree.branches
        .flatMap((branch) => branch.leaves)
        .filter((leaf) => leaf.renderKind !== 'bud').length
    );

    expect(mediumCount(sapling)).toBeGreaterThan(mediumCount(seedling));
    expect(mediumCount(sapling)).toBeGreaterThanOrEqual(18);
  });

  it('adds subtle interior tone and hue variation without changing tip leaves', () => {
    const tree = TubaTreeService.buildTreeData(makeState(32), makePlants(12));
    const allLeaves = tree.branches.flatMap((branch) => [
      ...branch.leaves,
      ...branch.subBranches.flatMap((subBranch) => subBranch.leaves),
    ]);

    const variedLeaves = allLeaves.filter(
      (leaf) => leaf.tone !== 'fresh' || leaf.hueVariant !== 'base',
    );
    const variedTipLeaves = variedLeaves.filter((leaf) => leaf.t >= 0.9 || leaf.ageFraction < 0.18);

    expect(variedLeaves.length).toBeGreaterThan(0);
    expect(variedTipLeaves).toHaveLength(0);
  });

  it('gives ancient trees a taller silhouette than flourishing trees', () => {
    const flourishing = TubaTreeService.buildTreeData(makeState(100), makePlants(20));
    const ancient = TubaTreeService.buildTreeData(makeState(220), makePlants(40));

    expect(ancient.stage).toBe('ancient');
    expect(ancient.trunkCurve.end.y).toBeLessThan(flourishing.trunkCurve.end.y);
  });

  it('keeps rendered leaf units anchored to the visible branch geometry across all stages', () => {
    const stageTotals = [8, 45, 160, 500, 1100];

    stageTotals.forEach((total) => {
      const counts = distributeTotal(total);
      const tree = TubaTreeService.buildTreeData(
        makeStateFromCounts(counts),
        makePlantsFromCounts(counts),
      );

      tree.branches.forEach((branch) => {
        expectBranchAnchoring(branch, tree.stage);
      });
    });
  });

  it('fits every stage inside the canvas safe bounds after applying the stage transform', () => {
    const stageTotals = [8, 45, 160, 500, 1100];

    stageTotals.forEach((total) => {
      const counts = distributeTotal(total);
      const tree = TubaTreeService.buildTreeData(
        makeStateFromCounts(counts),
        makePlantsFromCounts(counts),
      );
      const transform = getTreeStageTransform(tree);
      const fitted = transformBounds(
        transform.rawBounds,
        transform.scale,
        transform.translateX,
        transform.translateY,
      );

      expect(fitted.minX).toBeGreaterThanOrEqual(transform.safeBox.left - 0.5);
      expect(fitted.maxX).toBeLessThanOrEqual(transform.safeBox.right + 0.5);
      expect(fitted.minY).toBeGreaterThanOrEqual(transform.safeBox.top - 0.5);
      expect(fitted.maxY).toBeLessThanOrEqual(transform.safeBox.bottom + 0.5);
    });
  });

  it('keeps the early stem base visibly above the darkest ground fade after fitting', () => {
    const counts = distributeTotal(8);
    const tree = TubaTreeService.buildTreeData(
      makeStateFromCounts(counts),
      makePlantsFromCounts(counts),
    );
    const transform = getTreeStageTransform(tree);
    const fittedStemBaseY = tree.trunkCurve.start.y * transform.scale + transform.translateY;

    expect(tree.stage).toBe('seedling');
    expect(fittedStemBaseY).toBeLessThanOrEqual(258);
  });
});

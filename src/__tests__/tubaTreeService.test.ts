import TubaTreeService from '../services/TubaTreeService';
import { computeG, computeStage } from '../constants/tubaTree';
import { PrayerName } from '../types';
import { GardenPlant } from '../types/garden';
import { TreeGrowthState, TREE_GROWTH_STATE_VERSION } from '../types/treeGrowthState';

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

describe('TubaTreeService', () => {
  it('allocates multiple primary branches per prayer for mature trees', () => {
    const tree = TubaTreeService.buildTreeData(makeState(32), makePlants(12));

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
});

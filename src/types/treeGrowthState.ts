// src/types/treeGrowthState.ts
//
// Permanent, additive-only growth state for the Tuba Tree.
// Values only increment — the tree never shrinks.
// Persisted in MMKV (~200 bytes).

import { PrayerName } from './index';
import { TreeStage } from './tubaTree';

export interface TreeGrowthState {
  /** Schema version for future migrations */
  version: number;

  /** Total lifetime reflections across all prayers (monotonically increasing) */
  totalLifetimeReflections: number;

  /** Continuous growth parameter derived from totalLifetimeReflections via S-curve */
  g: number;

  /** Discrete stage (ratcheted — only advances, never regresses) */
  stage: TreeStage;

  /** High-water-mark leaf count per prayer branch (monotonically increasing per key) */
  branchLifetimeLeaves: Record<PrayerName, number>;

  /** Lifetime bloom count (mood >= 4 reflections) */
  lifetimeBlooms: number;

  /** ISO date string of the very first reflection */
  firstReflectionDate: string | null;

  /** ISO timestamp of last update */
  lastUpdated: string;
}

export const DEFAULT_TREE_GROWTH_STATE: TreeGrowthState = {
  version: 1,
  totalLifetimeReflections: 0,
  g: 0,
  stage: 'seedling',
  branchLifetimeLeaves: {
    Fajr: 0,
    Dhuhr: 0,
    Asr: 0,
    Maghrib: 0,
    Isha: 0,
  },
  lifetimeBlooms: 0,
  firstReflectionDate: null,
  lastUpdated: new Date().toISOString(),
};

export const TREE_GROWTH_STATE_VERSION = 1;

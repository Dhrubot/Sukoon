// src/services/TreeGrowthStateService.ts
//
// Persistent, additive-only growth state for the Tuba Tree.
// Uses MMKV via the existing StorageAdapter pattern.

import { PrayerName } from '../types';
import { GardenPlant } from '../types/garden';
import {
  TreeGrowthState,
  DEFAULT_TREE_GROWTH_STATE,
  TREE_GROWTH_STATE_VERSION,
} from '../types/treeGrowthState';
import {
  computeG,
  computeStage,
  stageIndex,
} from '../constants/tubaTree';
import { createStorage } from './StorageAdapter';
import logger from '../utils/logger';

const MMKV_KEY = 'treeGrowthState';

class TreeGrowthStateService {
  private storage;

  constructor() {
    this.storage = createStorage({ id: 'tuba-tree-growth' });
  }

  // ── READ ──────────────────────────────────────────────────────────

  getState(): TreeGrowthState {
    try {
      const raw = this.storage.getString(MMKV_KEY);
      if (!raw) return { ...DEFAULT_TREE_GROWTH_STATE, lastUpdated: new Date().toISOString() };
      const parsed: TreeGrowthState = JSON.parse(raw);
      if (parsed.version !== TREE_GROWTH_STATE_VERSION) {
        return this.migrate(parsed);
      }
      return parsed;
    } catch {
      return { ...DEFAULT_TREE_GROWTH_STATE, lastUpdated: new Date().toISOString() };
    }
  }

  // ── WRITE ─────────────────────────────────────────────────────────

  private persist(state: TreeGrowthState): void {
    this.storage.set(MMKV_KEY, JSON.stringify(state));
  }

  // ── RECORD REFLECTION ─────────────────────────────────────────────
  // Called after every mindfulness session completion (both full and skipped).

  recordReflection(prayer: PrayerName, mood: number, dateStr: string): TreeGrowthState {
    const state = this.getState();

    // Increment totals
    state.totalLifetimeReflections += 1;
    state.branchLifetimeLeaves[prayer] = (state.branchLifetimeLeaves[prayer] || 0) + 1;

    if (mood >= 4) {
      state.lifetimeBlooms += 1;
    }

    if (!state.firstReflectionDate) {
      state.firstReflectionDate = dateStr;
    }

    // Recompute g from lifetime total — ratcheted: never regress
    const newG = computeG(state.totalLifetimeReflections);
    state.g = Math.max(state.g, newG);

    // Ratchet stage — only advance, never regress
    const newStage = computeStage(state.totalLifetimeReflections);
    if (stageIndex(newStage) > stageIndex(state.stage)) {
      state.stage = newStage;
    }

    state.lastUpdated = new Date().toISOString();
    this.persist(state);

    if (__DEV__) {
      logger.log(`[TreeGrowthState] recordReflection: ${prayer}, mood=${mood}, total=${state.totalLifetimeReflections}, g=${state.g.toFixed(3)}, stage=${state.stage}`);
    }

    return state;
  }

  // ── BOOTSTRAP FROM EXISTING DATA ──────────────────────────────────
  // One-time migration: reads all existing GardenPlant records and
  // hydrates the growth state. Called during app initialization when
  // no treeGrowthState exists in MMKV.

  bootstrapFromExistingData(plants: GardenPlant[]): TreeGrowthState {
    const state: TreeGrowthState = {
      ...DEFAULT_TREE_GROWTH_STATE,
      lastUpdated: new Date().toISOString(),
    };

    // Deep-copy branchLifetimeLeaves to avoid mutating the default
    state.branchLifetimeLeaves = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 };

    for (const plant of plants) {
      state.totalLifetimeReflections += 1;
      const prayer = plant.prayer as PrayerName;
      state.branchLifetimeLeaves[prayer] = (state.branchLifetimeLeaves[prayer] || 0) + 1;

      if (plant.mood >= 4 && plant.growthStage === 'bloom') {
        state.lifetimeBlooms += 1;
      }

      if (!state.firstReflectionDate || plant.date < state.firstReflectionDate) {
        state.firstReflectionDate = plant.date;
      }
    }

    // Compute derived values
    state.g = computeG(state.totalLifetimeReflections);
    state.stage = computeStage(state.totalLifetimeReflections);

    this.persist(state);

    if (__DEV__) {
      logger.log(`[TreeGrowthState] bootstrapped from ${plants.length} plants: g=${state.g.toFixed(3)}, stage=${state.stage}`);
      logger.log(`  branches:`, state.branchLifetimeLeaves);
    }

    return state;
  }

  // ── MIGRATION ─────────────────────────────────────────────────────
  // Future schema migrations go here.

  private migrate(old: any): TreeGrowthState {
    // v1 is the only version for now — just return defaults if schema is unknown
    if (__DEV__) {
      logger.warn(`[TreeGrowthState] Unknown version ${old.version}, resetting to defaults`);
    }
    return { ...DEFAULT_TREE_GROWTH_STATE, lastUpdated: new Date().toISOString() };
  }

  // ── EXISTENCE CHECK ───────────────────────────────────────────────

  hasState(): boolean {
    return !!this.storage.getString(MMKV_KEY);
  }

  // ── DEV ONLY: Direct state override for testing ─────────────────
  /** @internal Only available in __DEV__ builds */
  devSetState(state: TreeGrowthState): void {
    if (!__DEV__) return;
    this.persist(state);
    logger.log(`[TreeGrowthState] DEV override: total=${state.totalLifetimeReflections}, g=${state.g.toFixed(3)}, stage=${state.stage}`);
  }

  /** @internal Clears MMKV state — DEV only */
  devReset(): void {
    if (!__DEV__) return;
    this.storage.remove(MMKV_KEY);
    logger.log('[TreeGrowthState] DEV reset — state cleared');
  }
}

export default new TreeGrowthStateService();

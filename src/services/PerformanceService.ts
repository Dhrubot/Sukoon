// src/services/PerformanceService.ts
import { getPerformance, trace as perfTrace } from '@react-native-firebase/perf';
import logger from '../utils/logger';

type ActiveTrace = {
  stop: () => Promise<void>;
  putAttribute: (name: string, value: string) => void;
  putMetric: (name: string, value: number) => void;
};

class PerformanceService {
  private activeTraces: Map<string, ActiveTrace> = new Map();

  /**
   * Start a named trace. Returns a stop function.
   * Usage:
   *   const stop = await PerformanceService.startTrace('app_startup');
   *   // ... work ...
   *   await stop();
   */
  async startTrace(name: string): Promise<() => Promise<void>> {
    try {
      const perf = getPerformance();
      const t = perfTrace(perf, name);
      await t.start();
      this.activeTraces.set(name, t);
      logger.log(`[Perf] Trace started: ${name}`);
      return async () => {
        try {
          await t.stop();
          this.activeTraces.delete(name);
          logger.log(`[Perf] Trace stopped: ${name}`);
        } catch (e) {
          logger.error(`[Perf] Failed to stop trace ${name}:`, e);
        }
      };
    } catch (e) {
      logger.error(`[Perf] Failed to start trace ${name}:`, e);
      return async () => {}; // no-op
    }
  }

  /**
   * Wrap an async function with a performance trace.
   * Automatically starts/stops and records duration.
   */
  async traceAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const stop = await this.startTrace(name);
    try {
      const result = await fn();
      await stop();
      return result;
    } catch (e) {
      await stop();
      throw e;
    }
  }

  /**
   * Log a screen view trace. Call when a screen mounts, returns cleanup to call on unmount.
   */
  async traceScreenLoad(screenName: string): Promise<() => void> {
    const traceName = `screen_${screenName}`;
    const stop = await this.startTrace(traceName);
    return () => {
      stop();
    };
  }

  /**
   * Get an active trace by name (e.g. to add attributes/metrics before stopping).
   */
  getActiveTrace(name: string): ActiveTrace | undefined {
    return this.activeTraces.get(name);
  }
}

export default new PerformanceService();

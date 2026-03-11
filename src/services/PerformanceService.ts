import { getPerformance, trace as perfTrace } from '@react-native-firebase/perf';
import { isPerfValidationEnabled } from '../config/runtimeConfig';
import logger from '../utils/logger';

type ActiveTrace = {
  stop: () => Promise<void>;
  putAttribute: (name: string, value: string) => void;
  putMetric: (name: string, value: number) => void;
};

type LaunchMark = {
  name: string;
  atMs: number;
  sinceLaunchMs: number;
  detail?: string;
};

type LaunchSummary = {
  sessionStartMs: number;
  marks: LaunchMark[];
};

const MAX_RECENT_SUMMARIES = 5;

class PerformanceService {
  private readonly perfValidationEnabled = isPerfValidationEnabled();
  private readonly bootReferenceMs = Date.now();
  private activeTraces: Map<string, ActiveTrace> = new Map();
  private launchMarks: LaunchMark[] = [];
  private recentLaunchSummaries: LaunchSummary[] = [];

  private debugLog(...args: unknown[]) {
    if (!this.perfValidationEnabled) return;
    console.log('[PerfValidation]', ...args);
  }

  private buildLaunchSummary(): LaunchSummary {
    return {
      sessionStartMs: this.bootReferenceMs,
      marks: [...this.launchMarks],
    };
  }

  private commitLaunchSummary() {
    const summary = this.buildLaunchSummary();
    this.recentLaunchSummaries = [summary, ...this.recentLaunchSummaries].slice(0, MAX_RECENT_SUMMARIES);
  }

  markLaunchMilestone(name: string, detail?: string) {
    const atMs = Date.now();
    const mark: LaunchMark = {
      name,
      atMs,
      sinceLaunchMs: atMs - this.bootReferenceMs,
      detail,
    };

    const existingIndex = this.launchMarks.findIndex((entry) => entry.name === name);
    if (existingIndex >= 0) {
      this.launchMarks[existingIndex] = mark;
    } else {
      this.launchMarks.push(mark);
    }

    this.debugLog(`${name} @ ${mark.sinceLaunchMs}ms${detail ? ` (${detail})` : ''}`);
  }

  finalizeLaunchSummary(reason: string) {
    this.markLaunchMilestone('launch_summary_ready', reason);
    this.commitLaunchSummary();
    const summary = this.getLatestLaunchSummary();
    if (!summary || !this.perfValidationEnabled) return;

    this.debugLog(
      'launch_summary',
      summary.marks.map((mark) => `${mark.name}:${mark.sinceLaunchMs}ms`).join(', ')
    );
  }

  getLatestLaunchSummary(): LaunchSummary | null {
    return this.recentLaunchSummaries[0] ?? (this.launchMarks.length > 0 ? this.buildLaunchSummary() : null);
  }

  getRecentLaunchSummaries(): LaunchSummary[] {
    return [...this.recentLaunchSummaries];
  }

  async startTrace(name: string): Promise<() => Promise<void>> {
    try {
      const perf = getPerformance();
      const t = perfTrace(perf, name);
      await t.start();
      this.activeTraces.set(name, t);
      logger.log(`[Perf] Trace started: ${name}`);
      this.debugLog(`trace_started:${name}`);
      return async () => {
        try {
          await t.stop();
          this.activeTraces.delete(name);
          logger.log(`[Perf] Trace stopped: ${name}`);
          this.debugLog(`trace_stopped:${name}`);
        } catch (e) {
          logger.error(`[Perf] Failed to stop trace ${name}:`, e);
        }
      };
    } catch (e) {
      logger.error(`[Perf] Failed to start trace ${name}:`, e);
      return async () => {};
    }
  }

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

  async traceScreenLoad(screenName: string): Promise<() => void> {
    const traceName = `screen_${screenName}`;
    const stop = await this.startTrace(traceName);
    return () => {
      void stop();
    };
  }

  getActiveTrace(name: string): ActiveTrace | undefined {
    return this.activeTraces.get(name);
  }
}

export type { LaunchMark, LaunchSummary };
export default new PerformanceService();

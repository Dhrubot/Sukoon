describe('PerformanceService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadService(options?: {
    perfValidationEnabled?: boolean;
    startFails?: boolean;
    stopFails?: boolean;
  }) {
    const start = jest.fn(async () => {
      if (options?.startFails) {
        throw new Error('start failed');
      }
    });
    const stop = jest.fn(async () => {
      if (options?.stopFails) {
        throw new Error('stop failed');
      }
    });
    const putAttribute = jest.fn();
    const putMetric = jest.fn();
    const trace = jest.fn(() => ({
      start,
      stop,
      putAttribute,
      putMetric,
    }));

    jest.doMock('@react-native-firebase/perf', () => ({
      getPerformance: jest.fn(() => ({ app: 'perf' })),
      trace,
    }));
    jest.doMock('../config/runtimeConfig', () => ({
      isPerfValidationEnabled: jest.fn(() => options?.perfValidationEnabled ?? false),
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/PerformanceService').default;
    return { service, mocks: { trace, start, stop, putAttribute, putMetric } };
  }

  it('tracks launch milestones and finalizes launch summaries once', () => {
    const { service } = loadService({ perfValidationEnabled: true });

    service.markLaunchMilestone('bootstrap_started');
    jest.setSystemTime(new Date('2026-03-18T10:00:01.000Z'));
    service.markLaunchMilestoneOnce('bootstrap_started');
    service.markLaunchMilestoneOnce('app_ready', 'all services loaded');
    service.finalizeLaunchSummary('ready');

    const latest = service.getLatestLaunchSummary();
    expect(latest?.marks.map((mark: { name: string }) => mark.name)).toEqual([
      'bootstrap_started',
      'app_ready',
      'launch_summary_ready',
    ]);
    expect(service.getRecentLaunchSummaries()).toHaveLength(1);
  });

  it('starts traces, exposes active traces, and wraps async work', async () => {
    const { service, mocks } = loadService();

    const stopTrace = await service.startTrace('startup');
    expect(service.getActiveTrace('startup')).toBeTruthy();
    await stopTrace();
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.stop).toHaveBeenCalledTimes(1);

    await expect(
      service.traceAsync('fetch_prayers', async () => 'done')
    ).resolves.toBe('done');

    const endScreenTrace = await service.traceScreenLoad('home');
    endScreenTrace();
    expect(mocks.trace).toHaveBeenCalledWith({ app: 'perf' }, 'screen_home');
  });

  it('gracefully handles trace start and stop failures', async () => {
    const failedStart = loadService({ startFails: true });
    const noopStop = await failedStart.service.startTrace('broken');
    await expect(noopStop()).resolves.toBeUndefined();

    const failedStop = loadService({ stopFails: true });
    const stop = await failedStop.service.startTrace('stop_broken');
    await expect(stop()).resolves.toBeUndefined();
  });
});

describe('NotificationTraceService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T06:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists and returns recent trace events when tracing is enabled', () => {
    const setPublicJson = jest.fn();
    const deletePublicValue = jest.fn();

    jest.doMock('../config/runtimeConfig', () => ({
      isNotificationTraceEnabled: () => true,
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getPublicJson: jest.fn(() => [
          {
            at: '2026-03-17T05:55:00.000Z',
            event: 'existing',
            fields: { boot: true },
          },
        ]),
        setPublicJson,
        deletePublicValue,
      },
    }));

    const traceService = require('../services/NotificationTraceService').default;
    traceService.log('schedule_completed', { count: 12, exactAlarmStatus: 'granted' });

    const recentEvents = traceService.getRecentEvents();

    expect(recentEvents[0]).toMatchObject({
      at: '2026-03-17T06:00:00.000Z',
      event: 'schedule_completed',
      fields: { count: 12, exactAlarmStatus: 'granted' },
    });
    expect(recentEvents[1]).toMatchObject({ event: 'existing' });
    expect(setPublicJson).toHaveBeenCalledWith('notification_trace_events', recentEvents);

    traceService.clear();
    expect(deletePublicValue).toHaveBeenCalledWith('notification_trace_events');
    expect(traceService.getRecentEvents()).toEqual([]);
    expect(traceService.isEnabled()).toBe(true);
  });

  it('becomes a no-op when tracing is disabled', () => {
    const storage = {
      getPublicJson: jest.fn(() => [{ event: 'stale' }]),
      setPublicJson: jest.fn(),
      deletePublicValue: jest.fn(),
    };

    jest.doMock('../config/runtimeConfig', () => ({
      isNotificationTraceEnabled: () => false,
    }));
    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: storage,
    }));

    const traceService = require('../services/NotificationTraceService').default;
    traceService.log('ignored');
    traceService.clear();

    expect(traceService.getRecentEvents()).toEqual([]);
    expect(storage.getPublicJson).not.toHaveBeenCalled();
    expect(storage.setPublicJson).not.toHaveBeenCalled();
    expect(storage.deletePublicValue).not.toHaveBeenCalled();
    expect(traceService.isEnabled()).toBe(false);
  });
});

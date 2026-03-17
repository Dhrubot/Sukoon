describe('ReminderStateService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-18T08:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function loadService() {
    const stateStore = new Map<string, any>();
    const getReminderState = jest.fn((prayerId: string) => {
      const value = stateStore.get(prayerId);
      return value ? JSON.parse(JSON.stringify(value)) : null;
    });
    const setReminderState = jest.fn((prayerId: string, value: unknown) => {
      stateStore.set(prayerId, JSON.parse(JSON.stringify(value)));
    });
    const deleteReminderState = jest.fn((prayerId: string) => {
      stateStore.delete(prayerId);
    });
    const getReminderStatesForDays = jest.fn(() => (
      Array.from(stateStore.values()).map((value) => JSON.parse(JSON.stringify(value)))
    ));

    jest.doMock('../services/StorageService', () => ({
      __esModule: true,
      default: {
        getReminderState,
        setReminderState,
        deleteReminderState,
        getReminderStatesForDays,
      },
    }));
    jest.doMock('../utils/logger', () => ({
      __esModule: true,
      default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    }));

    const service = require('../services/ReminderStateService').default;
    return {
      service,
      stateStore,
      mocks: {
        getReminderState,
        setReminderState,
        deleteReminderState,
        getReminderStatesForDays,
      },
    };
  }

  const prayer = {
    name: 'Fajr',
    time: new Date('2026-03-18T05:10:00.000Z'),
    isNext: true,
  };
  const nextPrayer = {
    name: 'Dhuhr',
    time: new Date('2026-03-18T12:15:00.000Z'),
    isNext: false,
  };

  it('initializes reminder state, reuses existing state, and rehydrates stored date fields', () => {
    const { service, stateStore } = loadService();

    const created = service.initializePrayerReminder(prayer, nextPrayer);
    expect(created.prayerId).toBe('Fajr-2026-03-18');
    expect(created.status).toBe('pending');

    const reused = service.initializePrayerReminder(prayer, nextPrayer);
    expect(reused).toBe(created);

    stateStore.set('Asr-2026-03-18', {
      prayerId: 'Asr-2026-03-18',
      prayerName: 'Asr',
      prayerTime: '2026-03-18T15:30:00.000Z',
      nextPrayerTime: '2026-03-18T18:15:00.000Z',
      status: 'snoozed',
      tier1Sent: true,
      tier2SentCount: 1,
      tier3Sent: false,
      snoozeCount: 1,
      lastSnoozeTime: '2026-03-18T15:35:00.000Z',
      completedAt: null,
      skippedAt: null,
      createdAt: '2026-03-18T15:00:00.000Z',
    });

    const restored = service.getReminderState('Asr-2026-03-18');
    expect(restored?.prayerTime).toBeInstanceOf(Date);
    expect(restored?.nextPrayerTime).toBeInstanceOf(Date);
    expect(restored?.lastSnoozeTime).toBeInstanceOf(Date);
    expect(restored?.createdAt).toBeInstanceOf(Date);
  });

  it('updates completion, skip, snooze, and tier flags with the expected gating checks', () => {
    const { service } = loadService();
    const state = service.initializePrayerReminder(prayer, nextPrayer);

    expect(service.incrementSnoozeCount(state.prayerId)).toBe(true);
    expect(service.hasReachedMaxSnoozes(state.prayerId, 1)).toBe(true);

    service.markTier1Sent(state.prayerId);
    service.incrementTier2Count(state.prayerId);
    expect(service.shouldSendTier2Reminder(state.prayerId, 2)).toBe(true);

    service.markTier3Sent(state.prayerId);
    expect(service.shouldSendTier3Warning(state.prayerId)).toBe(false);

    service.markPrayerCompleted(state.prayerId);
    expect(service.shouldSendTier2Reminder(state.prayerId, 5)).toBe(false);

    const skippedState = service.initializePrayerReminder(
      { ...prayer, name: 'Maghrib', time: new Date('2026-03-18T18:05:00.000Z') },
      null
    );
    service.markPrayerSkipped(skippedState.prayerId);
    expect(service.shouldSendTier3Warning(skippedState.prayerId)).toBe(false);
  });

  it('returns today pending reminders, stats, and cleans up stale reminder keys', () => {
    const { service, stateStore, mocks } = loadService();

    service.initializePrayerReminder(prayer, nextPrayer);
    const snoozed = service.initializePrayerReminder(
      { ...prayer, name: 'Dhuhr', time: new Date('2026-03-18T12:15:00.000Z') },
      null
    );
    service.incrementSnoozeCount(snoozed.prayerId);

    const completedId = 'Asr-2026-03-18';
    stateStore.set(completedId, {
      prayerId: completedId,
      prayerName: 'Asr',
      prayerTime: '2026-03-18T15:30:00.000Z',
      nextPrayerTime: null,
      status: 'completed',
      tier1Sent: true,
      tier2SentCount: 0,
      tier3Sent: false,
      snoozeCount: 0,
      lastSnoozeTime: null,
      completedAt: '2026-03-18T15:40:00.000Z',
      skippedAt: null,
      createdAt: '2026-03-18T15:00:00.000Z',
    });

    const pending = service.getTodayPendingReminders();
    expect(pending).toHaveLength(2);
    expect(service.getReminderStats()).toEqual({
      totalToday: 3,
      completed: 1,
      skipped: 0,
      pending: 1,
      snoozed: 1,
    });
    expect(service.getAllStates()).toHaveLength(3);

    const oldDate = new Date('2026-03-09T05:00:00.000Z');
    stateStore.set('Fajr-2026-03-10', {
      prayerId: 'Fajr-2026-03-10',
      prayerName: 'Fajr',
      prayerTime: oldDate.toISOString(),
      nextPrayerTime: null,
      status: 'pending',
      tier1Sent: false,
      tier2SentCount: 0,
      tier3Sent: false,
      snoozeCount: 0,
      lastSnoozeTime: null,
      completedAt: null,
      skippedAt: null,
      createdAt: oldDate.toISOString(),
    });

    service.cleanupOldStates();
    expect(mocks.deleteReminderState).toHaveBeenCalledWith('Fajr-2026-03-10');
  });
});

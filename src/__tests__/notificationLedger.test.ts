jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('NotificationLedger', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-17T05:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks scheduled, delivered, and tapped notifications in its health summary', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    ledger.recordScheduled('notif-1', 'Fajr', new Date('2026-03-17T04:58:00.000Z'));

    jest.setSystemTime(new Date('2026-03-17T05:00:30.000Z'));
    ledger.recordDelivered('notif-1');

    jest.setSystemTime(new Date('2026-03-17T05:01:00.000Z'));
    ledger.recordTapped('notif-1');

    const health = ledger.getHealth();

    expect(health).toMatchObject({
      totalScheduled: 1,
      totalDelivered: 1,
      totalTapped: 1,
      deliveryRate: 1,
      tapRate: 1,
      avgDriftSeconds: 150,
      maxDriftSeconds: 150,
    });
    expect(health.missedNotifications).toEqual([]);
    expect(health.recentEntries[0]).toMatchObject({
      id: 'notif-1',
      label: 'Fajr',
      tappedAt: '2026-03-17T05:01:00.000Z',
    });
  });

  it('caps persisted entries and reports recently missed notifications', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    for (let i = 0; i < 205; i += 1) {
      ledger.recordScheduled(
        `notif-${i}`,
        'Maghrib',
        new Date(`2026-03-16T18:${String(i % 60).padStart(2, '0')}:00.000Z`)
      );
    }

    const health = ledger.getHealth();

    expect(health.totalScheduled).toBe(200);
    expect(health.recentEntries).toHaveLength(20);
    expect(health.missedNotifications).toHaveLength(10);
    expect(health.missedNotifications[0].id).toBe('notif-195');
    expect(health.recentEntries[0].id).toBe('notif-204');
  });
});

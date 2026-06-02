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

  it('reconcileDelivery backfills past-due entries that are no longer pending', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    // Two scheduled in the past, one still pending, one cleared (= fired).
    ledger.recordScheduled('fajr', 'Fajr', new Date('2026-03-17T04:30:00.000Z'));
    ledger.recordScheduled('dhuhr', 'Dhuhr', new Date('2026-03-17T04:50:00.000Z'));
    // System pending list still contains dhuhr — fajr was cleared by the OS.
    const stillScheduled = new Set(['dhuhr']);

    const marked = ledger.reconcileDelivery(stillScheduled);

    expect(marked).toBe(1);
    const health = ledger.getHealth();
    expect(health.totalDelivered).toBe(1);
    const fajr = health.recentEntries.find((e: { id: string }) => e.id === 'fajr');
    expect(fajr).toMatchObject({ deliveredAt: '2026-03-17T04:30:00.000Z', driftSeconds: 0 });
    const dhuhr = health.recentEntries.find((e: { id: string }) => e.id === 'dhuhr');
    expect(dhuhr?.deliveredAt).toBeNull();
  });

  it('reconcileDelivery respects the 30s grace window so just-fired alarms are not falsely marked', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    // Scheduled 10s ago — inside the grace window.
    ledger.recordScheduled('recent', 'Asr', new Date('2026-03-17T04:59:50.000Z'));

    const marked = ledger.reconcileDelivery(new Set());

    expect(marked).toBe(0);
    expect(ledger.getHealth().totalDelivered).toBe(0);
  });

  it('reconcileDelivery is idempotent — already-delivered entries are skipped', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    ledger.recordScheduled('isha', 'Isha', new Date('2026-03-17T04:30:00.000Z'));
    expect(ledger.reconcileDelivery(new Set())).toBe(1);
    // Second pass should be a no-op.
    expect(ledger.reconcileDelivery(new Set())).toBe(0);
  });

  it('recordTapped backfills deliveredAt when a tap arrives before any delivery proof', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    ledger.recordScheduled('maghrib', 'Maghrib', new Date('2026-03-17T04:30:00.000Z'));

    jest.setSystemTime(new Date('2026-03-17T05:02:00.000Z'));
    ledger.recordTapped('maghrib');

    const health = ledger.getHealth();
    expect(health.totalDelivered).toBe(1);
    expect(health.totalTapped).toBe(1);
    const maghrib = health.recentEntries.find((e: { id: string }) => e.id === 'maghrib');
    expect(maghrib).toMatchObject({
      deliveredAt: '2026-03-17T04:30:00.000Z',
      tappedAt: '2026-03-17T05:02:00.000Z',
    });
  });
});

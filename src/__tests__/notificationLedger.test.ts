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

    // Two scheduled at 05:00 system time, both fire in the past (4:30 / 4:50) —
    // actually no: with scheduledAt=5am, scheduledFor=4:30 means scheduledAt
    // is AFTER scheduledFor, which we now skip. Move scheduledAt earlier so
    // these look like real future schedules that have since fired.
    jest.setSystemTime(new Date('2026-03-17T04:00:00.000Z'));
    ledger.recordScheduled('fajr', 'Fajr', new Date('2026-03-17T04:30:00.000Z'));
    ledger.recordScheduled('dhuhr', 'Dhuhr', new Date('2026-03-17T04:50:00.000Z'));
    // Jump past both fire times. System pending list still contains dhuhr —
    // fajr was cleared by the OS.
    jest.setSystemTime(new Date('2026-03-17T05:00:00.000Z'));
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

  it('reconcileDelivery skips entries scheduled after their fire time (post-install backfill case)', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    // User installs at 05:00 today. Onboarding writes ledger entries for ALL
    // of today's prayers including the past ones. Today's Fajr (04:30) gets
    // scheduledAt=05:00, scheduledFor=04:30 — we never actually had a chance
    // to deliver it. Must not be marked delivered.
    jest.setSystemTime(new Date('2026-03-17T05:00:00.000Z'));
    ledger.recordScheduled('fajr-today', 'Fajr', new Date('2026-03-17T04:30:00.000Z'));

    const marked = ledger.reconcileDelivery(new Set());

    expect(marked).toBe(0);
    expect(ledger.getHealth().totalDelivered).toBe(0);
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

    jest.setSystemTime(new Date('2026-03-17T04:00:00.000Z'));
    ledger.recordScheduled('isha', 'Isha', new Date('2026-03-17T04:30:00.000Z'));
    jest.setSystemTime(new Date('2026-03-17T05:00:00.000Z'));
    expect(ledger.reconcileDelivery(new Set())).toBe(1);
    // Second pass should be a no-op.
    expect(ledger.reconcileDelivery(new Set())).toBe(0);
  });

  it('recordTapped backfills deliveredAt with the tap time when delivery proof is missing', () => {
    const ledger = require('../services/NotificationLedger').default;
    ledger.clear();

    jest.setSystemTime(new Date('2026-03-17T04:00:00.000Z'));
    ledger.recordScheduled('maghrib', 'Maghrib', new Date('2026-03-17T04:30:00.000Z'));

    jest.setSystemTime(new Date('2026-03-17T05:02:00.000Z'));
    ledger.recordTapped('maghrib');

    const health = ledger.getHealth();
    expect(health.totalDelivered).toBe(1);
    expect(health.totalTapped).toBe(1);
    const maghrib = health.recentEntries.find((e: { id: string }) => e.id === 'maghrib');
    // Tap is the lower-bound proof — record at tap time, with drift from
    // scheduledFor to tap (32 minutes here).
    expect(maghrib).toMatchObject({
      deliveredAt: '2026-03-17T05:02:00.000Z',
      tappedAt: '2026-03-17T05:02:00.000Z',
      driftSeconds: 32 * 60,
    });
  });
});

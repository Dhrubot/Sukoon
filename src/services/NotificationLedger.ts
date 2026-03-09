// src/services/NotificationLedger.ts
// Dev-only notification delivery confirmation ledger.
// Tracks: scheduled → delivered → tapped/dismissed for every notification.
// Persisted in unencrypted MMKV (non-PII data). Capped at 200 entries.
// Surface via NotificationDebugScreen's "Notification Health" section.

import { createMMKV } from 'react-native-mmkv';
import logger from '../utils/logger';

const LEDGER_KEY = 'notification_ledger';
const MAX_ENTRIES = 200;

export interface LedgerEntry {
  /** Notification identifier from expo-notifications */
  id: string;
  /** Prayer name or notification type (e.g. 'Fajr', 'pre-prayer', 'keepalive') */
  label: string;
  /** Intended trigger time (ISO string) */
  scheduledFor: string;
  /** When the notification was scheduled (ISO string) */
  scheduledAt: string;
  /** When the notification was delivered to the device (ISO string, null if not yet) */
  deliveredAt: string | null;
  /** When the user tapped the notification (ISO string, null if not tapped) */
  tappedAt: string | null;
  /** Timing accuracy: deliveredAt - scheduledFor in seconds (null if not delivered) */
  driftSeconds: number | null;
}

export interface LedgerHealth {
  totalScheduled: number;
  totalDelivered: number;
  totalTapped: number;
  deliveryRate: number;
  tapRate: number;
  avgDriftSeconds: number;
  maxDriftSeconds: number;
  missedNotifications: LedgerEntry[];
  recentEntries: LedgerEntry[];
}

class NotificationLedger {
  private storage: ReturnType<typeof createMMKV> | null = null;

  private getStorage() {
    if (!this.storage) {
      try {
        this.storage = createMMKV({ id: 'sukoon-notification-ledger' });
      } catch (e) {
        logger.error('⚠️ NotificationLedger MMKV init failed:', e);
        return null;
      }
    }
    return this.storage;
  }

  private getEntries(): LedgerEntry[] {
    const store = this.getStorage();
    if (!store) return [];
    const raw = store.getString(LEDGER_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as LedgerEntry[];
    } catch {
      return [];
    }
  }

  private saveEntries(entries: LedgerEntry[]): void {
    const store = this.getStorage();
    if (!store) return;
    // Cap at MAX_ENTRIES, keep newest
    const capped = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
    store.set(LEDGER_KEY, JSON.stringify(capped));
  }

  /** Record that a notification was scheduled. */
  recordScheduled(id: string, label: string, scheduledFor: Date): void {
    if (!__DEV__) return;
    const entries = this.getEntries();
    entries.push({
      id,
      label,
      scheduledFor: scheduledFor.toISOString(),
      scheduledAt: new Date().toISOString(),
      deliveredAt: null,
      tappedAt: null,
      driftSeconds: null,
    });
    this.saveEntries(entries);
  }

  /** Record that a notification was delivered to the device. */
  recordDelivered(id: string): void {
    if (!__DEV__) return;
    const entries = this.getEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      const now = new Date();
      entry.deliveredAt = now.toISOString();
      if (entry.scheduledFor) {
        entry.driftSeconds = Math.round(
          (now.getTime() - new Date(entry.scheduledFor).getTime()) / 1000
        );
      }
      this.saveEntries(entries);
    }
  }

  /** Record that the user tapped a notification. */
  recordTapped(id: string): void {
    if (!__DEV__) return;
    const entries = this.getEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry.tappedAt = new Date().toISOString();
      this.saveEntries(entries);
    }
  }

  /** Get health summary of notification delivery. */
  getHealth(): LedgerHealth {
    const entries = this.getEntries();
    const totalScheduled = entries.length;
    const delivered = entries.filter(e => e.deliveredAt !== null);
    const tapped = entries.filter(e => e.tappedAt !== null);
    const drifts = delivered
      .map(e => e.driftSeconds)
      .filter((d): d is number => d !== null);

    // "Missed" = scheduled more than 5 min ago but never delivered
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const missed = entries.filter(
      e =>
        e.deliveredAt === null &&
        new Date(e.scheduledFor).getTime() < fiveMinAgo
    );

    return {
      totalScheduled,
      totalDelivered: delivered.length,
      totalTapped: tapped.length,
      deliveryRate: totalScheduled > 0 ? delivered.length / totalScheduled : 0,
      tapRate: delivered.length > 0 ? tapped.length / delivered.length : 0,
      avgDriftSeconds:
        drifts.length > 0
          ? Math.round(drifts.reduce((a, b) => a + b, 0) / drifts.length)
          : 0,
      maxDriftSeconds: drifts.length > 0 ? Math.max(...drifts) : 0,
      missedNotifications: missed.slice(-10),
      recentEntries: entries.slice(-20).reverse(),
    };
  }

  /** Clear all ledger data. */
  clear(): void {
    const store = this.getStorage();
    if (store) store.remove(LEDGER_KEY);
  }
}

export default new NotificationLedger();

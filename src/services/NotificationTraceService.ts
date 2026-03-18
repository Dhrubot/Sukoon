import StorageService from './StorageService';
import { isNotificationTraceEnabled } from '../config/runtimeConfig';

export interface NotificationTraceEvent {
  at: string;
  event: string;
  fields?: Record<string, string | number | boolean | null | undefined>;
}

const TRACE_STORAGE_KEY = 'notification_trace_events';
const MAX_TRACE_EVENTS = 200;

class NotificationTraceService {
  private readonly enabled = isNotificationTraceEnabled();
  private recentEvents: NotificationTraceEvent[] = [];

  constructor() {
    this.recentEvents = this.readPersistedEvents();
  }

  private readPersistedEvents(): NotificationTraceEvent[] {
    if (!this.enabled) return [];
    return StorageService.getPublicJson<NotificationTraceEvent[]>(TRACE_STORAGE_KEY) ?? [];
  }

  private persist(events: NotificationTraceEvent[]) {
    if (!this.enabled) return;
    StorageService.setPublicJson(TRACE_STORAGE_KEY, events);
  }

  log(event: string, fields?: Record<string, string | number | boolean | null | undefined>) {
    if (!this.enabled) return;

    const traceEvent: NotificationTraceEvent = {
      at: new Date().toISOString(),
      event,
      fields,
    };

    this.recentEvents = [traceEvent, ...this.recentEvents].slice(0, MAX_TRACE_EVENTS);
    this.persist(this.recentEvents);
    console.log('[NotificationTrace]', JSON.stringify(traceEvent));
  }

  getRecentEvents(): NotificationTraceEvent[] {
    return [...this.recentEvents];
  }

  clear() {
    this.recentEvents = [];
    if (!this.enabled) return;
    StorageService.deletePublicValue(TRACE_STORAGE_KEY);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default new NotificationTraceService();

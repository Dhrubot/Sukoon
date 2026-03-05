// src/services/ReminderStateService.ts
import { format } from 'date-fns';
import { PrayerName, PrayerTime, PrayerReminderState } from '../types';
import StorageService from './StorageService';

class ReminderStateService {
  private stateCache: Map<string, PrayerReminderState> = new Map();
  
  /**
   * Generate unique prayer ID
   */
  private generatePrayerId(prayerName: PrayerName, prayerTime: Date): string {
    return `${prayerName}-${format(prayerTime, 'yyyy-MM-dd')}`;
  }
  
  /**
   * Initialize reminder state for a prayer
   */
  initializePrayerReminder(
    prayer: PrayerTime,
    nextPrayer: PrayerTime | null
  ): PrayerReminderState {
    const prayerId = this.generatePrayerId(prayer.name, prayer.time);
    
    // Check if state already exists
    const existing = this.getReminderState(prayerId);
    if (existing) {
      return existing;
    }
    
    const state: PrayerReminderState = {
      prayerId,
      prayerName: prayer.name,
      prayerTime: prayer.time,
      nextPrayerTime: nextPrayer?.time || null,
      status: 'pending',
      tier1Sent: false,
      tier2SentCount: 0,
      tier3Sent: false,
      snoozeCount: 0,
      lastSnoozeTime: null,
      completedAt: null,
      skippedAt: null,
      createdAt: new Date(),
    };
    
    this.saveReminderState(state);
    return state;
  }
  
  /**
   * Get reminder state for a prayer
   */
  getReminderState(prayerId: string): PrayerReminderState | null {
    // Check cache first
    if (this.stateCache.has(prayerId)) {
      return this.stateCache.get(prayerId)!;
    }
    
    // Load from storage
    const state = StorageService.getReminderState(prayerId);
    if (state) {
      // Convert date strings back to Date objects
      state.prayerTime = new Date(state.prayerTime);
      state.nextPrayerTime = state.nextPrayerTime ? new Date(state.nextPrayerTime) : null;
      state.lastSnoozeTime = state.lastSnoozeTime ? new Date(state.lastSnoozeTime) : null;
      state.completedAt = state.completedAt ? new Date(state.completedAt) : null;
      state.skippedAt = state.skippedAt ? new Date(state.skippedAt) : null;
      state.createdAt = new Date(state.createdAt);
      
      this.stateCache.set(prayerId, state);
    }
    
    return state;
  }
  
  /**
   * Save reminder state
   */
  private saveReminderState(state: PrayerReminderState): void {
    this.stateCache.set(state.prayerId, state);
    StorageService.setReminderState(state.prayerId, state);
  }
  
  /**
   * Mark prayer as completed
   */
  markPrayerCompleted(prayerId: string): void {
    const state = this.getReminderState(prayerId);
    if (!state) return;
    
    state.status = 'completed';
    state.completedAt = new Date();
    this.saveReminderState(state);
    
    console.log(`✅ Prayer ${prayerId} marked as completed`);
  }
  
  /**
   * Mark prayer as skipped
   */
  markPrayerSkipped(prayerId: string): void {
    const state = this.getReminderState(prayerId);
    if (!state) return;
    
    state.status = 'skipped';
    state.skippedAt = new Date();
    this.saveReminderState(state);
    
    console.log(`⏭️ Prayer ${prayerId} marked as skipped`);
  }
  
  /**
   * Increment snooze count
   */
  incrementSnoozeCount(prayerId: string): boolean {
    const state = this.getReminderState(prayerId);
    if (!state) return false;
    
    state.snoozeCount++;
    state.lastSnoozeTime = new Date();
    state.status = 'snoozed';
    this.saveReminderState(state);
    
    console.log(`⏰ Prayer ${prayerId} snoozed (count: ${state.snoozeCount})`);
    return true;
  }
  
  /**
   * Mark Tier 1 (main notification) as sent
   */
  markTier1Sent(prayerId: string): void {
    const state = this.getReminderState(prayerId);
    if (!state) return;
    
    state.tier1Sent = true;
    this.saveReminderState(state);
  }
  
  /**
   * Increment Tier 2 (persistent reminder) count
   */
  incrementTier2Count(prayerId: string): void {
    const state = this.getReminderState(prayerId);
    if (!state) return;
    
    state.tier2SentCount++;
    this.saveReminderState(state);
    
    console.log(`🔔 Tier 2 reminder #${state.tier2SentCount} sent for ${prayerId}`);
  }
  
  /**
   * Mark Tier 3 (grace period warning) as sent
   */
  markTier3Sent(prayerId: string): void {
    const state = this.getReminderState(prayerId);
    if (!state) return;
    
    state.tier3Sent = true;
    this.saveReminderState(state);
  }
  
  /**
   * Check if should send Tier 2 reminder
   */
  shouldSendTier2Reminder(prayerId: string, maxReminders: number): boolean {
    const state = this.getReminderState(prayerId);
    if (!state) return false;
    
    // Don't send if already completed or skipped
    if (state.status === 'completed' || state.status === 'skipped') {
      return false;
    }
    
    // Check if under max reminder limit
    return state.tier2SentCount < maxReminders;
  }
  
  /**
   * Check if should send Tier 3 warning
   */
  shouldSendTier3Warning(prayerId: string): boolean {
    const state = this.getReminderState(prayerId);
    if (!state) return false;
    
    // Don't send if already sent, or prayer is completed/skipped
    if (state.tier3Sent || state.status === 'completed' || state.status === 'skipped') {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if max snoozes reached
   */
  hasReachedMaxSnoozes(prayerId: string, maxSnoozes: number): boolean {
    const state = this.getReminderState(prayerId);
    if (!state) return false;
    
    return state.snoozeCount >= maxSnoozes;
  }
  
  /**
   * Get all pending reminder states for today
   */
  getTodayPendingReminders(): PrayerReminderState[] {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Deterministic: check today's 5 prayers only (no getAllKeys scan)
    const todayStates = StorageService.getReminderStatesForDays(1);
    
    return todayStates.filter(state => {
      const stateDate = format(new Date(state.prayerTime), 'yyyy-MM-dd');
      return stateDate === today && 
             (state.status === 'pending' || state.status === 'snoozed');
    });
  }
  
  /**
   * Clean up old reminder states (older than 7 days)
   * Uses deterministic lookups: days 8-14 × 5 prayers = 35 key checks (no getAllKeys scan)
   */
  cleanupOldStates(): void {
    let cleaned = 0;
    const prayers: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    // Check days 8 through 14 (one week beyond the 7-day window)
    for (let i = 8; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');

      for (const prayer of prayers) {
        const prayerId = `${prayer}-${dateStr}`;
        const state = StorageService.getReminderState(prayerId);
        if (state) {
          StorageService.deleteReminderState(prayerId);
          this.stateCache.delete(prayerId);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old reminder states`);
    }
  }
  
  /**
   * Get reminder statistics
   */
  getReminderStats(): {
    totalToday: number;
    completed: number;
    skipped: number;
    pending: number;
    snoozed: number;
  } {
    // Deterministic: check today's 5 prayers only
    const todayStates = StorageService.getReminderStatesForDays(1);
    
    return {
      totalToday: todayStates.length,
      completed: todayStates.filter(s => s.status === 'completed').length,
      skipped: todayStates.filter(s => s.status === 'skipped').length,
      pending: todayStates.filter(s => s.status === 'pending').length,
      snoozed: todayStates.filter(s => s.status === 'snoozed').length,
    };
  }
  
  /**
   * Debug: Get all states (bounded to last 7 days)
   */
  getAllStates(): PrayerReminderState[] {
    return StorageService.getReminderStatesForDays(7);
  }
}

export default new ReminderStateService();
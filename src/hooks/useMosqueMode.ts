// src/hooks/useMosqueMode.ts
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import MosqueModeService from '../services/MosqueModeService';
import AnalyticsService from '../services/AnalyticsService';
import { PrayerTime, PrayerName, MosqueModeSettings } from '../types';

export const useMosqueMode = () => {
  const userSettings = useStore((s) => s.userSettings);
  const updateUserSettings = useStore((s) => s.updateUserSettings);
  const [isActive, setIsActive] = useState(false);
  const [activeState, setActiveState] = useState<{
    prayer: PrayerName;
    iqamahTime: Date;
    restoreTime: Date;
  } | null>(null);

  // Shared clock from PrayerTimesProvider's single 60s tick
  const currentTime = useStore((s) => s.currentTime);

  // Re-evaluate mosque mode state whenever the shared clock ticks
  useEffect(() => {
    const active = MosqueModeService.getActiveMosqueMode();
    setActiveState(active);
    setIsActive(MosqueModeService.isCurrentlyActive());
  }, [currentTime]);

  // Enable mosque mode
  const enableMosqueMode = useCallback(async (enabled: boolean) => {
    updateUserSettings({ mosqueMode: { enabled } as any });

    if (enabled) {
      AnalyticsService.logEvent('mosque_mode_activated');
    } else {
      AnalyticsService.logEvent('mosque_mode_deactivated');
    }
  }, [updateUserSettings]);

  // Update iqamah offset for a prayer
  const setIqamahOffset = useCallback(
    async (prayer: PrayerName, minutes: number) => {
      const current = useStore.getState().userSettings;
      if (!current) return;

      updateUserSettings({
        mosqueMode: {
          iqamahOffsets: {
            ...current.mosqueMode.iqamahOffsets,
            [prayer]: minutes,
          },
        } as any,
      });
    },
    [updateUserSettings]
  );

  // Update mosque mode settings
  const updateMosqueModeSettings = useCallback(
    async (updates: Partial<MosqueModeSettings>) => {
      updateUserSettings({ mosqueMode: updates as any });
    },
    [updateUserSettings]
  );

  // Schedule silent mode for a prayer
  const scheduleSilentMode = useCallback(async (prayer: PrayerTime) => {
    const success = await MosqueModeService.scheduleSilentMode(prayer);
    if (success) {
      // Update active state
      const active = MosqueModeService.getActiveMosqueMode();
      setActiveState(active);
      setIsActive(true);
    }
    return success;
  }, []);

  // Cancel mosque mode for a prayer
  const cancelMosqueMode = useCallback(async (prayer: PrayerName) => {
    await MosqueModeService.cancelMosqueMode(prayer);
    setActiveState(null);
    setIsActive(false);
  }, []);

  // Manually restore ringer (end mosque mode early)
  const manuallyRestoreRinger = useCallback(async () => {
    const success = await MosqueModeService.manuallyRestoreRinger();
    if (success) {
      setActiveState(null);
      setIsActive(false);
    }
    return success;
  }, []);

  // Get iqamah time for a prayer
  const getIqamahTime = useCallback(
    (prayer: PrayerTime) => {
      return MosqueModeService.getIqamahTime(prayer);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userSettings?.mosqueMode?.iqamahOffsets]
  );

  // Check if enabled for a specific prayer
  const isEnabledForPrayer = useCallback(
    (prayer: PrayerName) => {
      return MosqueModeService.isEnabledForPrayer(prayer);
    },
    []
  );

  return {
    // State
    isEnabled: userSettings?.mosqueMode?.enabled || false,
    settings: userSettings?.mosqueMode,
    isActive,
    activeState,

    // Actions
    enableMosqueMode,
    setIqamahOffset,
    updateMosqueModeSettings,
    scheduleSilentMode,
    cancelMosqueMode,
    manuallyRestoreRinger,

    // Utilities
    getIqamahTime,
    isEnabledForPrayer,
  };
};

// src/hooks/useMosqueMode.ts
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import MosqueModeService from '../services/MosqueModeService';
import AnalyticsService from '../services/AnalyticsService';
import { PrayerTime, PrayerName, MosqueModeSettings } from '../types';

export const useMosqueMode = () => {
  const { userSettings, setUserSettings } = useStore();
  const [isActive, setIsActive] = useState(false);
  const [activeState, setActiveState] = useState<{
    prayer: PrayerName;
    iqamahTime: Date;
    restoreTime: Date;
  } | null>(null);

  // Check if mosque mode is currently active
  useEffect(() => {
    const checkActive = () => {
      const active = MosqueModeService.getActiveMosqueMode();
      setActiveState(active);
      setIsActive(MosqueModeService.isCurrentlyActive());
    };

    checkActive();
    
    // Check every minute
    const interval = setInterval(checkActive, 60000);
    return () => clearInterval(interval);
  }, []);

  // Enable mosque mode
  const enableMosqueMode = useCallback(async (enabled: boolean) => {
    if (!userSettings) return;

    const updated = {
      ...userSettings,
      mosqueMode: {
        ...userSettings.mosqueMode,
        enabled,
      },
    };

    setUserSettings(updated);

    if (enabled) {
      AnalyticsService.logEvent('mosque_mode_activated');
    } else {
      AnalyticsService.logEvent('mosque_mode_deactivated');
    }
  }, [userSettings, setUserSettings]);

  // Update iqamah offset for a prayer
  const setIqamahOffset = useCallback(
    async (prayer: PrayerName, minutes: number) => {
      if (!userSettings) return;

      const updated = {
        ...userSettings,
        mosqueMode: {
          ...userSettings.mosqueMode,
          iqamahOffsets: {
            ...userSettings.mosqueMode.iqamahOffsets,
            [prayer]: minutes,
          },
        },
      };

      setUserSettings(updated);
    },
    [userSettings, setUserSettings]
  );

  // Update mosque mode settings
  const updateMosqueModeSettings = useCallback(
    async (updates: Partial<MosqueModeSettings>) => {
      if (!userSettings) return;

      const updated = {
        ...userSettings,
        mosqueMode: {
          ...userSettings.mosqueMode,
          ...updates,
        },
      };

      setUserSettings(updated);
    },
    [userSettings, setUserSettings]
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

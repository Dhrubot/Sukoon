// src/assets/icons/index.ts
// Export all icon assets for easy importing
import React from 'react';

// ========================================
// TAB NAVIGATION ICONS (SVG)
// ========================================
export { default as HomeTabIcon } from '../../../assets/icons/home-tab-icon.svg';
export { default as QiblaTabIcon } from '../../../assets/icons/qibla-tab-icon.svg';
export { default as ProgressTabIcon } from '../../../assets/icons/progress-tab-icon.svg';
export { default as DuaTabIcon } from '../../../assets/icons/dua-tab-icon.svg';

// ========================================
// FEATURE ICONS (SVG)
// ========================================
export { default as AchievementIcon } from '../../../assets/icons/achievement-icon.svg';

// ========================================
// NOTIFICATION ICONS (now inline SVG components in NotificationToggleButton)
// Legacy exports kept for backward compatibility
// ========================================
export { default as SoundOnIcon } from '../../../assets/icons/sound-on-icon.svg';
export { default as SoundOffIcon } from '../../../assets/icons/sound-off-icon.svg';

// ========================================
// PRAYER TIME ICONS (SVG — tintable)
// ========================================
export { FajrSvg, SunriseSvg, DhuhrSvg, AsrSvg, MaghribSvg, IshaSvg, SunsetSvg } from './prayer';

// Legacy PNG exports (kept for backward compatibility)
export const FajrIcon = require('../../../assets/icons/fajr-icon.png');
export const DhuhrIcon = require('../../../assets/icons/duhr-icon.png');
export const AsrIcon = require('../../../assets/icons/asr-icon.png');
export const MaghribIcon = require('../../../assets/icons/maghrib-icon.png');
export const IshaIcon = require('../../../assets/icons/isha-icon.png');
export const SunriseIcon = require('../../../assets/icons/sunrise-icon.png');
export const SunsetIcon = require('../../../assets/icons/sunset-icon.png');

// ========================================
// OTHER ICONS (PNG)
// ========================================
export const MoonIcon = require('../../../assets/icons/thin-moon (1).png');

// ========================================
// PRAYER ICON MAPPING (SVG — tintable)
// ========================================
import { FajrSvg as _FajrSvg, SunriseSvg as _SunriseSvg, DhuhrSvg as _DhuhrSvg, AsrSvg as _AsrSvg, MaghribSvg as _MaghribSvg, IshaSvg as _IshaSvg, SunsetSvg as _SunsetSvg } from './prayer';

export const getPrayerIcon = (prayerName: string) => {
  const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
    fajr: _FajrSvg,
    sunrise: _SunriseSvg,
    dhuhr: _DhuhrSvg,
    asr: _AsrSvg,
    sunset: _SunsetSvg,
    maghrib: _MaghribSvg,
    isha: _IshaSvg,
  };
  return iconMap[prayerName.toLowerCase()] || _IshaSvg;
};

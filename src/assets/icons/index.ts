// src/assets/icons/index.ts
// Export all icon assets for easy importing

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
export { default as DigitalWellnessIcon } from '../../../assets/icons/digital-wellness-icon.svg';

// ========================================
// NOTIFICATION ICONS (SVG)
// ========================================
export { default as SoundOnIcon } from '../../../assets/icons/sound-on-icon.svg';
export { default as SoundOffIcon } from '../../../assets/icons/sound-off-icon.svg';

// ========================================
// PRAYER TIME ICONS (PNG)
// ========================================
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
// PRAYER ICON MAPPING
// ========================================
export const getPrayerIcon = (prayerName: string) => {
  const iconMap: Record<string, any> = {
    fajr: FajrIcon,
    sunrise: SunriseIcon,
    dhuhr: DhuhrIcon,
    asr: AsrIcon,
    sunset: SunsetIcon,
    maghrib: MaghribIcon,
    isha: IshaIcon,
  };
  return iconMap[prayerName.toLowerCase()] || MoonIcon;
};

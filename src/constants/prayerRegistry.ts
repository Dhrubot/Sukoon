// ═══════════════════════════════════════════════════════════════════
// Prayer Registry — Single source of truth for all prayer definitions
// ═══════════════════════════════════════════════════════════════════
// To add a new prayer (e.g., Jumah, Taraweeh, Tahajjud):
//   1. Add a PrayerDefinition to OPTIONAL_PRAYERS below
//   2. Add its name to ExtendedPrayerName in types/index.ts
//   3. Add a gradient in theme/colors.ts → prayerGradients
//   4. The rest of the app will pick it up automatically

export type PrayerCategory = 'fard' | 'sunnah' | 'seasonal' | 'weekly';

export interface PrayerDefinition {
  /** Display name (e.g. "Fajr") — matches PrayerName type */
  name: string;
  /** Lowercase key for lookups (e.g. "fajr") */
  key: string;
  /** Emoji icon */
  icon: string;
  /** Arabic display name */
  arabic: string;
  /** Prayer category */
  category: PrayerCategory;
  /** Display order (1-based) */
  order: number;
  /** When this prayer is available. Fard = always. */
  availability?: {
    condition: 'always' | 'ramadan' | 'friday';
  };
  /** How to derive the time from the API response or other prayers */
  timeSource: {
    type: 'api' | 'relative';
    /** Aladhan API field name (e.g. "Fajr", "Dhuhr") */
    apiField?: string;
    /** For relative times: base prayer name */
    relativeTo?: string;
    /** For relative times: offset in minutes after base prayer */
    offsetMinutes?: number;
  };
}

// ─── Fard Prayers (always shown) ────────────────────────────────
export const FARD_PRAYERS: readonly PrayerDefinition[] = [
  {
    name: 'Fajr', key: 'fajr', icon: '🌅', arabic: 'الفجر',
    category: 'fard', order: 1,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Fajr' },
  },
  {
    name: 'Dhuhr', key: 'dhuhr', icon: '☀️', arabic: 'الظهر',
    category: 'fard', order: 2,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Dhuhr' },
  },
  {
    name: 'Asr', key: 'asr', icon: '🌤', arabic: 'العصر',
    category: 'fard', order: 3,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Asr' },
  },
  {
    name: 'Maghrib', key: 'maghrib', icon: '🌇', arabic: 'المغرب',
    category: 'fard', order: 4,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Maghrib' },
  },
  {
    name: 'Isha', key: 'isha', icon: '🌙', arabic: 'العشاء',
    category: 'fard', order: 5,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Isha' },
  },
] as const;

// ─── Optional / Seasonal Prayers ────────────────────────────────
// These are not shown by default. Consumers check availability.condition
// before displaying them.
export const OPTIONAL_PRAYERS: readonly PrayerDefinition[] = [
  {
    name: 'Taraweeh', key: 'taraweeh', icon: '🌟', arabic: 'التراويح',
    category: 'seasonal', order: 6,
    availability: { condition: 'ramadan' },
    timeSource: { type: 'relative', relativeTo: 'Isha', offsetMinutes: 30 },
  },
  {
    name: 'Tahajjud', key: 'tahajjud', icon: '🌌', arabic: 'التهجد',
    category: 'sunnah', order: 7,
    availability: { condition: 'always' },
    timeSource: { type: 'api', apiField: 'Midnight' },
  },
  {
    name: 'Jumah', key: 'jumah', icon: '🕌', arabic: 'الجمعة',
    category: 'weekly', order: 2,
    availability: { condition: 'friday' },
    timeSource: { type: 'api', apiField: 'Dhuhr' },
  },
] as const;

// ─── Combined Registry ──────────────────────────────────────────
export const ALL_PRAYERS: readonly PrayerDefinition[] = [
  ...FARD_PRAYERS,
  ...OPTIONAL_PRAYERS,
];

// ─── Derived Utilities ──────────────────────────────────────────

/** Ordered array of fard prayer names: ['Fajr','Dhuhr','Asr','Maghrib','Isha'] */
export const FARD_PRAYER_NAMES_LIST = FARD_PRAYERS.map(p => p.name) as readonly string[];

/** Map of lowercase key → display name */
export const PRAYER_NAME_MAP = Object.fromEntries(
  ALL_PRAYERS.map(p => [p.key, p.name])
) as Record<string, string>;

/** Map of lowercase key → icon emoji */
export const PRAYER_ICON_MAP = Object.fromEntries(
  ALL_PRAYERS.map(p => [p.key, p.icon])
) as Record<string, string>;

/** Map of lowercase key → arabic name */
export const PRAYER_ARABIC_MAP = Object.fromEntries(
  ALL_PRAYERS.map(p => [p.key, p.arabic])
) as Record<string, string>;

/** Look up a prayer definition by name (case-insensitive) */
export function getPrayerDefinition(name: string): PrayerDefinition | undefined {
  const lower = name.toLowerCase();
  return ALL_PRAYERS.find(p => p.key === lower || p.name.toLowerCase() === lower);
}

/** Get prayers available for a given context */
export function getAvailablePrayers(options: {
  isRamadan?: boolean;
  isFriday?: boolean;
  includeSunnah?: boolean;
}): PrayerDefinition[] {
  const { isRamadan = false, isFriday = false, includeSunnah = false } = options;

  return ALL_PRAYERS.filter(p => {
    if (p.category === 'fard') return true;
    if (p.category === 'seasonal' && p.availability?.condition === 'ramadan' && isRamadan) return true;
    if (p.category === 'weekly' && p.availability?.condition === 'friday' && isFriday) return true;
    if (p.category === 'sunnah' && includeSunnah) return true;
    return false;
  }).sort((a, b) => a.order - b.order);
}

// src/theme/colors.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  SUKOON COLOR SYSTEM — Psychology-Informed Spiritual Palette   ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  Design rationale:                                             ║
// ║  • Primary: Warm sage/forest green — grounding, organic,      ║
// ║    associated with nature, growth, and Islamic tradition       ║
// ║    (green of Jannah). Avoids cold "fintech" turquoise.        ║
// ║  • Backgrounds: Deep warm navy with purple undertone (dark)    ║
// ║    or warm cream/linen (light) — reduces eye strain during     ║
// ║    Fajr/Isha; feels like a night sky, not a dashboard.        ║
// ║  • Accent gold: Used sparingly for Islamic decorative cues     ║
// ║    (calligraphy, mosque domes). Evokes reverence.             ║
// ║  • Prayer colors: Muted earth tones, not rainbow. Each maps   ║
// ║    to the sky color at that prayer time.                       ║
// ║  • All colors live HERE. No hardcoded hex in components.       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ─── Raw Palette (single source of truth) ──────────────────────────
// Change these values once; the entire app updates.
const palette = {
  // Greens — primary family (nature, growth, Islam)
  green50:  '#F0F7F4',
  green100: '#D6EDE2',
  green200: '#A8D5BD',
  green300: '#6FB897',
  green400: '#4A9E76',
  green500: '#2D8B6F',  // ← primary dark theme
  green600: '#247A5E',
  green700: '#1B6A4F',
  green800: '#155A42',
  green900: '#0F4A35',

  // Navy — background family (night sky, depth)
  navy50:  '#F2F3F8',
  navy100: '#E1E3EF',
  navy200: '#C3C8DF',
  navy300: '#8E96BA',
  navy400: '#5C6493',
  navy500: '#3D4470',
  navy600: '#2D3454',
  navy700: '#252B47',
  navy800: '#1E2340',
  navy900: '#181D38',

  // Warm Cream — light mode background family
  cream50:  '#FFFDF9',
  cream100: '#FFF9F0',
  cream200: '#FFF3E0',
  cream300: '#F5EDE3',
  cream400: '#E8DDD0',
  cream500: '#D4C8B8',

  // Gold — accent (Islamic ornamentation, reverence)
  gold50:  '#FFF8E7',
  gold100: '#FFECB3',
  gold200: '#FFE082',
  gold300: '#FFD54F',
  gold400: '#D4AF37',
  gold500: '#C49A2C',
  gold600: '#A07C1F',

  // Slate — neutral text and borders
  slate50:  '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',

  // Status — accessible, warm-leaning
  statusSuccess: '#4CAF50',
  statusWarning: '#F59E0B',
  statusError:   '#EF4444',
  statusInfo:    '#3B82F6',

  // Pure
  white:   '#FFFFFF',
  black:   '#000000',

  // Transparent helpers (built from primary green: 45, 139, 111)
  greenAlpha05:  'rgba(45, 139, 111, 0.05)',
  greenAlpha08:  'rgba(45, 139, 111, 0.08)',
  greenAlpha12:  'rgba(45, 139, 111, 0.12)',
  greenAlpha15:  'rgba(45, 139, 111, 0.15)',
  greenAlpha20:  'rgba(45, 139, 111, 0.20)',
  greenAlpha25:  'rgba(45, 139, 111, 0.25)',
  greenAlpha30:  'rgba(45, 139, 111, 0.30)',
  greenAlpha40:  'rgba(45, 139, 111, 0.40)',

  // White alpha helpers (for overlays on dark backgrounds)
  whiteAlpha05:  'rgba(255, 255, 255, 0.05)',
  whiteAlpha08:  'rgba(255, 255, 255, 0.08)',
  whiteAlpha10:  'rgba(255, 255, 255, 0.10)',
  whiteAlpha12:  'rgba(255, 255, 255, 0.12)',
  whiteAlpha15:  'rgba(255, 255, 255, 0.15)',
  whiteAlpha20:  'rgba(255, 255, 255, 0.20)',
  whiteAlpha25:  'rgba(255, 255, 255, 0.25)',
  whiteAlpha30:  'rgba(255, 255, 255, 0.30)',
  whiteAlpha40:  'rgba(255, 255, 255, 0.40)',
  whiteAlpha50:  'rgba(255, 255, 255, 0.50)',
  whiteAlpha60:  'rgba(255, 255, 255, 0.60)',
  whiteAlpha70:  'rgba(255, 255, 255, 0.70)',
  whiteAlpha80:  'rgba(255, 255, 255, 0.80)',
  whiteAlpha90:  'rgba(255, 255, 255, 0.90)',

  // Black alpha helpers (for overlays on light backgrounds)
  blackAlpha05:  'rgba(0, 0, 0, 0.05)',
  blackAlpha08:  'rgba(0, 0, 0, 0.08)',
  blackAlpha10:  'rgba(0, 0, 0, 0.10)',
  blackAlpha20:  'rgba(0, 0, 0, 0.20)',
  blackAlpha30:  'rgba(0, 0, 0, 0.30)',
  blackAlpha40:  'rgba(0, 0, 0, 0.40)',
  blackAlpha50:  'rgba(0, 0, 0, 0.50)',
  blackAlpha60:  'rgba(0, 0, 0, 0.60)',
  blackAlpha80:  'rgba(0, 0, 0, 0.80)',
} as const;

// ─── Prayer Sky Gradients ──────────────────────────────────────────
// Each prayer maps to the actual sky color at that time of day.
// Used in MindfulnessFlow, SanctuaryView, and HomeScreen backgrounds.
const prayerGradients = {
  dark: {
    Fajr:    ['#0D1B4C', '#152E4A', '#1A3D5C'] as const,
    Dhuhr:   ['#1A2F38', '#153A35', '#0D4F35'] as const,
    Asr:     ['#2A2A1A', '#1F3222', '#1B3A2A'] as const,
    Maghrib: ['#2D1530', '#231A3A', '#1A1F3A'] as const,
    Isha:    ['#12103A', '#0F1430', '#0A0D2E'] as const,
    default: ['#1A2F3A', '#153530', '#0D4F35'] as const,
  },
  light: {
    Fajr:    ['#E8EAF6', '#C5CAE9', '#9FA8DA'] as const,
    Dhuhr:   ['#E8F5E9', '#C8E6C9', '#A5D6A7'] as const,
    Asr:     ['#FFF8E1', '#FFECB3', '#FFE082'] as const,
    Maghrib: ['#FCE4EC', '#F8BBD0', '#F48FB1'] as const,
    Isha:    ['#EDE7F6', '#D1C4E9', '#B39DDB'] as const,
    default: ['#E0F2F1', '#B2DFDB', '#80CBC4'] as const,
  },
} as const;

// ─── Prayer Identity Colors ────────────────────────────────────────
// Muted, sky-inspired tones (not rainbow "Skittles")
const prayerColors = {
  dark: {
    fajr:    '#7986CB',  // soft indigo — pre-dawn
    dhuhr:   '#81C784',  // soft green — midday sun through leaves
    asr:     '#DCE775',  // muted olive-gold — afternoon light
    maghrib: '#CE93D8',  // soft plum — sunset
    isha:    '#9FA8DA',  // soft lavender — night
  },
  light: {
    fajr:    '#3F51B5',  // indigo
    dhuhr:   '#388E3C',  // forest green
    asr:     '#F9A825',  // warm amber
    maghrib: '#AD1457',  // deep rose
    isha:    '#283593',  // deep indigo
  },
} as const;

// ─── Achievement Tier Colors ───────────────────────────────────────
const achievementTiers = {
  bronze:   { from: '#CD7F32', to: '#8B6914' },
  silver:   { from: '#B8C4CB', to: '#8899A6' },
  gold:     { from: '#D4AF37', to: '#C49A2C' },
  platinum: { from: '#E5E4E2', to: '#BCC6CC' },
  default:  { from: palette.green600, to: palette.green800 },
} as const;

// ─── Confetti / Celebration Colors ─────────────────────────────────
const celebrationColors = [
  '#7986CB', '#81C784', '#DCE775', '#CE93D8',
  '#9FA8DA', '#FFB74D', '#F48FB1', '#4FC3F7',
  '#AED581', '#FFD54F', '#FF8A65', '#80DEEA',
] as const;

// ─── Onboarding Gradient ───────────────────────────────────────────
const onboardingGradient = {
  dark:  [palette.navy900, palette.navy800, palette.navy900] as const,
  light: [palette.cream50, palette.cream50, palette.cream100] as const,
} as const;

// ─── Switch / Toggle Colors ────────────────────────────────────────
const switchColors = {
  dark: {
    trackFalse: palette.slate600,
    trackTrue:  palette.gold400,
    thumb:      palette.slate100,
  },
  light: {
    trackFalse: palette.slate300,
    trackTrue:  palette.gold500,
    thumb:      palette.white,
  },
} as const;

// ─── Chart Colors ──────────────────────────────────────────────────
const chartColors = {
  dark: {
    background:         palette.navy700,
    gradientFrom:       palette.navy700,
    gradientTo:         palette.navy700,
    line:               palette.green500,
    dot:                palette.green400,
    label:              palette.slate400,
    legendFont:         palette.slate300,
  },
  light: {
    background:         palette.white,
    gradientFrom:       palette.white,
    gradientTo:         palette.white,
    line:               palette.green700,
    dot:                palette.green600,
    label:              palette.slate600,
    legendFont:         palette.slate700,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════
// DARK THEME — Primary experience (Fajr/Isha optimized)
// ═══════════════════════════════════════════════════════════════════
export const darkTheme = {
  background: {
    primary:   palette.navy900,
    secondary: palette.navy700,
    tertiary:  palette.navy600,
    overlay:   palette.blackAlpha50,
  },

  text: {
    primary:   palette.white,
    secondary: palette.slate400,
    muted:     palette.slate500,
    inverse:   palette.navy900,
  },

  primary: {
    DEFAULT:  palette.green500,
    light:    palette.green400,
    dark:     palette.green700,
    contrast: palette.white,
  },

  secondary: {
    DEFAULT: palette.slate500,
    light:   palette.slate400,
    dark:    palette.slate600,
  },

  status: {
    success: palette.statusSuccess,
    warning: palette.statusWarning,
    error:   palette.statusError,
    info:    palette.statusInfo,
  },

  prayer: prayerColors.dark,

  border: {
    primary:   palette.navy600,
    secondary: palette.navy700,
    focus:     palette.green500,
  },

  card: {
    background: palette.navy700,
    hover:      palette.navy600,
    border:     palette.navy600,
  },

  interactive: {
    active:   palette.green500,
    hover:    palette.navy600,
    disabled: palette.slate500,
  },

  // ── Extended tokens (no more hardcoded colors in components) ──
  gold:        palette.gold400,
  goldDark:    palette.gold600,

  // Mindfulness / breathing / reflection surfaces
  mindfulness: {
    circleBg:        palette.greenAlpha08,
    circleBorder:    palette.greenAlpha30,
    circleShadow:    palette.green500,
    innerCircleBg:   palette.greenAlpha12,
    outerRingBorder: palette.greenAlpha20,
    progressFill:    palette.greenAlpha20,
    progressRingBg:  palette.whiteAlpha10,
    accent:          palette.green500,
    textPrimary:     palette.white,
    textSecondary:   palette.whiteAlpha80,
    textMuted:       palette.whiteAlpha70,
    textSubtle:      palette.whiteAlpha60,
    textHint:        palette.whiteAlpha50,
    inputBg:         palette.whiteAlpha08,
    inputBorder:     palette.greenAlpha25,
    quickOptionBg:   palette.greenAlpha08,
    quickOptionBorder: palette.greenAlpha20,
    buttonBg:        palette.greenAlpha20,
    buttonBorder:    palette.greenAlpha40,
    timingInfoBg:    palette.greenAlpha15,
    timingInfoBorder: palette.greenAlpha25,
    dotActive:       palette.green500,
    dotInactive:     palette.whiteAlpha25,
  },

  // Onboarding surfaces
  onboarding: {
    gradient:        onboardingGradient.dark,
    inputBg:         palette.whiteAlpha15,
    inputBorder:     palette.whiteAlpha30,
    buttonBg:        palette.greenAlpha20,
    buttonBorder:    palette.greenAlpha40,
    optionBg:        palette.whiteAlpha10,
    optionBorder:    palette.whiteAlpha20,
    optionActiveBg:  palette.whiteAlpha20,
    toggleBg:        palette.whiteAlpha10,
    textSubtle:      palette.whiteAlpha90,
    textMuted:       palette.whiteAlpha70,
    textHint:        palette.whiteAlpha60,
    textDim:         palette.whiteAlpha50,
    placeholder:     palette.whiteAlpha50,
    progressBg:      palette.whiteAlpha20,
    textBody:        palette.whiteAlpha80,
  },

  // Achievement celebration overlay
  achievement: {
    overlayBg:       palette.blackAlpha80,
    shadow:          palette.black,
    textPrimary:     palette.white,
    textSecondary:   palette.whiteAlpha90,
    badgeBg:         palette.whiteAlpha20,
    continueBg:      palette.whiteAlpha25,
    continueBorder:  palette.whiteAlpha40,
    tiers:           achievementTiers,
    confetti:        celebrationColors,
  },

  // Prayer gradients for MindfulnessFlow / SanctuaryView
  prayerGradients: prayerGradients.dark,

  // Switch / toggle
  switch: switchColors.dark,

  // Chart
  chart: chartColors.dark,

  // Settings surfaces
  settings: {
    sectionBg:         palette.navy700,
    containerBg:       palette.navy900,
    inputBg:           palette.navy600,
    inputBorder:       palette.green500,
    inputText:         palette.white,
    sliderMin:         palette.green400,
    sliderMax:         palette.slate600,
    sliderThumb:       palette.green500,
    sliderWarningMin:  palette.statusWarning,
    sliderWarningThumb: '#F57C00',
    optionBg:          palette.navy600,
    optionBorder:      palette.navy500,
    optionActiveBg:    palette.greenAlpha15,
    optionActiveBorder: palette.green500,
    buttonPrimaryBg:   palette.green500,
    buttonPrimaryText: palette.white,
    buttonSecondaryBg: 'transparent',
    buttonSecondaryBorder: palette.green500,
    buttonSecondaryText: palette.green500,
    cancelBg:          palette.navy600,
    cancelBorder:      palette.navy500,
    cancelText:        palette.slate400,
    infoBg:            'rgba(59, 130, 246, 0.1)',
    infoTitle:         palette.statusInfo,
    infoLabel:         palette.statusInfo,
    infoText:          palette.statusInfo,
    warningBg:         'rgba(245, 158, 11, 0.1)',
    warningBorder:     'rgba(245, 158, 11, 0.3)',
    warningText:       palette.statusWarning,
    hintBg:            'rgba(245, 158, 11, 0.1)',
    hintBorder:        'rgba(245, 158, 11, 0.3)',
    hintText:          palette.statusWarning,
    tipsBg:            palette.greenAlpha08,
    tipsTitle:         palette.green400,
    tipsText:          palette.green300,
    modalOverlay:      palette.blackAlpha50,
    modalBg:           palette.navy700,
    modalShadow:       palette.black,
    modalBorder:       palette.navy500,
    modalTitle:        palette.green400,
    modalClose:        palette.green400,
    modalCloseDisabled: palette.slate500,
    previewBg:         palette.navy600,
    previewBorder:     palette.green500,
    labelPrimary:      palette.white,
    labelSecondary:    palette.slate400,
    labelMuted:        palette.slate500,
  },
};

// ═══════════════════════════════════════════════════════════════════
// LIGHT THEME — Warm, organic, cream-based (not clinical white)
// ═══════════════════════════════════════════════════════════════════
export const lightTheme = {
  background: {
    primary:   palette.cream50,
    secondary: palette.cream100,
    tertiary:  palette.cream300,
    overlay:   palette.blackAlpha40,
  },

  text: {
    primary:   palette.slate800,
    secondary: palette.slate600,
    muted:     palette.slate400,
    inverse:   palette.white,
  },

  primary: {
    DEFAULT:  palette.green700,
    light:    palette.green500,
    dark:     palette.green800,
    contrast: palette.white,
  },

  secondary: {
    DEFAULT: palette.slate500,
    light:   palette.slate300,
    dark:    palette.slate700,
  },

  status: {
    success: palette.statusSuccess,
    warning: palette.statusWarning,
    error:   palette.statusError,
    info:    palette.statusInfo,
  },

  prayer: prayerColors.light,

  border: {
    primary:   palette.cream400,
    secondary: palette.cream300,
    focus:     palette.green600,
  },

  card: {
    background: palette.white,
    hover:      palette.cream100,
    border:     palette.cream400,
  },

  interactive: {
    active:   palette.green700,
    hover:    palette.cream100,
    disabled: palette.slate300,
  },

  gold:        palette.gold500,
  goldDark:    palette.gold600,

  mindfulness: {
    circleBg:        palette.greenAlpha08,
    circleBorder:    palette.greenAlpha30,
    circleShadow:    palette.green700,
    innerCircleBg:   palette.greenAlpha12,
    outerRingBorder: palette.greenAlpha20,
    progressFill:    palette.greenAlpha20,
    progressRingBg:  palette.blackAlpha05,
    accent:          palette.green700,
    textPrimary:     palette.slate800,
    textSecondary:   palette.slate600,
    textMuted:       palette.slate500,
    textSubtle:      palette.slate400,
    textHint:        palette.slate400,
    inputBg:         palette.blackAlpha05,
    inputBorder:     palette.greenAlpha25,
    quickOptionBg:   palette.greenAlpha08,
    quickOptionBorder: palette.greenAlpha20,
    buttonBg:        palette.greenAlpha15,
    buttonBorder:    palette.greenAlpha30,
    timingInfoBg:    palette.greenAlpha08,
    timingInfoBorder: palette.greenAlpha20,
    dotActive:       palette.green700,
    dotInactive:     palette.blackAlpha20,
  },

  onboarding: {
    gradient:        onboardingGradient.light,
    inputBg:         palette.blackAlpha05,
    inputBorder:     palette.cream400,
    buttonBg:        palette.green700,
    buttonBorder:    palette.green800,
    optionBg:        palette.blackAlpha05,
    optionBorder:    palette.cream400,
    optionActiveBg:  palette.greenAlpha08,
    toggleBg:        palette.blackAlpha05,
    textSubtle:      palette.slate600,
    textMuted:       palette.slate500,
    textHint:        palette.slate400,
    textDim:         palette.slate400,
    placeholder:     palette.slate400,
    progressBg:      palette.blackAlpha10,
    textBody:        palette.slate700,
  },

  achievement: {
    overlayBg:       palette.blackAlpha60,
    shadow:          palette.black,
    textPrimary:     palette.white,
    textSecondary:   palette.whiteAlpha90,
    badgeBg:         palette.whiteAlpha20,
    continueBg:      palette.whiteAlpha25,
    continueBorder:  palette.whiteAlpha40,
    tiers:           achievementTiers,
    confetti:        celebrationColors,
  },

  prayerGradients: prayerGradients.light,

  switch: switchColors.light,

  chart: chartColors.light,

  // Settings surfaces
  settings: {
    sectionBg:         palette.white,
    containerBg:       palette.slate50,
    inputBg:           palette.slate50,
    inputBorder:       palette.green600,
    inputText:         palette.green800,
    sliderMin:         palette.statusSuccess,
    sliderMax:         palette.slate200,
    sliderThumb:       palette.green700,
    sliderWarningMin:  '#FF9800',
    sliderWarningThumb: '#F57C00',
    optionBg:          palette.slate50,
    optionBorder:      palette.slate200,
    optionActiveBg:    '#E8F5E9',
    optionActiveBorder: palette.statusSuccess,
    buttonPrimaryBg:   palette.green700,
    buttonPrimaryText: palette.white,
    buttonSecondaryBg: 'transparent',
    buttonSecondaryBorder: palette.green700,
    buttonSecondaryText: palette.green700,
    cancelBg:          palette.slate50,
    cancelBorder:      palette.slate200,
    cancelText:        palette.slate500,
    infoBg:            '#E3F2FD',
    infoTitle:         '#1976D2',
    infoLabel:         '#1565C0',
    infoText:          '#1976D2',
    warningBg:         '#FFF3CD',
    warningBorder:     '#FFEAA7',
    warningText:       '#856404',
    hintBg:            '#FFF3CD',
    hintBorder:        '#FFEAA7',
    hintText:          '#856404',
    tipsBg:            '#E8F5E9',
    tipsTitle:         palette.green700,
    tipsText:          '#2E7D32',
    modalOverlay:      palette.blackAlpha50,
    modalBg:           palette.white,
    modalShadow:       palette.black,
    modalBorder:       '#E9ECEF',
    modalTitle:        palette.green700,
    modalClose:        palette.green700,
    modalCloseDisabled: '#ADB5BD',
    previewBg:         palette.slate50,
    previewBorder:     palette.green700,
    labelPrimary:      palette.slate800,
    labelSecondary:    palette.slate500,
    labelMuted:        palette.slate400,
  },
};

// ─── Type Utilities ────────────────────────────────────────────────
// Widen literal string types so both darkTheme and lightTheme satisfy Theme.
type DeepStringify<T> =
  T extends readonly (infer U)[]
    ? readonly DeepStringify<U>[]
    : T extends object
      ? { [K in keyof T]: DeepStringify<T[K]> }
      : T extends string
        ? string
        : T extends number
          ? number
          : T;

// ─── Exports ───────────────────────────────────────────────────────
export { palette, prayerGradients, achievementTiers, celebrationColors };
export type Theme = DeepStringify<typeof darkTheme>;
export type ThemeColors = keyof Theme;

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

  // Warm Linen — light mode background family ("sandstone layers")
  cream50:  '#FAF7F2',   // warm linen — primary bg
  cream100: '#F3EDE4',   // soft sandstone — secondary bg
  cream200: '#EDE5D8',   // parchment
  cream300: '#E8E0D4',   // warm stone — tertiary bg
  cream400: '#E2D9CC',   // warm border
  cream500: '#D4C8B8',   // deep sandstone

  // Warm Whites — card surfaces ("alabaster, not clinical")
  warmWhite:    '#FEFCF8',  // card bg — warm white, not sterile
  warmWhiteHov: '#F5F0E8',  // card hover

  // Warm Text — "ink on parchment" (replaces cold slate for light theme)
  ink900:  '#2C2520',   // primary text — warm espresso
  ink700:  '#4A3F37',   // emphasis text
  ink600:  '#6B5E54',   // secondary text — warm taupe
  ink500:  '#827568',   // subtle text
  ink400:  '#9C8E82',   // muted text — warm stone
  ink300:  '#B5A99E',   // hint text

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
    Isha:     ['#12103A', '#0F1430', '#0A0D2E'] as const,
    Taraweeh: ['#1A1040', '#0F1A3A', '#0A2040'] as const,
    Tahajjud: ['#0A0A2E', '#080818', '#050510'] as const,
    Jumah:    ['#2A2A10', '#3A3010', '#4A3A10'] as const,
    default:  ['#1A2F3A', '#153530', '#0D4F35'] as const,
  },
  // Light gradients — hero stays dark even in light mode (forest green)
  light: {
    Fajr:     ['#0D1B3A', '#122840', '#1A3548'] as const,  // deep pre-dawn navy
    Dhuhr:    ['#1a3a2e', '#0f2a20', '#132e24'] as const,  // midday forest green
    Asr:      ['#1a3420', '#152a1c', '#1e3828'] as const,  // afternoon forest
    Maghrib:  ['#2D1530', '#231A3A', '#1A1F3A'] as const,  // sunset plum
    Isha:     ['#12103A', '#0F1430', '#0A0D2E'] as const,  // night sky
    Taraweeh: ['#1A1040', '#0F1A3A', '#0A2040'] as const,  // Ramadan night
    Tahajjud: ['#0A0A2E', '#080818', '#050510'] as const,  // deep night
    Jumah:    ['#2A2A10', '#3A3010', '#4A3A10'] as const,  // golden mosque
    default:  ['#1a3a2e', '#0f2a20', '#132e24'] as const,  // forest green
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
    isha:     '#9FA8DA',  // soft lavender — night
    taraweeh: '#B39DDB',  // soft violet — Ramadan night
    tahajjud: '#7986CB',  // deeper indigo — deepest night
    jumah:    '#D4AF37',  // warm gold — Friday congregation
  },
  light: {
    fajr:     '#3F51B5',  // indigo
    dhuhr:    '#388E3C',  // forest green
    asr:      '#F9A825',  // warm amber
    maghrib:  '#AD1457',  // deep rose
    isha:     '#283593',  // deep indigo
    taraweeh: '#5C6BC0',  // indigo-violet
    tahajjud: '#3949AB',  // deep indigo-violet
    jumah:    '#BF8C00',  // rich gold — Friday congregation
  },
} as const;

// ─── Achievement Tier Colors (botanical progression) ─────────────
const achievementTiers = {
  seed:     { from: '#8B7355', to: '#6B5B3E' },   // warm earth
  sapling:  { from: '#5B8C5A', to: '#3D6B3D' },   // young green
  tree:     { from: '#2D6B4F', to: '#1B4D3A' },   // deep forest
  garden:   { from: '#4A7C59', to: '#2D5A3F' },   // rich garden
  default:  { from: palette.green600, to: palette.green800 },
} as const;

// ─── Onboarding Gradient ───────────────────────────────────────────
const onboardingGradient = {
  dark:  [palette.navy900, palette.navy800, palette.navy900] as const,
  light: [palette.cream50, palette.cream100, palette.cream50] as const,
} as const;

// ─── Switch / Toggle Colors ────────────────────────────────────────
const switchColors = {
  dark: {
    trackFalse: palette.slate600,
    trackTrue:  palette.green500,
    thumb:      palette.slate100,
  },
  light: {
    trackFalse: '#e2e5ec',
    trackTrue:  '#0d9488',
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
    background:         palette.warmWhite,
    gradientFrom:       palette.warmWhite,
    gradientTo:         palette.warmWhite,
    line:               palette.green500,
    dot:                palette.green400,
    label:              palette.ink600,
    legendFont:         palette.ink700,
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
  goldLight:   palette.gold300,
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
  },

  // Reflection Garden
  garden: {
    soil:          palette.navy600,
    soilBorder:    palette.navy500,
    stem:          palette.green800,
    sparkle:       palette.gold300,
    emptyDot:      palette.whiteAlpha15,
    todayRing:     palette.green500,
    cardBg:        palette.navy700,
    journalBorder: palette.navy500,
    accentFajr:    '#7986CB',
    accentMaghrib: '#CE93D8',
    trunk:           '#5c4535',
    trunkHighlight:  'rgba(255, 255, 255, 0.06)',
    skyStars:        '#ffffff',
    moonColor:       'rgba(255, 255, 255, 0.55)',
    bloomGlow:       palette.gold400,
    groundFade:      palette.navy900,
    dawamPillBg:     'rgba(212, 175, 55, 0.08)',
    dawamPillBorder: 'rgba(212, 175, 55, 0.18)',
    dawamPillText:   palette.gold400,
    dawamDot:        palette.gold400,
  },

  // Qibla Finder — spiritual wayfinder surfaces
  qibla: {
    compassBg:              palette.navy700,
    compassRing:            palette.navy500,
    compassRingAligned:     palette.gold400,
    needleBeam:             palette.green500,
    needleBeamAligned:      palette.gold400,
    needleTip:              palette.green400,
    alignedGlow:            palette.gold400,
    alignedGlowShadow:      palette.gold600,
    kaabaIcon:              palette.white,
    kaabaGold:              palette.gold400,
    bearingText:            palette.green400,
    hintText:               palette.slate400,
    interferenceWarningBg:  'rgba(239, 68, 68, 0.15)',
    interferenceWarningText: palette.statusError,
    anomalyWarningBg:       'rgba(245, 158, 11, 0.15)',
    anomalyWarningText:     palette.statusWarning,
    cardinalN:              palette.white,
    cardinalMuted:          palette.slate500,
    tickCardinal:           palette.slate400,
    tickMinor:              palette.navy500,
    verifyLink:             palette.green400,
  },

  // SanctuaryView — text/overlays on prayer gradient backgrounds
  sanctuary: {
    greeting:        palette.whiteAlpha70,
    label:           palette.whiteAlpha50,
    prayerName:      palette.white,
    prayerTime:      palette.whiteAlpha80,
    countdown:       palette.whiteAlpha60,
    prayedStatus:    palette.whiteAlpha80,
    buttonBg:        palette.whiteAlpha10,
    buttonBorder:    palette.whiteAlpha30,
    buttonBgMuted:   palette.whiteAlpha05,
    buttonBorderMuted: palette.whiteAlpha15,
    buttonText:      palette.white,
    ring: {
      innerGradCenter: 'rgba(10,30,22,0.8)',
      innerGradEdge:   'rgba(7,20,14,0.95)',
      innerBorder:     'rgba(212,175,55,0.10)',
      trackStroke:     palette.whiteAlpha08,
      glowStroke:      'rgba(212,175,55,0.22)',
    },
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

  // Mosque Mode surfaces
  mosqueMode: {
    banner: {
      bg:          palette.greenAlpha12,
      dot:         palette.green400,
      text:        palette.white,
      textMuted:   palette.slate400,
      button:      palette.green400,
    },
    sectionLabel:  palette.slate400,
    card: {
      bg:          palette.navy700,
      border:      palette.navy600,
    },
    accordion: {
      bg:          palette.navy700,
      border:      palette.navy600,
      chevron:     palette.slate400,
    },
    chip: {
      bg:          'transparent',
      border:      palette.navy500,
      text:        palette.slate400,
      activeBg:    palette.green500,
      activeBorder: palette.green500,
      activeText:  palette.white,
    },
    segment: {
      bg:          palette.navy600,
      activeBg:    palette.green500,
      activeText:  palette.white,
      inactiveText: palette.slate400,
    },
    hint: {
      bg:          palette.greenAlpha08,
      border:      palette.greenAlpha20,
      text:        palette.green400,
      icon:        palette.green400,
    },
    jummah: {
      accent:        palette.gold400,
      accentDim:     'rgba(212, 175, 55, 0.20)',
      chipActiveBg:  palette.gold400,
      chipActiveText: palette.white,
      segmentActiveBg: palette.gold400,
    },
    footer:        palette.slate500,
  },
};

// ─── Light-specific palette (mockup values) ──────────────────────
const lightPalette = {
  cream:       '#faf7f2',
  cream2:      '#f3efe8',
  card:        '#ffffff',
  card2:       '#f7f4ef',
  teal:        '#0d9488',
  tealLight:   '#14b8a6',
  tealDim:     'rgba(13, 148, 136, 0.08)',
  tealAlpha20: 'rgba(13, 148, 136, 0.20)',
  gold:        '#b08c2a',
  goldRich:    '#c9a84c',
  goldLight:   '#d4aa55',
  goldDim:     'rgba(176, 140, 42, 0.10)',
  goldGlow:    'rgba(176, 140, 42, 0.06)',
  goldAlpha18: 'rgba(176, 140, 42, 0.18)',
  emerald:     '#059669',
  emeraldDim:  'rgba(5, 150, 105, 0.08)',
  purple:      '#7c3aed',
  purpleDim:   'rgba(124, 58, 237, 0.08)',
  text:        '#141c2e',
  textMuted:   '#5a6478',
  textSub:     '#9aa3b5',
  border:      'rgba(0, 0, 0, 0.07)',
  borderBright: 'rgba(0, 0, 0, 0.12)',
  danger:      '#dc2626',
} as const;

// ═══════════════════════════════════════════════════════════════════
// LIGHT THEME — "Sanctuary in Daylight"
// Warm cream canvas, teal interactive accent, gold decorative accent.
// Hero stays dark (forest green) even in light mode.
// ═══════════════════════════════════════════════════════════════════
export const lightTheme = {
  background: {
    primary:   lightPalette.cream,
    secondary: lightPalette.cream2,
    tertiary:  lightPalette.card2,
    overlay:   palette.blackAlpha40,
  },

  text: {
    primary:   lightPalette.text,
    secondary: lightPalette.textMuted,
    muted:     lightPalette.textSub,
    inverse:   palette.white,
  },

  primary: {
    DEFAULT:  lightPalette.teal,
    light:    lightPalette.tealLight,
    dark:     '#0f766e',
    contrast: palette.white,
  },

  secondary: {
    DEFAULT: lightPalette.textMuted,
    light:   lightPalette.textSub,
    dark:    lightPalette.text,
  },

  status: {
    success: lightPalette.emerald,
    warning: palette.statusWarning,
    error:   lightPalette.danger,
    info:    palette.statusInfo,
  },

  prayer: prayerColors.light,

  border: {
    primary:   lightPalette.borderBright,
    secondary: lightPalette.border,
    focus:     lightPalette.teal,
  },

  card: {
    background: lightPalette.card,
    hover:      lightPalette.card2,
    border:     lightPalette.borderBright,
  },

  interactive: {
    active:   lightPalette.teal,
    hover:    lightPalette.card2,
    disabled: lightPalette.textSub,
  },

  gold:        lightPalette.gold,
  goldLight:   lightPalette.goldLight,
  goldDark:    '#8a6e1f',

  mindfulness: {
    circleBg:        lightPalette.tealDim,
    circleBorder:    lightPalette.tealAlpha20,
    circleShadow:    lightPalette.teal,
    innerCircleBg:   lightPalette.tealDim,
    outerRingBorder: lightPalette.tealAlpha20,
    progressFill:    lightPalette.tealAlpha20,
    progressRingBg:  palette.whiteAlpha10,
    accent:          lightPalette.teal,
    textPrimary:     palette.white,
    textSecondary:   palette.whiteAlpha80,
    textMuted:       palette.whiteAlpha70,
    textSubtle:      palette.whiteAlpha60,
    textHint:        palette.whiteAlpha50,
    inputBg:         palette.blackAlpha05,
    inputBorder:     lightPalette.tealAlpha20,
    quickOptionBg:   lightPalette.tealDim,
    quickOptionBorder: lightPalette.tealAlpha20,
    buttonBg:        lightPalette.tealDim,
    buttonBorder:    lightPalette.tealAlpha20,
    timingInfoBg:    lightPalette.tealDim,
    timingInfoBorder: lightPalette.tealAlpha20,
    dotActive:       lightPalette.teal,
    dotInactive:     palette.whiteAlpha25,
  },

  onboarding: {
    gradient:        onboardingGradient.light,
    inputBg:         palette.blackAlpha05,
    inputBorder:     lightPalette.borderBright,
    buttonBg:        lightPalette.teal,
    buttonBorder:    '#0f766e',
    optionBg:        palette.blackAlpha05,
    optionBorder:    lightPalette.borderBright,
    optionActiveBg:  lightPalette.tealDim,
    toggleBg:        palette.blackAlpha05,
    textSubtle:      lightPalette.textMuted,
    textMuted:       lightPalette.textMuted,
    textHint:        lightPalette.textSub,
    textDim:         lightPalette.textSub,
    placeholder:     lightPalette.textSub,
    progressBg:      palette.blackAlpha10,
    textBody:        lightPalette.text,
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
  },

  // Reflection Garden
  garden: {
    soil:          lightPalette.cream2,
    soilBorder:    lightPalette.borderBright,
    stem:          lightPalette.emerald,
    sparkle:       lightPalette.gold,
    emptyDot:      palette.blackAlpha10,
    todayRing:     lightPalette.teal,
    cardBg:        lightPalette.card,
    journalBorder: lightPalette.borderBright,
    accentFajr:    '#5C6BC0',
    accentMaghrib: '#C2185B',
    trunk:           '#6B5E54',
    trunkHighlight:  'rgba(0, 0, 0, 0.08)',
    skyStars:        'transparent',
    moonColor:       'transparent',
    bloomGlow:       lightPalette.gold,
    groundFade:      lightPalette.cream,
    dawamPillBg:     'rgba(176, 140, 42, 0.07)',
    dawamPillBorder: 'rgba(176, 140, 42, 0.18)',
    dawamPillText:   lightPalette.gold,
    dawamDot:        lightPalette.gold,
  },

  // Qibla Finder
  qibla: {
    compassBg:              lightPalette.card,
    compassRing:            lightPalette.borderBright,
    compassRingAligned:     lightPalette.gold,
    needleBeam:             lightPalette.teal,
    needleBeamAligned:      lightPalette.gold,
    needleTip:              lightPalette.tealLight,
    alignedGlow:            lightPalette.gold,
    alignedGlowShadow:     '#8a6e1f',
    kaabaIcon:              lightPalette.text,
    kaabaGold:              lightPalette.gold,
    bearingText:            lightPalette.tealLight,
    hintText:               lightPalette.textMuted,
    interferenceWarningBg:  'rgba(239, 68, 68, 0.10)',
    interferenceWarningText: lightPalette.danger,
    anomalyWarningBg:       'rgba(245, 158, 11, 0.10)',
    anomalyWarningText:     '#92700C',
    cardinalN:              lightPalette.text,
    cardinalMuted:          lightPalette.textSub,
    tickCardinal:           lightPalette.textMuted,
    tickMinor:              lightPalette.borderBright,
    verifyLink:             lightPalette.teal,
  },

  // SanctuaryView — hero is DARK even in light mode (white text on dark gradient)
  sanctuary: {
    greeting:        palette.whiteAlpha70,
    label:           palette.whiteAlpha50,
    prayerName:      palette.white,
    prayerTime:      palette.whiteAlpha80,
    countdown:       palette.whiteAlpha60,
    prayedStatus:    palette.whiteAlpha80,
    buttonBg:        palette.whiteAlpha10,
    buttonBorder:    palette.whiteAlpha30,
    buttonBgMuted:   palette.whiteAlpha05,
    buttonBorderMuted: palette.whiteAlpha15,
    buttonText:      palette.white,
    ring: {
      innerGradCenter: 'rgba(18,42,32,0.88)',
      innerGradEdge:   'rgba(10,28,20,0.95)',
      innerBorder:     'rgba(232,201,122,0.12)',
      trackStroke:     palette.whiteAlpha08,
      glowStroke:      'rgba(232,201,122,0.25)',
    },
  },

  prayerGradients: prayerGradients.light,

  switch: switchColors.light,

  chart: chartColors.light,

  // Settings surfaces
  settings: {
    sectionBg:         lightPalette.card,
    containerBg:       lightPalette.cream,
    inputBg:           lightPalette.cream2,
    inputBorder:       lightPalette.teal,
    inputText:         lightPalette.text,
    sliderMin:         lightPalette.tealLight,
    sliderMax:         lightPalette.textSub,
    sliderThumb:       lightPalette.teal,
    sliderWarningMin:  palette.statusWarning,
    sliderWarningThumb: '#F57C00',
    optionBg:          lightPalette.cream2,
    optionBorder:      lightPalette.borderBright,
    optionActiveBg:    lightPalette.tealDim,
    optionActiveBorder: lightPalette.teal,
    buttonPrimaryBg:   lightPalette.teal,
    buttonPrimaryText: palette.white,
    buttonSecondaryBg: 'transparent',
    buttonSecondaryBorder: lightPalette.teal,
    buttonSecondaryText: lightPalette.teal,
    cancelBg:          lightPalette.cream2,
    cancelBorder:      lightPalette.borderBright,
    cancelText:        lightPalette.textSub,
    infoBg:            'rgba(59, 130, 246, 0.08)',
    infoTitle:         '#4A6FA5',
    infoLabel:         '#4A6FA5',
    infoText:          '#4A6FA5',
    warningBg:         'rgba(245, 158, 11, 0.08)',
    warningBorder:     'rgba(245, 158, 11, 0.20)',
    warningText:       '#92700C',
    hintBg:            lightPalette.goldGlow,
    hintBorder:        lightPalette.goldDim,
    hintText:          lightPalette.gold,
    tipsBg:            lightPalette.tealDim,
    tipsTitle:         lightPalette.teal,
    tipsText:          lightPalette.teal,
    modalOverlay:      palette.blackAlpha50,
    modalBg:           lightPalette.card,
    modalShadow:       palette.black,
    modalBorder:       lightPalette.borderBright,
    modalTitle:        lightPalette.teal,
    modalClose:        lightPalette.teal,
    modalCloseDisabled: lightPalette.textSub,
    previewBg:         lightPalette.cream2,
    previewBorder:     lightPalette.teal,
    labelPrimary:      lightPalette.text,
    labelSecondary:    lightPalette.textMuted,
    labelMuted:        lightPalette.textSub,
  },

  // Mosque Mode surfaces
  mosqueMode: {
    banner: {
      bg:          lightPalette.tealDim,
      dot:         lightPalette.teal,
      text:        lightPalette.text,
      textMuted:   lightPalette.textMuted,
      button:      lightPalette.teal,
    },
    sectionLabel:  lightPalette.textSub,
    card: {
      bg:          lightPalette.card,
      border:      lightPalette.borderBright,
    },
    accordion: {
      bg:          lightPalette.card,
      border:      lightPalette.border,
      chevron:     lightPalette.textSub,
    },
    chip: {
      bg:          'transparent',
      border:      lightPalette.borderBright,
      text:        lightPalette.textMuted,
      activeBg:    lightPalette.teal,
      activeBorder: lightPalette.teal,
      activeText:  palette.white,
    },
    segment: {
      bg:          lightPalette.cream2,
      activeBg:    lightPalette.teal,
      activeText:  palette.white,
      inactiveText: lightPalette.textMuted,
    },
    hint: {
      bg:          lightPalette.tealDim,
      border:      lightPalette.tealAlpha20,
      text:        lightPalette.teal,
      icon:        lightPalette.teal,
    },
    jummah: {
      accent:        lightPalette.gold,
      accentDim:     lightPalette.goldDim,
      chipActiveBg:  lightPalette.gold,
      chipActiveText: palette.white,
      segmentActiveBg: lightPalette.gold,
    },
    footer:        lightPalette.textSub,
  },
};

// ═══════════════════════════════════════════════════════════════════
// MIDNIGHT THEME — "Midnight & Gold"
// True-black canvas, gold ornamentation, teal interactive accents.
// Inspired by mosque interiors at night: dark stone, gilded arches,
// moonlight through geometric screens.
// ═══════════════════════════════════════════════════════════════════

// ─── Midnight-specific palette (not shared with dark/light) ──────
const midnightPalette = {
  night:       '#090d18',
  deep:        '#0d1424',
  card:        '#111827',
  card2:       '#141d2e',
  gold:        '#c9a84c',
  goldLight:   '#e8c97a',
  goldDim:     'rgba(201, 168, 76, 0.15)',
  goldGlow:    'rgba(201, 168, 76, 0.07)',
  goldAlpha05: 'rgba(201, 168, 76, 0.05)',
  goldAlpha10: 'rgba(201, 168, 76, 0.10)',
  goldAlpha12: 'rgba(201, 168, 76, 0.12)',
  goldAlpha20: 'rgba(201, 168, 76, 0.20)',
  goldAlpha25: 'rgba(201, 168, 76, 0.25)',
  goldAlpha30: 'rgba(201, 168, 76, 0.30)',
  goldAlpha40: 'rgba(201, 168, 76, 0.40)',
  teal:        '#2dd4bf',
  tealDim:     'rgba(45, 212, 191, 0.10)',
  tealAlpha08: 'rgba(45, 212, 191, 0.08)',
  tealAlpha20: 'rgba(45, 212, 191, 0.20)',
  tealAlpha30: 'rgba(45, 212, 191, 0.30)',
  text:        '#f0ece4',
  textMuted:   '#7a8499',
  textSub:     '#3d4a60',
  borderDim:   'rgba(255, 255, 255, 0.06)',
  borderBright: 'rgba(255, 255, 255, 0.12)',
  emerald:     '#10b981',
  emeraldDim:  'rgba(16, 185, 129, 0.1)',
  emeraldLight: '#6ee7b7',
  emeraldMedium: '#34d399',
  violet:      '#8b5cf6',
  violetLight: '#c4b5fd',
  violetDim:   'rgba(139, 92, 246, 0.12)',
  violetAlpha08: 'rgba(139, 92, 246, 0.08)',
  violetAlpha20: 'rgba(139, 92, 246, 0.20)',
  violetAlpha30: 'rgba(139, 92, 246, 0.30)',
  danger:      '#e85d75',
} as const;

// ─── Midnight prayer gradients ───────────────────────────────────
const midnightPrayerGradients = {
  Fajr:     ['#080E2A', '#0D1940', '#121F4A'] as const,
  Dhuhr:    ['#0D1820', '#091E1C', '#0A2818'] as const,
  Asr:      ['#1A1808', '#151C0E', '#122214'] as const,
  Maghrib:  ['#1A0A18', '#160E22', '#12121E'] as const,
  Isha:     ['#0A0820', '#08091A', '#060816'] as const,
  Taraweeh: ['#100828', '#0A0E22', '#081428'] as const,
  Tahajjud: ['#060618', '#040410', '#02020A'] as const,
  Jumah:    ['#181408', '#221C08', '#2A2208'] as const,
  default:  ['#0D1820', '#091E1C', '#0A2818'] as const,
} as const;

// ─── Midnight prayer identity colors ─────────────────────────────
const midnightPrayerColors = {
  fajr:     '#7986CB',
  dhuhr:    '#81C784',
  asr:      '#DCE775',
  maghrib:  '#CE93D8',
  isha:     '#9FA8DA',
  taraweeh: '#B39DDB',
  tahajjud: '#7986CB',
  jumah:    midnightPalette.gold,
} as const;

export const midnightTheme = {
  background: {
    primary:   midnightPalette.night,
    secondary: midnightPalette.deep,
    tertiary:  midnightPalette.card2,
    overlay:   palette.blackAlpha60,
  },

  text: {
    primary:   midnightPalette.text,
    secondary: midnightPalette.textMuted,
    muted:     midnightPalette.textSub,
    inverse:   midnightPalette.night,
  },

  primary: {
    DEFAULT:  midnightPalette.teal,
    light:    '#5eead4',
    dark:     '#14b8a6',
    contrast: midnightPalette.night,
  },

  secondary: {
    DEFAULT: midnightPalette.textMuted,
    light:   midnightPalette.textSub,
    dark:    '#5C6493',
  },

  status: {
    success: '#4ade80',
    warning: palette.statusWarning,
    error:   midnightPalette.danger,
    info:    palette.statusInfo,
  },

  prayer: midnightPrayerColors,

  border: {
    primary:   midnightPalette.borderBright,
    secondary: midnightPalette.borderDim,
    focus:     midnightPalette.teal,
  },

  card: {
    background: midnightPalette.card,
    hover:      midnightPalette.card2,
    border:     midnightPalette.borderBright,
  },

  interactive: {
    active:   midnightPalette.teal,
    hover:    midnightPalette.card2,
    disabled: midnightPalette.textSub,
  },

  gold:        midnightPalette.gold,
  goldLight:   midnightPalette.goldLight,
  goldDark:    '#A07C1F',

  mindfulness: {
    circleBg:        midnightPalette.goldAlpha10,
    circleBorder:    midnightPalette.goldAlpha30,
    circleShadow:    midnightPalette.gold,
    innerCircleBg:   midnightPalette.goldAlpha12,
    outerRingBorder: midnightPalette.goldAlpha20,
    progressFill:    midnightPalette.goldAlpha20,
    progressRingBg:  palette.whiteAlpha10,
    accent:          midnightPalette.gold,
    textPrimary:     midnightPalette.text,
    textSecondary:   palette.whiteAlpha80,
    textMuted:       palette.whiteAlpha70,
    textSubtle:      palette.whiteAlpha60,
    textHint:        palette.whiteAlpha50,
    inputBg:         palette.whiteAlpha08,
    inputBorder:     midnightPalette.goldAlpha25,
    quickOptionBg:   midnightPalette.goldAlpha10,
    quickOptionBorder: midnightPalette.goldAlpha20,
    buttonBg:        midnightPalette.goldAlpha20,
    buttonBorder:    midnightPalette.goldAlpha40,
    timingInfoBg:    midnightPalette.goldAlpha12,
    timingInfoBorder: midnightPalette.goldAlpha25,
    dotActive:       midnightPalette.gold,
    dotInactive:     palette.whiteAlpha25,
  },

  onboarding: {
    gradient:        [midnightPalette.night, midnightPalette.deep, midnightPalette.night] as const,
    inputBg:         palette.whiteAlpha15,
    inputBorder:     palette.whiteAlpha30,
    buttonBg:        midnightPalette.goldAlpha20,
    buttonBorder:    midnightPalette.goldAlpha40,
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

  achievement: {
    overlayBg:       palette.blackAlpha80,
    shadow:          palette.black,
    textPrimary:     midnightPalette.text,
    textSecondary:   palette.whiteAlpha90,
    badgeBg:         palette.whiteAlpha20,
    continueBg:      palette.whiteAlpha25,
    continueBorder:  palette.whiteAlpha40,
    tiers:           achievementTiers,
  },

  garden: {
    soil:          midnightPalette.card,
    soilBorder:    midnightPalette.borderBright,
    stem:          '#A07C1F',
    sparkle:       midnightPalette.goldLight,
    emptyDot:      palette.whiteAlpha15,
    todayRing:     midnightPalette.gold,
    cardBg:        midnightPalette.card,
    journalBorder: midnightPalette.borderBright,
    accentFajr:    '#7986CB',
    accentMaghrib: '#CE93D8',
    trunk:           '#4a3728',
    trunkHighlight:  'rgba(255, 255, 255, 0.04)',
    skyStars:        '#ffffff',
    moonColor:       'rgba(255, 255, 255, 0.65)',
    bloomGlow:       midnightPalette.goldLight,
    groundFade:      midnightPalette.night,
    dawamPillBg:     'rgba(201, 168, 76, 0.08)',
    dawamPillBorder: 'rgba(201, 168, 76, 0.20)',
    dawamPillText:   midnightPalette.goldLight,
    dawamDot:        midnightPalette.goldLight,
  },

  qibla: {
    compassBg:              midnightPalette.card,
    compassRing:            midnightPalette.borderBright,
    compassRingAligned:     midnightPalette.gold,
    needleBeam:             midnightPalette.gold,
    needleBeamAligned:      midnightPalette.goldLight,
    needleTip:              midnightPalette.goldLight,
    alignedGlow:            midnightPalette.gold,
    alignedGlowShadow:     '#A07C1F',
    kaabaIcon:              midnightPalette.text,
    kaabaGold:              midnightPalette.gold,
    bearingText:            midnightPalette.goldLight,
    hintText:               midnightPalette.textMuted,
    interferenceWarningBg:  'rgba(232, 93, 117, 0.15)',
    interferenceWarningText: midnightPalette.danger,
    anomalyWarningBg:       'rgba(245, 158, 11, 0.15)',
    anomalyWarningText:     palette.statusWarning,
    cardinalN:              midnightPalette.text,
    cardinalMuted:          midnightPalette.textSub,
    tickCardinal:           midnightPalette.textMuted,
    tickMinor:              midnightPalette.borderBright,
    verifyLink:             midnightPalette.goldLight,
  },

  sanctuary: {
    greeting:        palette.whiteAlpha70,
    label:           palette.whiteAlpha50,
    prayerName:      midnightPalette.text,
    prayerTime:      palette.whiteAlpha80,
    countdown:       palette.whiteAlpha60,
    prayedStatus:    palette.whiteAlpha80,
    buttonBg:        palette.whiteAlpha10,
    buttonBorder:    palette.whiteAlpha30,
    buttonBgMuted:   palette.whiteAlpha05,
    buttonBorderMuted: palette.whiteAlpha15,
    buttonText:      midnightPalette.text,
    ring: {
      innerGradCenter: 'rgba(10,30,22,0.8)',
      innerGradEdge:   'rgba(7,20,14,0.95)',
      innerBorder:     'rgba(201,168,76,0.08)',
      trackStroke:     palette.whiteAlpha05,
      glowStroke:      'rgba(201,168,76,0.20)',
    },
  },

  prayerGradients: midnightPrayerGradients,

  switch: {
    trackFalse: midnightPalette.card2,
    trackTrue:  midnightPalette.teal,
    thumb:      palette.white,
  },

  chart: {
    background:         midnightPalette.card,
    gradientFrom:       midnightPalette.card,
    gradientTo:         midnightPalette.card,
    line:               midnightPalette.gold,
    dot:                midnightPalette.goldLight,
    label:              midnightPalette.textMuted,
    legendFont:         midnightPalette.textMuted,
  },

  settings: {
    sectionBg:         midnightPalette.card,
    containerBg:       midnightPalette.night,
    inputBg:           midnightPalette.card2,
    inputBorder:       midnightPalette.gold,
    inputText:         midnightPalette.text,
    sliderMin:         midnightPalette.goldLight,
    sliderMax:         midnightPalette.textSub,
    sliderThumb:       midnightPalette.gold,
    sliderWarningMin:  palette.statusWarning,
    sliderWarningThumb: '#F57C00',
    optionBg:          midnightPalette.card2,
    optionBorder:      midnightPalette.borderBright,
    optionActiveBg:    midnightPalette.goldAlpha12,
    optionActiveBorder: midnightPalette.gold,
    buttonPrimaryBg:   midnightPalette.teal,
    buttonPrimaryText: midnightPalette.night,
    buttonSecondaryBg: 'transparent',
    buttonSecondaryBorder: midnightPalette.teal,
    buttonSecondaryText: midnightPalette.teal,
    cancelBg:          midnightPalette.card2,
    cancelBorder:      midnightPalette.borderBright,
    cancelText:        midnightPalette.textMuted,
    infoBg:            'rgba(59, 130, 246, 0.1)',
    infoTitle:         palette.statusInfo,
    infoLabel:         palette.statusInfo,
    infoText:          palette.statusInfo,
    warningBg:         'rgba(245, 158, 11, 0.1)',
    warningBorder:     'rgba(245, 158, 11, 0.3)',
    warningText:       palette.statusWarning,
    hintBg:            midnightPalette.goldAlpha05,
    hintBorder:        midnightPalette.goldAlpha10,
    hintText:          midnightPalette.gold,
    tipsBg:            midnightPalette.goldGlow,
    tipsTitle:         midnightPalette.goldLight,
    tipsText:          midnightPalette.gold,
    modalOverlay:      palette.blackAlpha60,
    modalBg:           midnightPalette.card,
    modalShadow:       palette.black,
    modalBorder:       midnightPalette.borderBright,
    modalTitle:        midnightPalette.gold,
    modalClose:        midnightPalette.gold,
    modalCloseDisabled: midnightPalette.textSub,
    previewBg:         midnightPalette.card2,
    previewBorder:     midnightPalette.gold,
    labelPrimary:      midnightPalette.text,
    labelSecondary:    midnightPalette.textMuted,
    labelMuted:        midnightPalette.textSub,
  },

  // Mosque Mode surfaces
  mosqueMode: {
    banner: {
      bg:          midnightPalette.tealAlpha08,
      dot:         midnightPalette.teal,
      text:        midnightPalette.text,
      textMuted:   midnightPalette.textMuted,
      button:      midnightPalette.teal,
    },
    sectionLabel:  midnightPalette.textMuted,
    card: {
      bg:          midnightPalette.card,
      border:      midnightPalette.borderBright,
    },
    accordion: {
      bg:          midnightPalette.card,
      border:      midnightPalette.borderDim,
      chevron:     midnightPalette.textMuted,
    },
    chip: {
      bg:          'transparent',
      border:      midnightPalette.borderBright,
      text:        midnightPalette.textMuted,
      activeBg:    midnightPalette.teal,
      activeBorder: midnightPalette.teal,
      activeText:  midnightPalette.night,
    },
    segment: {
      bg:          midnightPalette.card2,
      activeBg:    midnightPalette.teal,
      activeText:  midnightPalette.night,
      inactiveText: midnightPalette.textMuted,
    },
    hint: {
      bg:          midnightPalette.tealAlpha08,
      border:      midnightPalette.tealAlpha20,
      text:        midnightPalette.teal,
      icon:        midnightPalette.teal,
    },
    jummah: {
      accent:        midnightPalette.gold,
      accentDim:     midnightPalette.goldAlpha20,
      chipActiveBg:  midnightPalette.gold,
      chipActiveText: midnightPalette.night,
      segmentActiveBg: midnightPalette.gold,
    },
    footer:        midnightPalette.textSub,
  },
};

// ─── Type Utilities ────────────────────────────────────────────────
// Widen literal string types so darkTheme, lightTheme, and midnightTheme satisfy Theme.
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
export { palette, lightPalette, midnightPalette, prayerGradients, achievementTiers };
export type Theme = DeepStringify<typeof darkTheme>;
export type ThemeColors = keyof Theme;

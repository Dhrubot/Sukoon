// src/theme/tubaTreeTokens.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE THEME TOKENS                                        ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  v3: Ramadan moon halo colors updated to be actually visible.  ║
// ║  The halo is now a RN View (not SVG Circle), so the color      ║
// ║  needs to be more opaque here — the RAMADAN_MOON_HALO.opacity  ║
// ║  constant in tubaTree.ts controls the final opacity.           ║
// ╚══════════════════════════════════════════════════════════════════╝

// ─── Dark Theme Tree Tokens ────────────────────────────────────────
export const darkTreeTokens = {
  trunk:           '#5c4535',
  trunkHighlight:  'rgba(255, 255, 255, 0.06)',
  skyStars:        '#ffffff',
  moonColor:       'rgba(255, 255, 255, 0.55)',
  bloomGlow:       '#D4AF37',
  groundFade:      '#181D38',
  dawamPillBg:     'rgba(212, 175, 55, 0.08)',
  dawamPillBorder: 'rgba(212, 175, 55, 0.18)',
  dawamPillText:   '#D4AF37',
  dawamDot:        '#D4AF37',
  soilTop:         '#151c12',
  soilMid:         '#1e2016',
  soilBase:        '#2a2a1a',
  soilBottom:      '#1a1c14',
} as const;

// ─── Light Theme Tree Tokens ───────────────────────────────────────
export const lightTreeTokens = {
  trunk:           '#6B5E54',
  trunkHighlight:  'rgba(0, 0, 0, 0.08)',
  skyStars:        'transparent',
  moonColor:       'transparent',
  bloomGlow:       '#b08c2a',
  groundFade:      '#faf7f2',
  dawamPillBg:     'rgba(176, 140, 42, 0.07)',
  dawamPillBorder: 'rgba(176, 140, 42, 0.18)',
  dawamPillText:   '#b08c2a',
  dawamDot:        '#b08c2a',
  soilTop:         '#e8dcc8',
  soilMid:         '#c8b898',
  soilBase:        '#b8a888',
  soilBottom:      '#c8b898',
} as const;

// ─── Midnight Theme Tree Tokens ────────────────────────────────────
export const midnightTreeTokens = {
  trunk:           '#4a3728',
  trunkHighlight:  'rgba(255, 255, 255, 0.04)',
  skyStars:        '#ffffff',
  moonColor:       'rgba(255, 255, 255, 0.65)',
  bloomGlow:       '#e8c97a',
  groundFade:      '#090d18',
  dawamPillBg:     'rgba(201, 168, 76, 0.08)',
  dawamPillBorder: 'rgba(201, 168, 76, 0.20)',
  dawamPillText:   '#e8c97a',
  dawamDot:        '#e8c97a',
  soilTop:         '#0a0d08',
  soilMid:         '#14160e',
  soilBase:        '#1a1c12',
  soilBottom:      '#10120c',
} as const;

export const tubaTreeTokens = {
  dark:     darkTreeTokens,
  light:    lightTreeTokens,
  midnight: midnightTreeTokens,
} as const;

// ─── Ramadan Mode Overrides (v3) ───────────────────────────────────
// v3: moonHalo colors are now solid gold — opacity is controlled by
// RAMADAN_MOON_HALO.opacity (0.35) in tubaTree.ts constants.
// Previously these were rgba with built-in low opacity, making the
// halo invisible (0.12 opacity × 0.12 rgba = effectively 0.014).
export const ramadanTokens = {
  dark: {
    moonHalo:   '#D4AF37',       // solid gold — opacity applied via constant
    goldBlend:  '#D4AF37',
    stageLabel: '#D4AF37',
  },
  light: {
    moonHalo:   '#b08c2a',       // warm gold for light theme
    goldBlend:  '#b08c2a',
    stageLabel: '#b08c2a',
  },
  midnight: {
    moonHalo:   '#e8c97a',       // bright gold for midnight
    goldBlend:  '#e8c97a',
    stageLabel: '#e8c97a',
  },
  // Default fallback (used when theme.mode doesn't match)
  default: {
    moonHalo:   '#D4AF37',
    goldBlend:  '#D4AF37',
    stageLabel: '#D4AF37',
  },
} as const;
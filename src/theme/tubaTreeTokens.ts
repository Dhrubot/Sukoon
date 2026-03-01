// src/theme/tubaTreeTokens.ts
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TUBA TREE THEME TOKENS                                        ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  These tokens must be merged into the `garden` object in       ║
// ║  darkTheme, lightTheme, and blackoutTheme in colors.ts.        ║
// ║                                                                ║
// ║  All values derive from existing palette constants —            ║
// ║  no new hex values that don't trace back to the palette.       ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// USAGE: In colors.ts, spread these into each theme's garden object:
//
//   garden: {
//     ...existingGardenTokens,
//     ...tubaTreeTokens.dark,   // or .light / .blackout
//   }

// ─── Dark Theme Tree Tokens ────────────────────────────────────────
// Derives from: palette.navy*, palette.gold*, palette.green*
export const darkTreeTokens = {
  trunk:           '#5c4535',
  trunkHighlight:  'rgba(255, 255, 255, 0.06)',
  skyStars:        '#ffffff',
  moonColor:       'rgba(255, 255, 255, 0.55)',
  bloomGlow:       '#D4AF37',       // palette.gold400
  groundFade:      '#181D38',       // palette.navy900 — matches background.primary (kept for backward compat)
  dawamPillBg:     'rgba(212, 175, 55, 0.08)',
  dawamPillBorder: 'rgba(212, 175, 55, 0.18)',
  dawamPillText:   '#D4AF37',       // palette.gold400
  dawamDot:        '#D4AF37',       // palette.gold400
  // Soil gradient — earthy tones that blend from sky to ground
  soilTop:         '#151c12',       // dark olive — blends with sky
  soilMid:         '#1e2016',       // mid earth
  soilBase:        '#2a2a1a',       // rich dark soil
  soilBottom:      '#1a1c14',       // deepest earth
} as const;

// ─── Light Theme Tree Tokens ───────────────────────────────────────
// Derives from: lightPalette.gold*, lightPalette.cream, lightPalette.teal
export const lightTreeTokens = {
  trunk:           '#6B5E54',
  trunkHighlight:  'rgba(0, 0, 0, 0.08)',
  skyStars:        'transparent',    // no stars in light theme
  moonColor:       'transparent',    // no moon in light theme
  bloomGlow:       '#b08c2a',        // lightPalette.gold
  groundFade:      '#faf7f2',        // lightPalette.cream — matches background.primary
  dawamPillBg:     'rgba(176, 140, 42, 0.07)',
  dawamPillBorder: 'rgba(176, 140, 42, 0.18)',
  dawamPillText:   '#b08c2a',        // lightPalette.gold
  dawamDot:        '#b08c2a',        // lightPalette.gold
  // Soil gradient — warm cream to sandy earth
  soilTop:         '#e8dcc8',        // warm cream — blends with light sky
  soilMid:         '#c8b898',        // sandy mid-tone
  soilBase:        '#b8a888',        // warm earth
  soilBottom:      '#c8b898',        // base sand
} as const;

// ─── Blackout Theme Tree Tokens ────────────────────────────────────
// Derives from: blackoutPalette.gold*, blackoutPalette.night
export const blackoutTreeTokens = {
  trunk:           '#4a3728',
  trunkHighlight:  'rgba(255, 255, 255, 0.04)',
  skyStars:        '#ffffff',
  moonColor:       'rgba(255, 255, 255, 0.65)',
  bloomGlow:       '#e8c97a',       // blackoutPalette.goldLight
  groundFade:      '#090d18',       // blackoutPalette.night — matches background.primary
  dawamPillBg:     'rgba(201, 168, 76, 0.08)',
  dawamPillBorder: 'rgba(201, 168, 76, 0.20)',
  dawamPillText:   '#e8c97a',       // blackoutPalette.goldLight
  dawamDot:        '#e8c97a',       // blackoutPalette.goldLight
  // Soil gradient — ultra-dark earthy tones
  soilTop:         '#0a0d08',       // near-black olive
  soilMid:         '#14160e',       // very dark earth
  soilBase:        '#1a1c12',       // deep soil
  soilBottom:      '#10120c',       // base dark
} as const;

// ─── Merged export for convenience ─────────────────────────────────
export const tubaTreeTokens = {
  dark:     darkTreeTokens,
  light:    lightTreeTokens,
  blackout: blackoutTreeTokens,
} as const;

// ─── Ramadan Mode Overrides (Phase 3) ──────────────────────────────
// Applied on top of the base garden tokens when isRamadan() === true.
// Components read these directly; no theme switch needed.

export const ramadanTokens = {
  dark: {
    moonHalo:   'rgba(212, 175, 55, 0.12)',
    goldBlend:  '#D4AF37',
    stageLabel: '#D4AF37',
  },
  light: {
    moonHalo:   'rgba(176, 140, 42, 0.10)',
    goldBlend:  '#b08c2a',
    stageLabel: '#b08c2a',
  },
  blackout: {
    moonHalo:   'rgba(201, 168, 76, 0.14)',
    goldBlend:  '#e8c97a',
    stageLabel: '#e8c97a',
  },
} as const;
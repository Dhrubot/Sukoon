// src/theme/typography.ts
export const typography = {
  fontFamily: {
    heading: 'CormorantGaramond_600SemiBold',   // Primary serif voice — calmer and more cohesive
    headingMedium: 'CormorantGaramond_500Medium',
    headingLight: 'CormorantGaramond_300Light',
    headingRegular: 'CormorantGaramond_400Regular',
    body: 'DMSans_400Regular',         // Sans — body text, descriptions, labels
    bodyMedium: 'DMSans_500Medium',    // Sans medium — emphasized body, status text
    bodySemibold: 'DMSans_600SemiBold',// Sans semibold — buttons, nav labels, time numbers
    bodyBold: 'DMSans_700Bold',        // Sans bold — strong emphasis
    arabic: 'Amiri_400Regular',        // Calligraphic — Quranic text, dhikr
    arabicBold: 'Amiri_700Bold',       // Calligraphic bold — Arabic headings
    sanctuaryHeading: 'CormorantGaramond_500Medium', // Elegant serif — countdown ring prayer name (hero always dark)
    sanctuaryItalic: 'CormorantGaramond_400Regular', // Italic serif — iqamah line
  },
  fontSize: {
    xs: 12,      // Tiny labels, timestamps
    sm: 13,      // Body text, descriptions
    md: 14,      // Default body, secondary info
    base: 15,    // Primary body text
    lg: 17,      // Prayer names, list items
    xl: 18,      // Section headers, card titles
    '2xl': 19,   // Screen titles
    '3xl': 23,   // Large numbers, featured text
    '4xl': 26,   // Hero text
    '5xl': 28,   // Extra large displays
    '6xl': 36,   // Countdown ring, hero display
  },
  fontWeight: {
    regular: '400' as const,   // Body text
    medium: '500' as const,    // Emphasized text
    semibold: '600' as const,  // Headers, buttons
    bold: '700' as const,      // Strong emphasis
  },
  lineHeight: {
    tight: 1.25,    // Headings, compact text
    normal: 1.5,    // Default line height
    relaxed: 1.75,  // Paragraphs, descriptions
  },
};

// ─── Midnight Typography ─────────────────────────────────────────
// Cormorant Garamond serif + lighter DM Sans weights.
// Slightly smaller, more airy sizing — premium, editorial feel.
export const midnightTypography = {
  fontFamily: {
    heading: 'CormorantGaramond_600SemiBold',
    headingMedium: 'CormorantGaramond_500Medium',
    headingLight: 'CormorantGaramond_300Light',
    headingRegular: 'CormorantGaramond_400Regular',
    body: 'DMSans_400Regular',
    bodyMedium: 'DMSans_500Medium',
    bodySemibold: 'DMSans_500Medium',     // one step lighter than default
    bodyBold: 'DMSans_600SemiBold',       // one step lighter than default
    arabic: 'Amiri_400Regular',
    arabicBold: 'Amiri_700Bold',
    sanctuaryHeading: 'CormorantGaramond_500Medium',
    sanctuaryItalic: 'CormorantGaramond_400Regular',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 22,
    '4xl': 24,
    '5xl': 28,
    '6xl': 34,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export type Typography = typeof typography;

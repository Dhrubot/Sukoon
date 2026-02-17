// src/constants/khushuQuotes.ts
// Khushu (mindful presence) quotes shown during the "praying" step.
// Extracted from MindfulnessFlow for maintainability and future expansion.

export const KHUSHU_QUOTES: string[] = [
  'Allah is facing you. Do not turn away.',
  'Pray as if it is your last prayer.',
  'He hears every word. He sees every prostration.',
  'The Prophet ﷺ said: Pray as if you see Him.',
  'Your Lord is closer to you than your jugular vein.',
  'This prayer may be the one that changes everything.',
  'Stand before Him with humility — He already knows your heart.',
  'Every sajdah brings you closer to your Creator.',
  'Let the world wait. This moment is between you and Allah.',
  'The sweetness of this life is in this prayer.',
];

/**
 * Pick a random khushu quote (call once per session).
 */
export function getRandomKhushuQuote(): string {
  return KHUSHU_QUOTES[Math.floor(Math.random() * KHUSHU_QUOTES.length)];
}

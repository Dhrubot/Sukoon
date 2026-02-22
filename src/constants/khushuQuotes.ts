// src/constants/khushuQuotes.ts
// Khushu (mindful presence) quotes shown during the "praying" step.
// Extracted from MindfulnessFlow for maintainability and future expansion.

export const KHUSHU_QUOTES: string[] = [
  // Original 10
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
  // Prophetic sayings on salah quality
  'The Prophet ﷺ said: The first matter to be judged on the Day of Resurrection will be prayer.',
  'The Prophet ﷺ said: The coolness of my eyes was placed in prayer.',
  'The Prophet ﷺ used to say between the two prostrations: O Allah, forgive me and have mercy on me.',
  'The Prophet ﷺ said: When one of you stands in prayer, he is conversing with his Lord.',
  'The Prophet ﷺ said: Make your prayer a light.',
  // Scholar reflections (Ibn al-Qayyim, Al-Ghazali, Hasan al-Basri)
  'Ibn al-Qayyim: The prayer is the place of intimate conversation with the One you love.',
  'Al-Ghazali: Know that the prayer has an outer form and an inner spirit — its spirit is presence of heart.',
  'Hasan al-Basri: When you stand for prayer, stand as one who is bidding farewell.',
  'Ibn al-Qayyim: The heart in prayer is like a bird — its two wings are fear and hope.',
  'Al-Ghazali: The measure of your prayer is the measure of your awareness of the One before whom you stand.',
  // Gentle spiritual reminders
  'You are standing before the King of kings. Let your heart be still.',
  'Allah does not look at your posture — He looks at your heart.',
  'In this sajdah, place your worries on the ground and leave them there.',
  'The one who prays with presence has found the door to peace.',
  'Each raka\'ah is a chance to begin again. Allah never tires of forgiving.',
  'Silence the world. In this prayer, only His words matter.',
  'Your body is here. Let your heart arrive too.',
  'The closest a servant is to his Lord is while in prostration.',
  'If your mind wanders, gently return it. Allah rewards your effort.',
  'This is not a task to finish — it is a meeting to cherish.',
];

/**
 * Pick a random khushu quote (call once per session).
 */
export function getRandomKhushuQuote(): string {
  return KHUSHU_QUOTES[Math.floor(Math.random() * KHUSHU_QUOTES.length)];
}

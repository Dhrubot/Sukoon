// src/utils/hijriDate.ts
// Umm al-Qura calendar approximation for Hijri date display.
// Algorithmic — no API dependency. Accuracy ±1 day (sufficient for informational display).

const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
] as const;

/**
 * Convert a Gregorian date to an approximate Hijri date.
 * Uses the Kuwaiti algorithm (a widely-used civil approximation).
 */
export function toHijri(date: Date): { day: number; month: number; monthName: string; year: number } {
  const gd = date.getDate();
  const gm = date.getMonth() + 1; // 1-indexed
  const gy = date.getFullYear();

  let jd: number;

  // Calculate Julian Day Number
  if (gm > 2) {
    jd = Math.floor(365.25 * (gy + 4716)) + Math.floor(30.6001 * (gm + 1)) + gd - 1524.5;
  } else {
    jd = Math.floor(365.25 * (gy - 1 + 4716)) + Math.floor(30.6001 * (gm + 12 + 1)) + gd - 1524.5;
  }

  // Adjust for Gregorian calendar
  const a = Math.floor((jd - 1867216.25) / 36524.25);
  jd = jd + 1 + a - Math.floor(a / 4);

  // Convert Julian Day to Hijri
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remainder = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - remainder) / 5316) *
      Math.floor((50 * remainder) / 17719) +
    Math.floor(remainder / 5670) *
      Math.floor((43 * remainder) / 15238);
  const adjustedRemainder =
    remainder -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  const month = Math.floor((24 * adjustedRemainder) / 709);
  const day = adjustedRemainder - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return {
    day,
    month,
    monthName: HIJRI_MONTHS[month - 1] || '',
    year,
  };
}

/**
 * Format a Hijri date as "14 Sha'ban 1447"
 */
export function formatHijriDate(date: Date = new Date()): string {
  const h = toHijri(date);
  return `${h.day} ${h.monthName} ${h.year}`;
}

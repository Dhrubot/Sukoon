import type { Hadith } from '../constants/hadithCollection';
import { isRamadan } from './ramadan';

export interface VerseEntry {
  id: number;
  arabic: string;
  translation: string;
  reference: string;
  theme: string;
}

export interface DuaEntry {
  id: number;
  title: string;
  arabic: string;
  translation: string;
  occasion: string;
}

export interface DailyContent {
  arabic: string;
  translation: string;
  reference: string;
  narrator?: string;
  isHadith: boolean;
}

type DevotionalCatalog = {
  duas: DuaEntry[];
  hadithCollection: Hadith[];
  verses: VerseEntry[];
};

let cachedCatalog: DevotionalCatalog | null = null;

function getDayOfYear(today: Date): number {
  return Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function loadDevotionalCatalog(): DevotionalCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const { DUAS, VERSES } = require('../constants') as {
    DUAS: DuaEntry[];
    VERSES: VerseEntry[];
  };
  const { HADITH_COLLECTION } = require('../constants/hadithCollection') as {
    HADITH_COLLECTION: Hadith[];
  };

  cachedCatalog = {
    duas: DUAS,
    hadithCollection: HADITH_COLLECTION,
    verses: VERSES,
  };

  return cachedCatalog;
}

export function getContextualDuaForPrayer(prayerName: string, today: Date = new Date()): DuaEntry | null {
  const occasionMap: Record<string, string[]> = {
    Fajr: ['fajr', 'before_prayer', 'morning'],
    Dhuhr: ['before_prayer'],
    Asr: ['before_prayer'],
    Maghrib: ['before_prayer', 'evening'],
    Isha: ['before_prayer', 'evening'],
  };

  const occasions = occasionMap[prayerName] || ['before_prayer'];
  const { duas } = loadDevotionalCatalog();
  const matching = duas.filter((dua) => occasions.includes(dua.occasion));

  if (matching.length === 0) {
    return null;
  }

  const index = today.getDate() % matching.length;
  return matching[index];
}

export function resolveDailyContent(today: Date = new Date()): DailyContent {
  const { hadithCollection, verses } = loadDevotionalCatalog();
  const dayOfYear = getDayOfYear(today);

  if (isRamadan()) {
    const ramadanVerses = verses.filter((verse) => verse.theme === 'ramadan');
    if (ramadanVerses.length > 0) {
      const verse = ramadanVerses[dayOfYear % ramadanVerses.length];
      return {
        arabic: verse.arabic,
        translation: verse.translation,
        reference: verse.reference,
        isHadith: false,
      };
    }
  }

  if (dayOfYear % 2 === 0) {
    const verse = verses[Math.floor(dayOfYear / 2) % verses.length];
    return {
      arabic: verse.arabic,
      translation: verse.translation,
      reference: verse.reference,
      isHadith: false,
    };
  }

  const hadith = hadithCollection[Math.floor(dayOfYear / 2) % hadithCollection.length];
  return {
    arabic: hadith.arabic,
    translation: hadith.translation,
    reference: hadith.source,
    narrator: hadith.narrator,
    isHadith: true,
  };
}

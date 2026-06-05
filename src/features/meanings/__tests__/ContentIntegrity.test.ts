// Content integrity tests for the Meanings of Prayer feature.
//
// Pure data validation — no mocks required because content/index.ts and its
// transitive imports are all plain TypeScript data files with no native
// dependencies (no MMKV, no Firebase).

import {
  ALL_MEANINGS,
  FATIHAH_WORD_BY_WORD,
  PRAYER_RECITATIONS,
  SHORT_SURAHS,
} from '../content';
import type { PrayerPosition } from '../content';

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_POSITIONS: PrayerPosition[] = [
  'opening',
  'standing',
  'transition',
  'ruku',
  'rising',
  'sujood',
  'between_sajdahs',
  'sitting',
  'taslim',
];

const ARABIC_CHAR_REGEX = /[؀-ۿ]/;

const EXPECTED_SURAH_IDS = [
  'surah-al-asr',
  'surah-al-humazah',
  'surah-al-fil',
  'surah-quraysh',
  'surah-al-maun',
  'surah-al-kawthar',
  'surah-al-kafirun',
  'surah-al-ikhlas',
  'surah-al-falaq',
  'surah-an-nas',
];

// ─── Shape — every Meaning ───────────────────────────────────────────────────

describe('Shape — every Meaning', () => {
  it('ALL_MEANINGS has exactly 23 entries', () => {
    expect(ALL_MEANINGS).toHaveLength(23);
  });

  it('every Meaning has required top-level fields with correct types', () => {
    ALL_MEANINGS.forEach((m) => {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);

      expect(typeof m.position).toBe('string');

      expect(typeof m.order).toBe('number');

      expect(typeof m.title).toBe('string');
      expect(m.title.length).toBeGreaterThan(0);

      expect(typeof m.arabic).toBe('string');

      expect(typeof m.transliteration).toBe('string');

      // audioAsset must be a number or null
      expect(m.audioAsset === null || typeof m.audioAsset === 'number').toBe(true);

      // translations.en must be present
      expect(m.translations.en).toBeDefined();
      expect(typeof m.translations.en!.translation).toBe('string');
      expect(typeof m.translations.en!.reflection).toBe('string');

      expect(m.source).toBeDefined();
      expect(typeof m.source.translation).toBe('string');
    });
  });

  it("every Meaning's translations.en.translation is non-empty and longer than 5 chars", () => {
    ALL_MEANINGS.forEach((m) => {
      const translation = m.translations.en?.translation ?? '';
      expect(translation.length).toBeGreaterThan(5);
    });
  });

  it("every Meaning's translations.en.reflection is non-empty and at least 50 chars", () => {
    ALL_MEANINGS.forEach((m) => {
      const reflection = m.translations.en?.reflection ?? '';
      expect(reflection.length).toBeGreaterThanOrEqual(50);
    });
  });

  it("every Meaning's arabic is non-empty and contains at least one Arabic character", () => {
    ALL_MEANINGS.forEach((m) => {
      expect(m.arabic.length).toBeGreaterThan(0);
      expect(ARABIC_CHAR_REGEX.test(m.arabic)).toBe(true);
    });
  });

  it("every Meaning's transliteration is non-empty", () => {
    ALL_MEANINGS.forEach((m) => {
      expect(m.transliteration.length).toBeGreaterThan(0);
    });
  });

  it("every Meaning's source.translation is a non-empty citation string", () => {
    ALL_MEANINGS.forEach((m) => {
      expect(m.source.translation.length).toBeGreaterThan(0);
    });
  });
});

// ─── Uniqueness & ordering ───────────────────────────────────────────────────

describe('Uniqueness & ordering', () => {
  it('all Meaning ids are unique across ALL_MEANINGS', () => {
    const ids = ALL_MEANINGS.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all Meaning order values are unique', () => {
    const orders = ALL_MEANINGS.map((m) => m.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });

  it('ALL_MEANINGS is sorted ascending by order', () => {
    for (let i = 1; i < ALL_MEANINGS.length; i++) {
      expect(ALL_MEANINGS[i].order).toBeGreaterThan(ALL_MEANINGS[i - 1].order);
    }
  });
});

// ─── Position values ─────────────────────────────────────────────────────────

describe('Position values', () => {
  it('every position is a valid PrayerPosition literal', () => {
    ALL_MEANINGS.forEach((m) => {
      expect(VALID_POSITIONS).toContain(m.position);
    });
  });
});

// ─── Specific items present ───────────────────────────────────────────────────

describe('Specific items present', () => {
  it('the Fatihah entry exists, has wordByWord populated, and is at order 3', () => {
    const fatihah = ALL_MEANINGS.find((m) => m.id === 'fatihah');
    expect(fatihah).toBeDefined();
    expect(fatihah!.order).toBe(3);
    expect(Array.isArray(fatihah!.wordByWord)).toBe(true);
    expect(fatihah!.wordByWord!.length).toBeGreaterThan(0);
  });

  it("the 'taslim' entry exists", () => {
    const taslim = ALL_MEANINGS.find((m) => m.id === 'taslim');
    expect(taslim).toBeDefined();
  });

  it("the 'tasbih-ruku' entry has recommendedReps === 3", () => {
    const entry = ALL_MEANINGS.find((m) => m.id === 'tasbih-ruku');
    expect(entry).toBeDefined();
    expect(entry!.recommendedReps).toBe(3);
  });

  it("the 'tasbih-sujood' entry has recommendedReps === 3", () => {
    const entry = ALL_MEANINGS.find((m) => m.id === 'tasbih-sujood');
    expect(entry).toBeDefined();
    expect(entry!.recommendedReps).toBe(3);
  });
});

// ─── Short surahs ─────────────────────────────────────────────────────────────

describe('Short surahs', () => {
  it('all 10 expected surah ids are present in ALL_MEANINGS', () => {
    const allIds = new Set(ALL_MEANINGS.map((m) => m.id));
    EXPECTED_SURAH_IDS.forEach((id) => {
      expect(allIds.has(id)).toBe(true);
    });
  });

  it("every surah entry has position === 'standing'", () => {
    EXPECTED_SURAH_IDS.forEach((id) => {
      const entry = ALL_MEANINGS.find((m) => m.id === id);
      expect(entry).toBeDefined();
      expect(entry!.position).toBe('standing');
    });
  });
});

// ─── Fatihah word-by-word ─────────────────────────────────────────────────────

describe('Fatihah word-by-word', () => {
  it('FATIHAH_WORD_BY_WORD has exactly 29 entries', () => {
    expect(FATIHAH_WORD_BY_WORD).toHaveLength(29);
  });

  it('every entry has position (number), arabic, transliteration, and meaning — all non-empty', () => {
    FATIHAH_WORD_BY_WORD.forEach((w) => {
      expect(typeof w.position).toBe('number');
      expect(w.arabic.length).toBeGreaterThan(0);
      expect(w.transliteration.length).toBeGreaterThan(0);
      expect(w.meaning.length).toBeGreaterThan(0);
    });
  });

  it('positions are sequential from 1 to 29 with no gaps', () => {
    const positions = FATIHAH_WORD_BY_WORD.map((w) => w.position).sort((a, b) => a - b);
    for (let i = 0; i < 29; i++) {
      expect(positions[i]).toBe(i + 1);
    }
  });

  it('entries that have a root field also have a non-empty rootMeaning', () => {
    FATIHAH_WORD_BY_WORD.forEach((w) => {
      if (w.root !== undefined) {
        expect(w.rootMeaning).toBeDefined();
        expect(w.rootMeaning!.length).toBeGreaterThan(0);
      }
    });
  });
});

// ─── Audio bundling ──────────────────────────────────────────────────────────

// Items with bundled Alafasy recitation audio (Phase 7).
// Hadith-derived recitations remain null until standalone clips are sourced.
const ITEMS_WITH_AUDIO = [
  'fatihah',
  'surah-al-asr',
  'surah-al-humazah',
  'surah-al-fil',
  'surah-quraysh',
  'surah-al-maun',
  'surah-al-kawthar',
  'surah-al-kafirun',
  'surah-al-ikhlas',
  'surah-al-falaq',
  'surah-an-nas',
];

describe('Audio bundling', () => {
  it('every Quranic item has a bundled audio asset (numeric Metro asset id)', () => {
    ITEMS_WITH_AUDIO.forEach((id) => {
      const m = ALL_MEANINGS.find((x) => x.id === id);
      expect(m).toBeDefined();
      expect(typeof m?.audioAsset).toBe('number');
    });
  });

  it('non-Quranic (hadith-derived) recitations still have audioAsset === null', () => {
    const hadithItems = ALL_MEANINGS.filter((m) => !ITEMS_WITH_AUDIO.includes(m.id));
    expect(hadithItems.length).toBeGreaterThan(0);
    hadithItems.forEach((m) => {
      expect(m.audioAsset).toBeNull();
    });
  });
});

// ─── Source data counts (sanity) ─────────────────────────────────────────────

describe('Source data counts', () => {
  it('PRAYER_RECITATIONS has 13 entries', () => {
    expect(PRAYER_RECITATIONS).toHaveLength(13);
  });

  it('SHORT_SURAHS has 10 entries', () => {
    expect(SHORT_SURAHS).toHaveLength(10);
  });
});

// Al-Fatihah — word-by-word breakdown.
//
// 29 word positions across the 7 ayat (some words repeat — e.g. Ar-Raḥmān
// appears twice; ʿalayhim appears twice). Each entry includes Arabic root
// where applicable, root meaning, and a brief note that points to the
// rhetorical or grammatical insight a sentence-level translation hides.
//
// This is the ONLY word-by-word data in v1.1. Fatihah is recited 17x/day —
// highest leverage of any item in the feature.
//
// Sources cross-referenced:
//   - Lane's Lexicon (public domain)
//   - Tafsir ibn Kathir, abridged Saheeh edition
//   - Tafsir al-Saʿdī (modern, accessible)
// Notes deliberately avoid identifying named groups for "maghḍūb" / "ḍāllīn"
// (classical tafsir is interpretively contested on this; safer to convey
// the underlying principle without divisive group labels).

import type { WordByWordEntry } from '../schema';

export const FATIHAH_WORD_BY_WORD: WordByWordEntry[] = [
  // ─── Ayah 1: Bismi llāhi r-Raḥmāni r-Raḥīm ──────────────────────────
  {
    position: 1,
    arabic: 'بِسْمِ',
    transliteration: 'Bismi',
    root: 'س م و',
    rootMeaning: 'name; to be elevated',
    meaning: 'In the name of',
    note: 'Composed of "bi-" (with/in) + "ism" (name). The "bi-" attaches to whatever follows — here, it attaches the recitation to Allah Himself.',
  },
  {
    position: 2,
    arabic: 'اللَّهِ',
    transliteration: 'llāhi',
    root: 'ا ل ه',
    rootMeaning: 'deity; that which is worshipped',
    meaning: 'Allah',
    note: 'The proper name of God in Arabic. Etymologically derived from "al-ilāh" (the deity), but used as a unique proper noun no other being shares.',
  },
  {
    position: 3,
    arabic: 'الرَّحْمَٰنِ',
    transliteration: 'r-Raḥmāni',
    root: 'ر ح م',
    rootMeaning: 'mercy; womb (raḥim)',
    meaning: 'the All-Merciful',
    note: 'The "faʿlān" pattern denotes intensity and scope. Raḥmān is mercy by essence — vast, embracing all creation by default. Many scholars say this name belongs to Allah alone.',
  },
  {
    position: 4,
    arabic: 'الرَّحِيمِ',
    transliteration: 'r-Raḥīm',
    root: 'ر ح م',
    rootMeaning: 'mercy; womb',
    meaning: 'the Especially Merciful',
    note: 'Same root as Raḥmān — but the "faʿīl" pattern denotes ongoing, applied action. Where Raḥmān is mercy as quality, Raḥīm is mercy in continuous practice. Together they pair vast scope with persistent application.',
  },

  // ─── Ayah 2: Al-ḥamdu li-llāhi rabbi l-ʿālamīn ──────────────────────
  {
    position: 5,
    arabic: 'الْحَمْدُ',
    transliteration: 'Al-ḥamdu',
    root: 'ح م د',
    rootMeaning: 'praise',
    meaning: '[All] praise',
    note: 'The "al-" makes it universal — every kind of praise. Distinct from "shukr" (gratitude for a benefit received). Ḥamd is praise of intrinsic worth, owed before any benefit reaches you.',
  },
  {
    position: 6,
    arabic: 'لِلَّهِ',
    transliteration: 'li-llāhi',
    root: 'ا ل ه',
    rootMeaning: 'deity (via Allah)',
    meaning: 'is for Allah',
    note: 'The "li-" prefix means "for" or "belongs to." Combined with "al-ḥamdu" it forms a complete statement: all praise belongs to Allah — no contingency, no exception.',
  },
  {
    position: 7,
    arabic: 'رَبِّ',
    transliteration: 'rabbi',
    root: 'ر ب ب',
    rootMeaning: 'to nurture, to raise, to master',
    meaning: 'Lord of',
    note: '"Rabb" is denser than the English "Lord." It carries creator + sustainer + nurturer + master + owner — every relationship of dependence in one word. To call Allah "Rabbī" is to acknowledge all of those at once.',
  },
  {
    position: 8,
    arabic: 'الْعَالَمِينَ',
    transliteration: 'l-ʿālamīn',
    root: 'ع ل م',
    rootMeaning: 'knowledge, knowing',
    meaning: 'the worlds',
    note: 'From the same root as "ʿilm" (knowledge). An "ʿālam" is a sign-bearing realm — a world through which Allah is known. The plural extends across humans, jinn, angels, and every system that points to Him.',
  },

  // ─── Ayah 3: Ar-Raḥmāni r-Raḥīm (repetition for emphasis) ───────────
  {
    position: 9,
    arabic: 'الرَّحْمَٰنِ',
    transliteration: 'r-Raḥmāni',
    root: 'ر ح م',
    rootMeaning: 'mercy; womb',
    meaning: 'the All-Merciful',
    note: 'Repeated immediately after "Lord of the worlds." The emphasis: the One who creates and sustains is the same One whose mercy embraces all. See word 3 for the deeper note.',
  },
  {
    position: 10,
    arabic: 'الرَّحِيمِ',
    transliteration: 'r-Raḥīm',
    root: 'ر ح م',
    rootMeaning: 'mercy; womb',
    meaning: 'the Especially Merciful',
    note: 'See word 4. The repetition of Raḥmān/Raḥīm so soon after the opening signals: mercy frames everything that follows.',
  },

  // ─── Ayah 4: Māliki yawmi d-dīn ─────────────────────────────────────
  {
    position: 11,
    arabic: 'مَالِكِ',
    transliteration: 'Māliki',
    root: 'م ل ك',
    rootMeaning: 'ownership, kingship',
    meaning: 'Sovereign of',
    note: 'Two authentic qirāʾāt — "Māliki" (Owner) and "Maliki" (King). Both are recited. Owner asserts absolute possession; King asserts absolute authority. Genitive form: "of the Day."',
  },
  {
    position: 12,
    arabic: 'يَوْمِ',
    transliteration: 'yawmi',
    root: 'ي و م',
    rootMeaning: 'day',
    meaning: 'Day of',
    note: 'The same word from which "yawm al-qiyāmah" (Day of Standing) and "yawm al-ḥisāb" (Day of Reckoning) are built.',
  },
  {
    position: 13,
    arabic: 'الدِّينِ',
    transliteration: 'd-dīn',
    root: 'د ي ن',
    rootMeaning: 'debt, recompense, way of life',
    meaning: 'the Recompense',
    note: 'The same root produces "dīn" (religion) — because both religion and judgment involve owing and being owed. "Yawm ad-dīn" is the day everyone receives their dues.',
  },

  // ─── Ayah 5: Iyyāka naʿbudu wa iyyāka nastaʿīn ──────────────────────
  {
    position: 14,
    arabic: 'إِيَّاكَ',
    transliteration: 'Iyyāka',
    meaning: 'You [alone]',
    note: 'Placing "Iyyāka" before the verb in Arabic syntax denotes exclusivity — "You alone we worship," not "we worship You" among other things. This single placement is doctrinal: tawhid stated in grammar.',
  },
  {
    position: 15,
    arabic: 'نَعْبُدُ',
    transliteration: 'naʿbudu',
    root: 'ع ب د',
    rootMeaning: 'to serve, to submit, to worship',
    meaning: 'we worship',
    note: '"ʿAbd" (servant/slave) shares this root. The verb is much broader than the English "worship" — it implies total submission of will across one\'s whole life, not only ritual acts.',
  },
  {
    position: 16,
    arabic: 'وَإِيَّاكَ',
    transliteration: 'wa iyyāka',
    meaning: 'and You [alone]',
    note: '"Wa" (and) + the same exclusivity construction from word 14. Repeating it before "nastaʿīn" doubles the emphasis — no help asked from anyone but Him.',
  },
  {
    position: 17,
    arabic: 'نَسْتَعِينُ',
    transliteration: 'nastaʿīn',
    root: 'ع و ن',
    rootMeaning: 'help, aid',
    meaning: 'we ask for help',
    note: 'The "ista-" prefix means "seeking" — "we seek/request help." Notice the order: worship is named first, then asking for help. Worship is the obligation; help is the request that follows it.',
  },

  // ─── Ayah 6: Ihdinā ṣ-ṣirāṭa l-mustaqīm ─────────────────────────────
  {
    position: 18,
    arabic: 'اهْدِنَا',
    transliteration: 'Ihdinā',
    root: 'ه د ي',
    rootMeaning: 'guidance',
    meaning: 'Guide us',
    note: 'Command form addressed to Allah — "guide us." The "-nā" suffix is "us," not "me." The Fatihah\'s central request is communal: a plural pronoun even when prayed alone.',
  },
  {
    position: 19,
    arabic: 'الصِّرَاطَ',
    transliteration: 'ṣ-ṣirāṭa',
    root: 'س ر ط',
    rootMeaning: 'a paved road; a wide way',
    meaning: 'the path',
    note: 'Of all words for "path" in Arabic, "ṣirāṭ" denotes a wide, clear, paved road — straight and visible. Not a hidden trail. The metaphor matters: the right way is not obscure.',
  },
  {
    position: 20,
    arabic: 'الْمُسْتَقِيمَ',
    transliteration: 'l-mustaqīm',
    root: 'ق و م',
    rootMeaning: 'to stand upright, to be steadfast',
    meaning: 'the straight',
    note: 'From the same root as "qiyām" (standing) and "iqāmah" (establishing prayer). "Mustaqīm" is the road that does not bend — the path that holds upright through every test.',
  },

  // ─── Ayah 7: Ṣirāṭa lladhīna anʿamta ʿalayhim, ghayri l-maghḍūbi ʿalayhim wa lā ḍ-ḍāllīn
  {
    position: 21,
    arabic: 'صِرَاطَ',
    transliteration: 'Ṣirāṭa',
    root: 'س ر ط',
    rootMeaning: 'a paved road; a wide way',
    meaning: 'The path of',
    note: 'Begins ayah 7. The "al-" is dropped because the following relative clause makes it definite by ownership. The Fatihah now defines whose path we mean.',
  },
  {
    position: 22,
    arabic: 'الَّذِينَ',
    transliteration: 'lladhīna',
    meaning: 'those who',
    note: 'Relative pronoun, plural masculine. Introduces the next clause: "those whom You have favored."',
  },
  {
    position: 23,
    arabic: 'أَنْعَمْتَ',
    transliteration: 'anʿamta',
    root: 'ن ع م',
    rootMeaning: 'blessing, favor, grace',
    meaning: 'You have bestowed favor',
    note: 'From the same root as "niʿmah" (blessing). The verb is in 2nd-person past tense — "You have already favored." We are asking to walk where the favored have already walked.',
  },
  {
    position: 24,
    arabic: 'عَلَيْهِمْ',
    transliteration: 'ʿalayhim',
    meaning: 'upon them',
    note: 'Preposition "ʿalā" (upon) + "-him" (them). Refers back to "those whom You favored."',
  },
  {
    position: 25,
    arabic: 'غَيْرِ',
    transliteration: 'ghayri',
    root: 'غ ي ر',
    rootMeaning: 'other than, different from',
    meaning: 'not [the path of]',
    note: 'Used to negate the next phrase. The Fatihah ends by naming what we ask to avoid — two categories whose paths diverge from the favored.',
  },
  {
    position: 26,
    arabic: 'الْمَغْضُوبِ',
    transliteration: 'l-maghḍūbi',
    root: 'غ ض ب',
    rootMeaning: 'anger, wrath',
    meaning: 'those who earned anger',
    note: 'Passive participle — "those upon whom anger has fallen." Classical tafsir identifies the principle: those who knew the truth and rejected it, choosing against it knowingly.',
  },
  {
    position: 27,
    arabic: 'عَلَيْهِمْ',
    transliteration: 'ʿalayhim',
    meaning: 'upon them',
    note: 'See word 24. The repetition keeps the structure parallel.',
  },
  {
    position: 28,
    arabic: 'وَلَا',
    transliteration: 'wa lā',
    meaning: 'and not [the path of]',
    note: 'Conjunction "wa" (and) + negation particle "lā" (not). Connects the second category we ask to avoid.',
  },
  {
    position: 29,
    arabic: 'الضَّالِّينَ',
    transliteration: 'ḍ-ḍāllīn',
    root: 'ض ل ل',
    rootMeaning: 'to stray, to wander, to be lost',
    meaning: 'those who are astray',
    note: 'Active participle, plural — "those who wander." The classical principle: those who sought truth but missed it, through ignorance or misguided sincerity. The Fatihah ends by drawing both lines clearly: knowing-and-refusing, and seeking-and-missing.',
  },
];

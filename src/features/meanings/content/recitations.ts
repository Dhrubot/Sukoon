// Prayer-flow recitations — phrase-level meanings.
//
// 13 items spoken in salah, in canonical order from istiftah to taslim.
// Order numbers 1–3 and 14–23 are recitations; 4–13 are reserved for the
// short surahs that sit between Fatihah and the takbir into ruku.
//
// English translations: Saheeh International (2010) where the text is
// Quranic; for hadith-derived recitations, English follows the published
// renderings in Sahih al-Bukhari / Sahih Muslim (Darussalam editions).
// Reflections are original — invitation tone, never grading.

import type { Meaning } from './schema';
import fatihahAudio from '../assets/audio/fatihah.m4a';

export const PRAYER_RECITATIONS: Meaning[] = [
  // ─── 1. Opening dua (du'a al-istiftah) ───────────────────────────────
  {
    id: 'dua-istiftah',
    position: 'opening',
    order: 1,
    title: "Du'a al-Istiftah",
    arabic:
      'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ',
    transliteration:
      "Subḥānaka llāhumma wa bi-ḥamdika, wa tabāraka smuka, wa taʿālā jadduka, wa lā ilāha ghayruk.",
    audioAsset: null,
    translations: {
      en: {
        translation:
          'Glory is to You, O Allah, and praise. Blessed is Your Name and exalted is Your Majesty. There is no god worthy of worship except You.',
        reflection:
          'Before Al-Fatihah, before any request — this opening dua is pure declaration. You are not yet asking; you are telling your Lord who He is. Notice how it ends with the shahada in compact form: "lā ilāha ghayruk" — none worthy of worship but You. The shape of khushuʿ begins with remembering whose presence you have just entered.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Abu Dawud 776, At-Tirmidhi 243',
      translation: 'Darussalam, Sunan Abu Dawud (translated edition)',
    },
  },

  // ─── 2. Ta'awwudh ────────────────────────────────────────────────────
  {
    id: 'taawwudh',
    position: 'opening',
    order: 2,
    title: "Ta'awwudh",
    arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration: "Aʿūdhu bi-llāhi mina sh-shayṭāni r-rajīm.",
    audioAsset: null,
    translations: {
      en: {
        translation: 'I seek refuge with Allah from the accursed Satan.',
        reflection:
          'Said quietly before Al-Fatihah. Not a magic phrase — a statement of dependence. The very act of asking Allah\'s protection from the one who whispers distractions is itself the first deflection of those whispers. The Quran commands it (16:98) before recitation. Said with awareness, it sets the heart for what follows.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: "Qur'an 16:98 (commanded); Sahih Muslim 601 (practice)",
      translation: 'Saheeh International, 2010 (Qur\'anic phrasing)',
    },
  },

  // ─── 3. Al-Fatihah ───────────────────────────────────────────────────
  // Bismillah is included as ayah 1 (madhab-neutral — some recite aloud,
  // others silently, but it is part of the surah in both views).
  {
    id: 'fatihah',
    position: 'standing',
    order: 3,
    title: 'Al-Fatihah',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n' +
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\n' +
      'الرَّحْمَٰنِ الرَّحِيمِ\n' +
      'مَالِكِ يَوْمِ الدِّينِ\n' +
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ\n' +
      'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ\n' +
      'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    transliteration:
      'Bismi llāhi r-Raḥmāni r-Raḥīm.\n' +
      "Al-ḥamdu li-llāhi rabbi l-ʿālamīn.\n" +
      'Ar-Raḥmāni r-Raḥīm.\n' +
      'Māliki yawmi d-dīn.\n' +
      "Iyyāka naʿbudu wa iyyāka nastaʿīn.\n" +
      "Ihdinā ṣ-ṣirāṭa l-mustaqīm.\n" +
      'Ṣirāṭa lladhīna anʿamta ʿalayhim, ghayri l-maghḍūbi ʿalayhim wa lā ḍ-ḍāllīn.',
    audioAsset: fatihahAudio,
    translations: {
      en: {
        translation:
          'In the name of Allah, the Entirely Merciful, the Especially Merciful. [All] praise is [due] to Allah, Lord of the worlds — the Entirely Merciful, the Especially Merciful, Sovereign of the Day of Recompense. It is You we worship and You we ask for help. Guide us to the straight path — the path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.',
        reflection:
          'Recited seventeen times a day, Al-Fatihah is the only surah Allah designed as a conversation. A hadith Qudsi describes Allah responding line-by-line as you recite: when you say "Al-ḥamdu li-llāhi rabbi l-ʿālamīn," He says "My servant has praised Me." The first half is praise; the second half is request. Notice the ordering — you ask for guidance only after acknowledging who you are speaking to and what you owe Him. The shape itself is a teaching.',
      },
    },
    source: {
      arabic: 'mushaf',
      arabicReference: "Qur'an 1:1–7 (Al-Fatihah)",
      translation: 'Saheeh International, 2010',
    },
  },

  // Orders 4–13 are short surahs (see shortSurahs.ts).

  // ─── 14. Takbir transitions ──────────────────────────────────────────
  {
    id: 'takbir-transition',
    position: 'transition',
    order: 14,
    title: 'Takbir',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allāhu akbar.',
    audioAsset: null,
    translations: {
      en: {
        translation: 'Allah is the Greatest.',
        reflection:
          'Said five or more times in every rakʿah — entering ruku, rising, descending to sujood, sitting, returning to sujood. "Akbar" is the comparative form: greater than. Greater than what you walked away from, greater than what is pulling at your mind, greater than the prayer itself. Each takbir is a fresh chance to remember the comparison.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Mutawatir (Sahih al-Bukhari 803, Sahih Muslim 392)',
      translation: 'Darussalam',
    },
  },

  // ─── 15. Tasbih in Ruku ──────────────────────────────────────────────
  {
    id: 'tasbih-ruku',
    position: 'ruku',
    order: 15,
    title: 'Tasbih in Ruku',
    arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيمِ',
    transliteration: 'Subḥāna rabbiya l-ʿaẓīm.',
    audioAsset: null,
    recommendedReps: 3,
    translations: {
      en: {
        translation: 'Glory is to my Lord, the Most Great.',
        reflection:
          'In ruku — your body bent, hands on knees, head level with your back — you declare your Lord above any imperfection. The position itself is humility; the words make it spoken. Said three times, slowly. Each repetition is meant to deepen, not just count. If your back is bowed but your mind is elsewhere, this is precisely where to return.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Abu Dawud 869, At-Tirmidhi 261',
      translation: 'Darussalam',
    },
  },

  // ─── 16. Sami'allahu liman hamidah ───────────────────────────────────
  {
    id: 'sami-allahu',
    position: 'rising',
    order: 16,
    title: "Samiʿa llāhu liman ḥamidah",
    arabic: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ',
    transliteration: 'Samiʿa llāhu liman ḥamidah.',
    audioAsset: null,
    translations: {
      en: {
        translation: 'Allah hears whoever praises Him.',
        reflection:
          'Said as you rise from ruku. The wording is not "Allah, listen to me" — it is a quiet declaration that Allah has already heard. He hears the one who praises Him. You have just been praising in ruku; now, rising, you are reassured that the praise was received.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Sahih al-Bukhari 689',
      translation: 'Darussalam',
    },
  },

  // ─── 17. Rabbana wa lakal hamd ───────────────────────────────────────
  {
    id: 'rabbana-wa-lakal-hamd',
    position: 'rising',
    order: 17,
    title: 'Rabbana wa laka l-hamd',
    arabic: 'رَبَّنَا وَلَكَ الْحَمْدُ',
    transliteration: 'Rabbanā wa laka l-ḥamd.',
    audioAsset: null,
    translations: {
      en: {
        translation: 'Our Lord, and to You is praise.',
        reflection:
          'The reply to "Allah hears whoever praises Him." In one short phrase you both acknowledge the relationship — "Our Lord" — and offer the praise He hears. Worth pausing for the "wa" (and): it implies continuity, as if the praise was already flowing before you said the words.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Sahih al-Bukhari 689',
      translation: 'Darussalam',
    },
  },

  // ─── 18. Tasbih in Sujood ────────────────────────────────────────────
  {
    id: 'tasbih-sujood',
    position: 'sujood',
    order: 18,
    title: 'Tasbih in Sujood',
    arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى',
    transliteration: 'Subḥāna rabbiya l-aʿlā.',
    audioAsset: null,
    recommendedReps: 3,
    translations: {
      en: {
        translation: 'Glory is to my Lord, the Most High.',
        reflection:
          'Said in sujood — face on the ground, the lowest position your body takes — you declare your Lord the Highest. The contrast is the lesson. The closer you are to the earth, the more sharply you sense who is above. Of all postures in salah, sujood is described in hadith as "the position closest to Allah." Say it three times, slowly, where the body has placed you to say it.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Abu Dawud 870, At-Tirmidhi 262',
      translation: 'Darussalam',
    },
  },

  // ─── 19. Rabbi-ghfir-li (between the two sajdahs) ────────────────────
  {
    id: 'rabbi-ghfir-li',
    position: 'between_sajdahs',
    order: 19,
    title: 'Rabbi-ghfir lī',
    arabic: 'رَبِّ اغْفِرْ لِي',
    transliteration: 'Rabbi-ghfir lī.',
    audioAsset: null,
    recommendedReps: 3,
    translations: {
      en: {
        translation: 'My Lord, forgive me.',
        reflection:
          'Said while sitting briefly between the two sajdahs. The shortest dua of the prayer, and one of the most repeated by the Prophet ﷺ in private. Notice the bare directness: "My Lord" — possessive, intimate — and a single request. No long preamble. In the brief moment between two prostrations, you ask for the one thing every servant always needs.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Abu Dawud 850, Ibn Majah 897',
      translation: 'Darussalam',
    },
  },

  // ─── 20. Tashahhud ───────────────────────────────────────────────────
  {
    id: 'tashahhud',
    position: 'sitting',
    order: 20,
    title: 'Tashahhud',
    arabic:
      'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration:
      "At-taḥiyyātu li-llāhi wa ṣ-ṣalawātu wa ṭ-ṭayyibāt. As-salāmu ʿalayka ayyuha n-nabiyyu wa raḥmatu llāhi wa barakātuh. As-salāmu ʿalaynā wa ʿalā ʿibādi llāhi ṣ-ṣāliḥīn. Ashhadu an lā ilāha illā llāh, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh.",
    audioAsset: null,
    translations: {
      en: {
        translation:
          'All greetings, prayers, and good things are for Allah. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that there is no god but Allah, and I bear witness that Muhammad is His servant and messenger.',
        reflection:
          'The tashahhud carries a story: when the Prophet ﷺ ascended to the heavens, the greeting exchanged between him and Allah forms the opening lines. "All greetings are for Allah" — His response. "Peace be upon you, O Prophet" — Allah greeting him. The Prophet ﷺ then included all believers — "Peace upon us and the righteous servants" — bringing his community into that exchange. To recite it is to step into a conversation that happened above the seven heavens.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Sahih al-Bukhari 6265 (Ibn Masʿud)',
      translation: 'Darussalam',
    },
  },

  // ─── 21. Salawat Ibrahimiyyah ────────────────────────────────────────
  {
    id: 'salawat-ibrahimiyyah',
    position: 'sitting',
    order: 21,
    title: 'Salawat Ibrahimiyyah',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration:
      "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka ḥamīdun majīd.",
    audioAsset: null,
    translations: {
      en: {
        translation:
          'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrāhīm and the family of Ibrāhīm. Indeed, You are Praiseworthy and Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrāhīm and the family of Ibrāhīm. Indeed, You are Praiseworthy and Glorious.',
        reflection:
          'Asked of Allah, not of the Prophet ﷺ: "O Allah, send prayers upon..." — we are the requesters; Allah is the one who blesses. The comparison to Ibrāhīm reaches back across millennia, binding the prayer of every Muslim today to the line of prophets whose call we continue. To send salawat is to acknowledge: we did not invent this, we received it.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Sahih al-Bukhari 3370, Sahih Muslim 405',
      translation: 'Darussalam',
    },
  },

  // ─── 22. Dua before Salam (four refuges) ─────────────────────────────
  {
    id: 'dua-before-salam',
    position: 'sitting',
    order: 22,
    title: 'The Four Refuges',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ عَذَابِ النَّارِ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ',
    transliteration:
      "Allāhumma innī aʿūdhu bika min ʿadhābi l-qabr, wa min ʿadhābi n-nār, wa min fitnati l-maḥyā wa l-mamāt, wa min fitnati l-Masīḥi d-Dajjāl.",
    audioAsset: null,
    translations: {
      en: {
        translation:
          'O Allah, I seek refuge with You from the punishment of the grave, from the punishment of the Fire, from the trials of life and death, and from the trial of the Antichrist.',
        reflection:
          'Recommended after the final tashahhud, before salam. The Prophet ﷺ taught this dua and emphasized it. The four refuges name the gravest things one cannot face alone: what comes after life, what comes after that, what may corrupt this life, and the great deception at the end of time. The prayer closes with the most consequential asks.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Sahih Muslim 588',
      translation: 'Darussalam',
    },
  },

  // ─── 23. Taslim ──────────────────────────────────────────────────────
  {
    id: 'taslim',
    position: 'taslim',
    order: 23,
    title: 'Taslim',
    arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',
    transliteration: 'As-salāmu ʿalaykum wa raḥmatu llāh.',
    audioAsset: null,
    recommendedReps: 2,
    translations: {
      en: {
        translation: 'Peace be upon you and the mercy of Allah.',
        reflection:
          'Spoken twice — once turning the face to the right, once to the left. The prayer that began with the takbir of entering Allah\'s presence ends with the salam of returning to creation. You are greeting whoever is around — the angels at your shoulders, those praying near you, all whom your gaze touches. The world receives you again, and you arrive carrying what the prayer gave you.',
      },
    },
    source: {
      arabic: 'hadith',
      arabicReference: 'Abu Dawud 996, At-Tirmidhi 295',
      translation: 'Darussalam',
    },
  },
];

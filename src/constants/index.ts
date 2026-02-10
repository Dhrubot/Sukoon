// ─── Prayer Registry (single source of truth) ──────────────────
export {
  FARD_PRAYERS,
  OPTIONAL_PRAYERS,
  ALL_PRAYERS,
  FARD_PRAYER_NAMES_LIST,
  PRAYER_NAME_MAP,
  PRAYER_ICON_MAP,
  PRAYER_ARABIC_MAP,
  getPrayerDefinition,
  getAvailablePrayers,
} from './prayerRegistry';
export type { PrayerDefinition, PrayerCategory } from './prayerRegistry';

// ─── Backward-compatible prayer constants (derived from registry) ─
import { PRAYER_NAME_MAP, PRAYER_ICON_MAP } from './prayerRegistry';

export const PRAYER_NAMES = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  } as const;
  
  export const PRAYER_ICONS = {
    fajr: PRAYER_ICON_MAP['fajr'] || '🌅',
    dhuhr: PRAYER_ICON_MAP['dhuhr'] || '☀️',
    asr: PRAYER_ICON_MAP['asr'] || '🌤',
    maghrib: PRAYER_ICON_MAP['maghrib'] || '🌇',
    isha: PRAYER_ICON_MAP['isha'] || '🌙',
  } as const;
  
  export const PRAYER_GRADIENTS = {
    fajr: ['#1a237e', '#3949ab'],
    dhuhr: ['#f57c00', '#ffb74d'],
    asr: ['#ff6f00', '#ffca28'],
    maghrib: ['#c2185b', '#f06292'],
    isha: ['#512da8', '#7e57c2'],
  } as const;
  
  // CALCULATION_METHODS moved to types/index.ts
  
  export const JURISTIC_METHODS = [
    { value: 'Standard', label: 'Standard (Shafi, Maliki, Hanbali)' },
    { value: 'Hanafi', label: 'Hanafi' },
  ] as const;
  
  export const NOTIFICATION_SOUNDS = [
    { value: 'default', label: 'Default' },
    { value: 'adhan', label: 'Adhan' },
    { value: 'beep', label: 'Gentle Beep' },
    { value: 'birds', label: 'Birds' },
  ] as const;
  
  export const ACHIEVEMENTS = [
    {
      id: 'first_prayer',
      name: 'First Step',
      description: 'Complete your first prayer',
      icon: '🌟',
      target: 1,
    },
    {
      id: 'perfect_day',
      name: 'Perfect Day',
      description: 'Complete all 5 prayers in one day',
      icon: '✨',
      target: 5,
    },
    {
      id: 'week_streak',
      name: 'Consistent Week',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      target: 7,
    },
    {
      id: 'month_streak',
      name: 'Steadfast Month',
      description: 'Maintain a 30-day streak',
      icon: '🏆',
      target: 30,
    },
    {
      id: 'mindful_10',
      name: 'Mindful Worshipper',
      description: 'Complete 10 mindfulness sessions',
      icon: '🧘',
      target: 10,
    },
    {
      id: 'reflection_master',
      name: 'Reflection Master',
      description: 'Add reflections to 20 prayers',
      icon: '📝',
      target: 20,
    },
    {
      id: 'fajr_warrior',
      name: 'Fajr Warrior',
      description: 'Pray Fajr on time for 7 days straight',
      icon: '🌅',
      target: 7,
    },
    {
      id: 'night_owl',
      name: 'Night Devotee',
      description: 'Complete Isha with mindfulness 10 times',
      icon: '🌙',
      target: 10,
    },
  ] as const;
  
  export const REFLECTION_PROMPTS = [
    "What are you grateful for in this moment?",
    "What intentions do you bring to this prayer?",
    "How do you hope to connect with Allah today?",
    "What burdens would you like to leave behind?",
    "What blessings have you noticed today?",
    "How can you serve others after this prayer?",
    "What guidance are you seeking?",
    "What positive change can you make today?",
    "How has Allah's mercy touched your life recently?",
    "What acts of kindness have you witnessed or done?",
  ];
  
  export const VERSES = [
    // Prayer
    {
      id: 1,
      arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
      translation: 'Indeed, prayer prohibits immorality and wrongdoing',
      reference: 'Quran 29:45',
      theme: 'prayer',
    },
    {
      id: 2,
      arabic: 'وَأَقِمِ الصَّلَاةَ لِذِكْرِي',
      translation: 'And establish prayer for My remembrance',
      reference: 'Quran 20:14',
      theme: 'prayer',
    },
    {
      id: 3,
      arabic: 'حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ',
      translation: 'Guard strictly your prayers, especially the middle prayer',
      reference: 'Quran 2:238',
      theme: 'prayer',
    },
    {
      id: 4,
      arabic: 'إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا',
      translation: 'Indeed, prayer has been decreed upon the believers at specified times',
      reference: 'Quran 4:103',
      theme: 'prayer',
    },
    {
      id: 5,
      arabic: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ',
      translation: 'Successful indeed are the believers who are humble in their prayers',
      reference: 'Quran 23:1-2',
      theme: 'prayer',
    },
    // Patience
    {
      id: 6,
      arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
      translation: 'And seek help through patience and prayer',
      reference: 'Quran 2:45',
      theme: 'patience',
    },
    {
      id: 7,
      arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
      translation: 'Indeed, Allah is with the patient',
      reference: 'Quran 2:153',
      theme: 'patience',
    },
    {
      id: 8,
      arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
      translation: 'For indeed, with hardship comes ease',
      reference: 'Quran 94:5',
      theme: 'patience',
    },
    {
      id: 9,
      arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
      translation: 'Allah does not burden a soul beyond that it can bear',
      reference: 'Quran 2:286',
      theme: 'patience',
    },
    // Remembrance
    {
      id: 10,
      arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
      translation: 'So remember Me; I will remember you',
      reference: 'Quran 2:152',
      theme: 'remembrance',
    },
    {
      id: 11,
      arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
      translation: 'Verily, in the remembrance of Allah do hearts find rest',
      reference: 'Quran 13:28',
      theme: 'remembrance',
    },
    {
      id: 12,
      arabic: 'وَاذْكُر رَّبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً',
      translation: 'And remember your Lord within yourself in humility and in awe',
      reference: 'Quran 7:205',
      theme: 'remembrance',
    },
    // Gratitude
    {
      id: 13,
      arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ',
      translation: 'If you are grateful, I will surely increase you',
      reference: 'Quran 14:7',
      theme: 'gratitude',
    },
    {
      id: 14,
      arabic: 'وَمَا بِكُم مِّن نِّعْمَةٍ فَمِنَ اللَّهِ',
      translation: 'And whatever blessing you have, it is from Allah',
      reference: 'Quran 16:53',
      theme: 'gratitude',
    },
    // Mercy
    {
      id: 15,
      arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ',
      translation: 'My mercy encompasses all things',
      reference: 'Quran 7:156',
      theme: 'mercy',
    },
    {
      id: 16,
      arabic: 'قُل يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ',
      translation: 'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah',
      reference: 'Quran 39:53',
      theme: 'mercy',
    },
    {
      id: 17,
      arabic: 'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ',
      translation: 'Indeed, Allah loves those who are constantly repentant',
      reference: 'Quran 2:222',
      theme: 'mercy',
    },
    // Taqwa
    {
      id: 18,
      arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا',
      translation: 'And whoever fears Allah, He will make for him a way out',
      reference: 'Quran 65:2',
      theme: 'taqwa',
    },
    {
      id: 19,
      arabic: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ',
      translation: 'Indeed, the most noble of you in the sight of Allah is the most righteous',
      reference: 'Quran 49:13',
      theme: 'taqwa',
    },
    // Dua
    {
      id: 20,
      arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
      translation: 'Our Lord, accept from us. Indeed, You are the Hearing, the Knowing',
      reference: 'Quran 2:127',
      theme: 'dua',
    },
    {
      id: 21,
      arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
      translation: 'And when My servants ask you about Me, indeed I am near',
      reference: 'Quran 2:186',
      theme: 'dua',
    },
    {
      id: 22,
      arabic: 'اُدْعُونِي أَسْتَجِبْ لَكُمْ',
      translation: 'Call upon Me; I will respond to you',
      reference: 'Quran 40:60',
      theme: 'dua',
    },
    // Trust in Allah
    {
      id: 23,
      arabic: 'وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَىٰ بِاللَّهِ وَكِيلًا',
      translation: 'And put your trust in Allah, and sufficient is Allah as a Disposer of affairs',
      reference: 'Quran 33:3',
      theme: 'tawakkul',
    },
    {
      id: 24,
      arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
      translation: 'And whoever puts their trust in Allah, then He is sufficient for them',
      reference: 'Quran 65:3',
      theme: 'tawakkul',
    },
    // Community & kindness
    {
      id: 25,
      arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ',
      translation: 'And cooperate in righteousness and piety',
      reference: 'Quran 5:2',
      theme: 'community',
    },
    // Fajr-specific
    {
      id: 26,
      arabic: 'إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا',
      translation: 'Indeed, the recitation of dawn is ever witnessed',
      reference: 'Quran 17:78',
      theme: 'fajr',
    },
    // Night prayer
    {
      id: 27,
      arabic: 'وَمِنَ اللَّيْلِ فَسَبِّحْهُ وَإِدْبَارَ النُّجُومِ',
      translation: 'And in part of the night, glorify Him, and after the setting of the stars',
      reference: 'Quran 52:49',
      theme: 'night',
    },
    // Purification of the heart
    {
      id: 28,
      arabic: 'قَدْ أَفْلَحَ مَن زَكَّاهَا',
      translation: 'He has succeeded who purifies his soul',
      reference: 'Quran 91:9',
      theme: 'purification',
    },
    // Closeness to Allah
    {
      id: 29,
      arabic: 'وَاسْجُدْ وَاقْتَرِبْ',
      translation: 'Prostrate and draw near to Allah',
      reference: 'Quran 96:19',
      theme: 'prayer',
    },
    {
      id: 30,
      arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ',
      translation: 'And We are closer to him than his jugular vein',
      reference: 'Quran 50:16',
      theme: 'closeness',
    },
    // ─── Additional verses (31–105) ───────────────────────────────
    // Prayer & worship
    {
      id: 31,
      arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ',
      translation: 'And establish prayer and give zakah and bow with those who bow',
      reference: 'Quran 2:43',
      theme: 'prayer',
    },
    {
      id: 32,
      arabic: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ',
      translation: 'Establish prayer at the decline of the sun until the darkness of the night',
      reference: 'Quran 17:78',
      theme: 'prayer',
    },
    {
      id: 33,
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا ارْكَعُوا وَاسْجُدُوا وَاعْبُدُوا رَبَّكُمْ',
      translation: 'O you who believe, bow and prostrate and worship your Lord',
      reference: 'Quran 22:77',
      theme: 'prayer',
    },
    {
      id: 34,
      arabic: 'وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ غُرُوبِهَا',
      translation: 'And glorify your Lord before the rising of the sun and before its setting',
      reference: 'Quran 20:130',
      theme: 'prayer',
    },
    {
      id: 35,
      arabic: 'فَإِذَا قَضَيْتُمُ الصَّلَاةَ فَاذْكُرُوا اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِكُمْ',
      translation: 'When you have completed the prayer, remember Allah standing, sitting, or lying on your sides',
      reference: 'Quran 4:103',
      theme: 'remembrance',
    },
    // Patience & perseverance
    {
      id: 36,
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اصْبِرُوا وَصَابِرُوا وَرَابِطُوا',
      translation: 'O you who believe, persevere and endure and remain stationed',
      reference: 'Quran 3:200',
      theme: 'patience',
    },
    {
      id: 37,
      arabic: 'وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ',
      translation: 'And We will surely test you with something of fear and hunger',
      reference: 'Quran 2:155',
      theme: 'patience',
    },
    {
      id: 38,
      arabic: 'وَبَشِّرِ الصَّابِرِينَ',
      translation: 'And give good tidings to the patient',
      reference: 'Quran 2:155',
      theme: 'patience',
    },
    {
      id: 39,
      arabic: 'إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ',
      translation: 'Indeed, the patient will be given their reward without account',
      reference: 'Quran 39:10',
      theme: 'patience',
    },
    {
      id: 40,
      arabic: 'فَاصْبِرْ إِنَّ وَعْدَ اللَّهِ حَقٌّ',
      translation: 'So be patient; indeed, the promise of Allah is truth',
      reference: 'Quran 30:60',
      theme: 'patience',
    },
    // Remembrance & dhikr
    {
      id: 41,
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا',
      translation: 'O you who believe, remember Allah with much remembrance',
      reference: 'Quran 33:41',
      theme: 'remembrance',
    },
    {
      id: 42,
      arabic: 'وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا',
      translation: 'And exalt Him morning and afternoon',
      reference: 'Quran 33:42',
      theme: 'remembrance',
    },
    {
      id: 43,
      arabic: 'وَلَذِكْرُ اللَّهِ أَكْبَرُ',
      translation: 'And the remembrance of Allah is greater',
      reference: 'Quran 29:45',
      theme: 'remembrance',
    },
    {
      id: 44,
      arabic: 'وَاذْكُر رَّبَّكَ كَثِيرًا وَسَبِّحْ بِالْعَشِيِّ وَالْإِبْكَارِ',
      translation: 'And remember your Lord much and exalt Him in the evening and the morning',
      reference: 'Quran 3:41',
      theme: 'remembrance',
    },
    {
      id: 45,
      arabic: 'وَاذْكُرُوا اللَّهَ كَثِيرًا لَّعَلَّكُمْ تُفْلِحُونَ',
      translation: 'And remember Allah often that you may succeed',
      reference: 'Quran 62:10',
      theme: 'remembrance',
    },
    // Gratitude
    {
      id: 46,
      arabic: 'وَقَلِيلٌ مِّنْ عِبَادِيَ الشَّكُورُ',
      translation: 'And few of My servants are grateful',
      reference: 'Quran 34:13',
      theme: 'gratitude',
    },
    {
      id: 47,
      arabic: 'فَكُلُوا مِمَّا رَزَقَكُمُ اللَّهُ حَلَالًا طَيِّبًا وَاشْكُرُوا نِعْمَتَ اللَّهِ',
      translation: 'So eat of what Allah has provided for you, lawful and good, and be grateful for the favor of Allah',
      reference: 'Quran 16:114',
      theme: 'gratitude',
    },
    {
      id: 48,
      arabic: 'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ',
      translation: 'If you are grateful, I will surely increase you; but if you deny, indeed, My punishment is severe',
      reference: 'Quran 14:7',
      theme: 'gratitude',
    },
    // Mercy & forgiveness
    {
      id: 49,
      arabic: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',
      translation: 'And We have not sent you except as a mercy to the worlds',
      reference: 'Quran 21:107',
      theme: 'mercy',
    },
    {
      id: 50,
      arabic: 'كَتَبَ رَبُّكُمْ عَلَىٰ نَفْسِهِ الرَّحْمَةَ',
      translation: 'Your Lord has decreed upon Himself mercy',
      reference: 'Quran 6:54',
      theme: 'mercy',
    },
    {
      id: 51,
      arabic: 'وَاسْتَغْفِرُوا رَبَّكُمْ ثُمَّ تُوبُوا إِلَيْهِ إِنَّ رَبِّي رَحِيمٌ وَدُودٌ',
      translation: 'And ask forgiveness of your Lord and repent to Him. Indeed, my Lord is Merciful and Loving',
      reference: 'Quran 11:90',
      theme: 'mercy',
    },
    {
      id: 52,
      arabic: 'إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا',
      translation: 'Indeed, Allah forgives all sins',
      reference: 'Quran 39:53',
      theme: 'mercy',
    },
    {
      id: 53,
      arabic: 'وَهُوَ الْغَفُورُ الْوَدُودُ',
      translation: 'And He is the Forgiving, the Affectionate',
      reference: 'Quran 85:14',
      theme: 'mercy',
    },
    // Taqwa & righteousness
    {
      id: 54,
      arabic: 'وَتَزَوَّدُوا فَإِنَّ خَيْرَ الزَّادِ التَّقْوَىٰ',
      translation: 'And take provisions, but indeed, the best provision is taqwa',
      reference: 'Quran 2:197',
      theme: 'taqwa',
    },
    {
      id: 55,
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ',
      translation: 'O you who believe, fear Allah as He should be feared',
      reference: 'Quran 3:102',
      theme: 'taqwa',
    },
    {
      id: 56,
      arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مِنْ أَمْرِهِ يُسْرًا',
      translation: 'And whoever fears Allah, He will make for him ease in his affair',
      reference: 'Quran 65:4',
      theme: 'taqwa',
    },
    // Dua & supplication
    {
      id: 57,
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
      translation: 'Our Lord, give us good in this world and good in the Hereafter',
      reference: 'Quran 2:201',
      theme: 'dua',
    },
    {
      id: 58,
      arabic: 'رَبِّ زِدْنِي عِلْمًا',
      translation: 'My Lord, increase me in knowledge',
      reference: 'Quran 20:114',
      theme: 'dua',
    },
    {
      id: 59,
      arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ',
      translation: 'Our Lord, grant us from our spouses and offspring comfort to our eyes',
      reference: 'Quran 25:74',
      theme: 'dua',
    },
    {
      id: 60,
      arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي',
      translation: 'My Lord, make me an establisher of prayer, and from my descendants',
      reference: 'Quran 14:40',
      theme: 'dua',
    },
    {
      id: 61,
      arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
      translation: 'Our Lord, forgive me and my parents and the believers on the Day the account is established',
      reference: 'Quran 14:41',
      theme: 'dua',
    },
    // Tawakkul — trust in Allah
    {
      id: 62,
      arabic: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ',
      translation: 'And when you have decided, then rely upon Allah',
      reference: 'Quran 3:159',
      theme: 'tawakkul',
    },
    {
      id: 63,
      arabic: 'وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ',
      translation: 'And upon Allah let the believers rely',
      reference: 'Quran 3:122',
      theme: 'tawakkul',
    },
    {
      id: 64,
      arabic: 'قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا',
      translation: 'Say: Nothing will befall us except what Allah has decreed for us',
      reference: 'Quran 9:51',
      theme: 'tawakkul',
    },
    // Fajr & dawn
    {
      id: 65,
      arabic: 'وَالْفَجْرِ وَلَيَالٍ عَشْرٍ',
      translation: 'By the dawn and the ten nights',
      reference: 'Quran 89:1-2',
      theme: 'fajr',
    },
    {
      id: 66,
      arabic: 'وَالصُّبْحِ إِذَا تَنَفَّسَ',
      translation: 'And by the dawn when it breathes',
      reference: 'Quran 81:18',
      theme: 'fajr',
    },
    {
      id: 67,
      arabic: 'فَسُبْحَانَ اللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ',
      translation: 'So exalted is Allah when you reach the evening and when you reach the morning',
      reference: 'Quran 30:17',
      theme: 'fajr',
    },
    // Night & Isha
    {
      id: 68,
      arabic: 'وَمِنَ اللَّيْلِ فَتَهَجَّدْ بِهِ نَافِلَةً لَّكَ',
      translation: 'And from part of the night, pray with it as additional worship for you',
      reference: 'Quran 17:79',
      theme: 'night',
    },
    {
      id: 69,
      arabic: 'إِنَّ نَاشِئَةَ اللَّيْلِ هِيَ أَشَدُّ وَطْئًا وَأَقْوَمُ قِيلًا',
      translation: 'Indeed, the hours of the night are more effective and more suitable for recitation',
      reference: 'Quran 73:6',
      theme: 'night',
    },
    {
      id: 70,
      arabic: 'وَاللَّيْلِ إِذَا يَغْشَىٰ',
      translation: 'By the night when it covers',
      reference: 'Quran 92:1',
      theme: 'night',
    },
    // Purification & sincerity
    {
      id: 71,
      arabic: 'قَدْ أَفْلَحَ مَن تَزَكَّىٰ وَذَكَرَ اسْمَ رَبِّهِ فَصَلَّىٰ',
      translation: 'He has certainly succeeded who purifies himself and remembers the name of his Lord and prays',
      reference: 'Quran 87:14-15',
      theme: 'purification',
    },
    {
      id: 72,
      arabic: 'وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ مُخْلِصِينَ لَهُ الدِّينَ',
      translation: 'And they were not commanded except to worship Allah, sincere to Him in religion',
      reference: 'Quran 98:5',
      theme: 'sincerity',
    },
    {
      id: 73,
      arabic: 'قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ',
      translation: 'Say: Indeed, my prayer, my rites, my living and my dying are for Allah, Lord of the worlds',
      reference: 'Quran 6:162',
      theme: 'sincerity',
    },
    // Knowledge & reflection
    {
      id: 74,
      arabic: 'أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ',
      translation: 'Then do they not reflect upon the Quran?',
      reference: 'Quran 4:82',
      theme: 'knowledge',
    },
    {
      id: 75,
      arabic: 'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ',
      translation: 'Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding',
      reference: 'Quran 3:190',
      theme: 'knowledge',
    },
    {
      id: 76,
      arabic: 'هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ',
      translation: 'Are those who know equal to those who do not know?',
      reference: 'Quran 39:9',
      theme: 'knowledge',
    },
    {
      id: 77,
      arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
      translation: 'Read in the name of your Lord who created',
      reference: 'Quran 96:1',
      theme: 'knowledge',
    },
    // Charity & generosity
    {
      id: 78,
      arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ',
      translation: 'The example of those who spend in the way of Allah is like a seed which grows seven ears',
      reference: 'Quran 2:261',
      theme: 'charity',
    },
    {
      id: 79,
      arabic: 'لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ',
      translation: 'Never will you attain righteousness until you spend from that which you love',
      reference: 'Quran 3:92',
      theme: 'charity',
    },
    {
      id: 80,
      arabic: 'وَأَنفِقُوا فِي سَبِيلِ اللَّهِ وَلَا تُلْقُوا بِأَيْدِيكُمْ إِلَى التَّهْلُكَةِ وَأَحْسِنُوا',
      translation: 'And spend in the way of Allah and do not throw yourselves into destruction, and do good',
      reference: 'Quran 2:195',
      theme: 'charity',
    },
    // Family & parents
    {
      id: 81,
      arabic: 'وَوَصَّيْنَا الْإِنسَانَ بِوَالِدَيْهِ حُسْنًا',
      translation: 'And We have enjoined upon man goodness to parents',
      reference: 'Quran 29:8',
      theme: 'family',
    },
    {
      id: 82,
      arabic: 'وَاخْفِضْ لَهُمَا جَنَاحَ الذُّلِّ مِنَ الرَّحْمَةِ',
      translation: 'And lower to them the wing of humility out of mercy',
      reference: 'Quran 17:24',
      theme: 'family',
    },
    {
      id: 83,
      arabic: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      translation: 'And say: My Lord, have mercy upon them as they brought me up when I was small',
      reference: 'Quran 17:24',
      theme: 'family',
    },
    // Community & brotherhood
    {
      id: 84,
      arabic: 'إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ',
      translation: 'The believers are but brothers',
      reference: 'Quran 49:10',
      theme: 'community',
    },
    {
      id: 85,
      arabic: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا',
      translation: 'And hold firmly to the rope of Allah all together and do not become divided',
      reference: 'Quran 3:103',
      theme: 'community',
    },
    // Modesty & character
    {
      id: 86,
      arabic: 'وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا',
      translation: 'And the servants of the Most Merciful are those who walk upon the earth in humility',
      reference: 'Quran 25:63',
      theme: 'character',
    },
    {
      id: 87,
      arabic: 'وَإِذَا خَاطَبَهُمُ الْجَاهِلُونَ قَالُوا سَلَامًا',
      translation: 'And when the ignorant address them, they say words of peace',
      reference: 'Quran 25:63',
      theme: 'character',
    },
    {
      id: 88,
      arabic: 'إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ',
      translation: 'Indeed, Allah orders justice and good conduct',
      reference: 'Quran 16:90',
      theme: 'character',
    },
    {
      id: 89,
      arabic: 'وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا',
      translation: 'And do not walk upon the earth with arrogance',
      reference: 'Quran 17:37',
      theme: 'character',
    },
    // Ramadan & fasting
    {
      id: 90,
      arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ',
      translation: 'The month of Ramadan in which was revealed the Quran, a guidance for the people',
      reference: 'Quran 2:185',
      theme: 'ramadan',
    },
    {
      id: 91,
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ',
      translation: 'O you who believe, decreed upon you is fasting as it was decreed upon those before you that you may become righteous',
      reference: 'Quran 2:183',
      theme: 'ramadan',
    },
    {
      id: 92,
      arabic: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ',
      translation: 'Indeed, We sent it down during the Night of Decree',
      reference: 'Quran 97:1',
      theme: 'ramadan',
    },
    {
      id: 93,
      arabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ',
      translation: 'The Night of Decree is better than a thousand months',
      reference: 'Quran 97:3',
      theme: 'ramadan',
    },
    // Death & akhirah — perspective
    {
      id: 94,
      arabic: 'كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ',
      translation: 'Every soul will taste death',
      reference: 'Quran 3:185',
      theme: 'akhirah',
    },
    {
      id: 95,
      arabic: 'يَا أَيُّهَا الْإِنسَانُ إِنَّكَ كَادِحٌ إِلَىٰ رَبِّكَ كَدْحًا فَمُلَاقِيهِ',
      translation: 'O mankind, indeed you are laboring toward your Lord and you will meet Him',
      reference: 'Quran 84:6',
      theme: 'akhirah',
    },
    {
      id: 96,
      arabic: 'وَمَا الْحَيَاةُ الدُّنْيَا إِلَّا مَتَاعُ الْغُرُورِ',
      translation: 'And the worldly life is not but the enjoyment of delusion',
      reference: 'Quran 3:185',
      theme: 'akhirah',
    },
    // Nature & signs of Allah
    {
      id: 97,
      arabic: 'وَفِي الْأَرْضِ آيَاتٌ لِّلْمُوقِنِينَ وَفِي أَنفُسِكُمْ أَفَلَا تُبْصِرُونَ',
      translation: 'And on the earth are signs for the certain, and in yourselves. Then will you not see?',
      reference: 'Quran 51:20-21',
      theme: 'knowledge',
    },
    {
      id: 98,
      arabic: 'سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ',
      translation: 'We will show them Our signs in the horizons and within themselves',
      reference: 'Quran 41:53',
      theme: 'knowledge',
    },
    // Hope
    {
      id: 99,
      arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
      translation: 'Indeed, with hardship will be ease',
      reference: 'Quran 94:6',
      theme: 'patience',
    },
    {
      id: 100,
      arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
      translation: 'And your Lord is going to give you, and you will be satisfied',
      reference: 'Quran 93:5',
      theme: 'mercy',
    },
    // Peace & tranquility
    {
      id: 101,
      arabic: 'هُوَ الَّذِي أَنزَلَ السَّكِينَةَ فِي قُلُوبِ الْمُؤْمِنِينَ',
      translation: 'It is He who sent down tranquility into the hearts of the believers',
      reference: 'Quran 48:4',
      theme: 'peace',
    },
    {
      id: 102,
      arabic: 'وَاللَّهُ يَدْعُو إِلَىٰ دَارِ السَّلَامِ',
      translation: 'And Allah invites to the Home of Peace',
      reference: 'Quran 10:25',
      theme: 'peace',
    },
    // Light & guidance
    {
      id: 103,
      arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ',
      translation: 'Allah is the Light of the heavens and the earth',
      reference: 'Quran 24:35',
      theme: 'guidance',
    },
    {
      id: 104,
      arabic: 'يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ',
      translation: 'Allah guides to His light whom He wills',
      reference: 'Quran 24:35',
      theme: 'guidance',
    },
    {
      id: 105,
      arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ',
      translation: 'This is the Book about which there is no doubt, a guidance for those conscious of Allah',
      reference: 'Quran 2:2',
      theme: 'guidance',
    },
  ];
  
  export const DUAS = [
    {
      id: 1,
      title: 'Opening Supplication',
      arabic: 'اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ',
      translation: 'O Allah, distance me from my sins',
      occasion: 'before_prayer',
    },
    {
      id: 2,
      title: 'Seeking Forgiveness',
      arabic: 'أَسْتَغْفِرُ اللَّهَ أَسْتَغْفِرُ اللَّهَ أَسْتَغْفِرُ اللَّهَ',
      translation: 'I seek forgiveness from Allah (three times)',
      occasion: 'after_prayer',
    },
    {
      id: 3,
      title: 'Morning Remembrance',
      arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
      translation: 'We have entered the morning and the dominion belongs to Allah',
      occasion: 'morning',
    },
    {
      id: 4,
      title: 'Evening Remembrance',
      arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
      translation: 'We have entered the evening and the dominion belongs to Allah',
      occasion: 'evening',
    },
    {
      id: 5,
      title: 'Before Fajr',
      arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
      translation: 'O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds',
      occasion: 'fajr',
    },
    {
      id: 6,
      title: 'Guidance',
      arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
      translation: 'My Lord, expand for me my chest and ease for me my task',
      occasion: 'before_prayer',
    },
    {
      id: 7,
      title: 'Gratitude',
      arabic: 'اللَّهُمَّ أَعِنِّي عَلَىٰ ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
      translation: 'O Allah, help me to remember You, be grateful to You, and worship You well',
      occasion: 'after_prayer',
    },
    {
      id: 8,
      title: 'Protection',
      arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلَا فِي السَّمَاءِ',
      translation: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm',
      occasion: 'morning',
    },
    {
      id: 9,
      title: 'Before Sleep',
      arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
      translation: 'In Your name, O Allah, I die and I live',
      occasion: 'evening',
    },
    {
      id: 10,
      title: 'Steadfastness',
      arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا',
      translation: 'Our Lord, do not let our hearts deviate after You have guided us',
      occasion: 'after_prayer',
    },
  ];
  
  // Animation durations
  export const ANIMATION_DURATION = {
    fast: 200,
    normal: 300,
    slow: 500,
  } as const;
  
  // Storage keys
  export const STORAGE_KEYS = {
    USER_SETTINGS: 'user_settings',
    PRAYER_RECORDS: 'prayer_records',
    ACHIEVEMENTS: 'achievements',
    STREAKS: 'streaks',
    FIRST_LAUNCH: 'first_launch',
  } as const;
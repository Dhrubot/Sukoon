export const PRAYER_NAMES = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  } as const;
  
  export const PRAYER_ICONS = {
    fajr: '🌅',
    dhuhr: '☀️',
    asr: '🌤',
    maghrib: '🌇',
    isha: '🌙',
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
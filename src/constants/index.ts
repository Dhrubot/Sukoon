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
  
  export const CALCULATION_METHODS = [
    { value: 'MWL', label: 'Muslim World League' },
    { value: 'ISNA', label: 'Islamic Society of North America' },
    { value: 'Egypt', label: 'Egyptian General Authority' },
    { value: 'Makkah', label: 'Umm al-Qura, Makkah' },
    { value: 'Karachi', label: 'University of Islamic Sciences' },
    { value: 'Tehran', label: 'Institute of Geophysics, Tehran' },
    { value: 'Jafari', label: 'Shia Ithna Ashari' },
  ] as const;
  
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
    {
      id: 1,
      arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
      translation: 'Indeed, prayer prohibits immorality and wrongdoing',
      reference: 'Quran 29:45',
      theme: 'prayer',
    },
    {
      id: 2,
      arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
      translation: 'And seek help through patience and prayer',
      reference: 'Quran 2:45',
      theme: 'patience',
    },
    {
      id: 3,
      arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
      translation: 'Indeed, Allah is with the patient',
      reference: 'Quran 2:153',
      theme: 'patience',
    },
    {
      id: 4,
      arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
      translation: 'So remember Me; I will remember you',
      reference: 'Quran 2:152',
      theme: 'remembrance',
    },
    {
      id: 5,
      arabic: 'وَأَقِمِ الصَّلَاةَ لِذِكْرِي',
      translation: 'And establish prayer for My remembrance',
      reference: 'Quran 20:14',
      theme: 'prayer',
    },
    {
      id: 6,
      arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
      translation: 'Our Lord, accept from us. Indeed, You are the Hearing, the Knowing',
      reference: 'Quran 2:127',
      theme: 'dua',
    },
  ];
  
  export const DUAS = [
    {
      id: 1,
      title: 'Before Prayer',
      arabic: 'اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ',
      translation: 'O Allah, distance me from my sins',
      occasion: 'before_prayer',
    },
    {
      id: 2,
      title: 'After Prayer',
      arabic: 'أَسْتَغْفِرُ اللَّهَ',
      translation: 'I seek forgiveness from Allah',
      occasion: 'after_prayer',
    },
    {
      id: 3,
      title: 'Morning Remembrance',
      arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
      translation: 'We have entered the morning and the dominion belongs to Allah',
      occasion: 'morning',
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
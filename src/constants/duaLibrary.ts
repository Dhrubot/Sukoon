// src/constants/duaLibrary.ts
//
// Hisnul Muslim Dua Library — categorized, authentic duas with Arabic,
// transliteration, translation, and hadith/Quran references.

export type DuaCategory =
  | 'before_prayer'
  | 'after_prayer'
  | 'morning'
  | 'evening'
  | 'protection'
  | 'forgiveness'
  | 'guidance'
  | 'travel'
  | 'eating'
  | 'sleeping'
  | 'distress'
  | 'gratitude'
  | 'parents'
  | 'rain'
  | 'entering_mosque'
  | 'leaving_mosque';

export interface Dua {
  id: number;
  category: DuaCategory;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  occasion: string[];
}

export const DUA_CATEGORIES: { key: DuaCategory; label: string }[] = [
  { key: 'before_prayer', label: 'Before Prayer' },
  { key: 'after_prayer', label: 'After Prayer' },
  { key: 'morning', label: 'Morning' },
  { key: 'evening', label: 'Evening' },
  { key: 'protection', label: 'Protection' },
  { key: 'forgiveness', label: 'Forgiveness' },
  { key: 'guidance', label: 'Guidance' },
  { key: 'travel', label: 'Travel' },
  { key: 'eating', label: 'Eating' },
  { key: 'sleeping', label: 'Sleeping' },
  { key: 'distress', label: 'Distress' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'parents', label: 'Parents' },
  { key: 'rain', label: 'Rain' },
  { key: 'entering_mosque', label: 'Entering Mosque' },
  { key: 'leaving_mosque', label: 'Leaving Mosque' },
];

export const DUA_LIBRARY: Dua[] = [
  // ─── Before Prayer ─────────────────────────────────────────────────
  {
    id: 1,
    category: 'before_prayer',
    arabic: 'اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ',
    transliteration: "Allaahumma baa'id baynee wa bayna khataayaaya kamaa baa'adta baynal-mashriqi wal-maghrib.",
    translation: 'O Allah, distance me from my sins as You have distanced the East from the West.',
    reference: 'Sahih Al-Bukhari 744, Sahih Muslim 598',
    occasion: ['before_prayer'],
  },
  {
    id: 2,
    category: 'before_prayer',
    arabic: 'اللَّهُمَّ نَقِّنِي مِنْ خَطَايَايَ كَمَا يُنَقَّى الثَّوْبُ الْأَبْيَضُ مِنَ الدَّنَسِ',
    transliteration: 'Allaahumma naqqinee min khataayaaya kamaa yunaqqath-thawbul-abyadhu minad-danas.',
    translation: 'O Allah, cleanse me of my sins as a white garment is cleansed of filth.',
    reference: 'Sahih Al-Bukhari 744, Sahih Muslim 598',
    occasion: ['before_prayer'],
  },
  {
    id: 3,
    category: 'before_prayer',
    arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَىٰ جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ',
    transliteration: "SubhaanakAllaahumma wa bihamdika, wa tabaarakasmuka, wa ta'aalaa jadduka, wa laa ilaaha ghayruka.",
    translation: 'Glory be to You, O Allah, and praise be to You. Blessed is Your Name and Exalted is Your Majesty. There is no god but You.',
    reference: 'Abu Dawud 775, At-Tirmidhi 243',
    occasion: ['before_prayer'],
  },
  {
    id: 4,
    category: 'before_prayer',
    arabic: 'وَجَّهْتُ وَجْهِيَ لِلَّذِي فَطَرَ السَّمَاوَاتِ وَالْأَرْضَ حَنِيفًا وَمَا أَنَا مِنَ الْمُشْرِكِينَ',
    transliteration: "Wajjahtu wajhiya lillazee fataras-samaawaati wal-arda haneefaw-wa maa ana minal-mushrikeen.",
    translation: 'I have turned my face to the One who created the heavens and the earth, as a pure monotheist, and I am not among those who associate partners with Allah.',
    reference: 'Sahih Muslim 771',
    occasion: ['before_prayer'],
  },

  // ─── After Prayer ──────────────────────────────────────────────────
  {
    id: 5,
    category: 'after_prayer',
    arabic: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullaah, Astaghfirullaah, Astaghfirullaah.',
    translation: 'I seek the forgiveness of Allah (three times).',
    reference: 'Sahih Muslim 591',
    occasion: ['after_prayer'],
  },
  {
    id: 6,
    category: 'after_prayer',
    arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: "Allaahumma Antas-Salaamu wa minkas-salaamu tabaarakta yaa Zal-Jalaali wal-Ikraam.",
    translation: 'O Allah, You are As-Salam and from You is peace. Blessed are You, O Possessor of Majesty and Honor.',
    reference: 'Sahih Muslim 591',
    occasion: ['after_prayer'],
  },
  {
    id: 7,
    category: 'after_prayer',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: "Allaahumma a'innee 'alaa dhikrika wa shukrika wa husni 'ibaadatika.",
    translation: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner.',
    reference: 'Abu Dawud 1522, An-Nasa\'i 1303',
    occasion: ['after_prayer'],
  },
  {
    id: 8,
    category: 'after_prayer',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: "Laa ilaaha ill-Allaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'alaa kulli shay'in Qadeer.",
    translation: 'None has the right to be worshipped except Allah alone, having no partner. To Him belongs all sovereignty and praise, and He is over all things Omnipotent.',
    reference: 'Sahih Al-Bukhari 6330, Sahih Muslim 593',
    occasion: ['after_prayer'],
  },

  // ─── Protection ────────────────────────────────────────────────────
  {
    id: 9,
    category: 'protection',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillaahil-lazee laa yadurru ma'asmihi shay'un fil-ardi wa laa fis-samaa'i, wa Huwas-Samee'ul-'Aleem.",
    translation: 'In the name of Allah with Whose name nothing can harm on earth or in the heavens, and He is the All-Hearing, the All-Knowing.',
    reference: 'Abu Dawud 4/323, At-Tirmidhi 5/465',
    occasion: ['morning', 'evening', 'protection'],
  },
  {
    id: 10,
    category: 'protection',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: "A'oodhu bikalimaatillaahit-taammaati min sharri maa khalaq.",
    translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
    reference: 'Sahih Muslim 2708',
    occasion: ['evening', 'protection', 'travel'],
  },
  {
    id: 11,
    category: 'protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    transliteration: "Allaahumma innee a'oodhu bika minal-hammi wal-hazan, wa a'oodhu bika minal-'ajzi wal-kasal, wa a'oodhu bika minal-jubni wal-bukhl, wa a'oodhu bika min ghalabatid-dayni wa qahrir-rijaal.",
    translation: 'O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice, the burden of debts and from being overpowered by men.',
    reference: 'Sahih Al-Bukhari 7/158',
    occasion: ['distress', 'protection'],
  },
  {
    id: 12,
    category: 'protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ',
    transliteration: "Allaahumma innee a'oodhu bika min 'adhaabil-qabri, wa a'oodhu bika min fitnatil-maseehid-dajjaal, wa a'oodhu bika min fitnatil-mahyaa wal-mamaat.",
    translation: 'O Allah, I seek refuge in You from the punishment of the grave, from the trial of the False Messiah, and from the trials of life and death.',
    reference: 'Sahih Al-Bukhari 1377, Sahih Muslim 588',
    occasion: ['after_prayer', 'protection'],
  },

  // ─── Forgiveness ───────────────────────────────────────────────────
  {
    id: 13,
    category: 'forgiveness',
    arabic: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: "Rabbighfir lee wa tub 'alayya innaka Antat-Tawwaabur-Raheem.",
    translation: 'My Lord, forgive me and accept my repentance. Indeed, You are the Acceptor of Repentance, the Most Merciful.',
    reference: 'Abu Dawud 1516, At-Tirmidhi 3434',
    occasion: ['forgiveness'],
  },
  {
    id: 14,
    category: 'forgiveness',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: "Allaahumma Anta Rabbee laa ilaaha illaa Anta, khalaqtanee wa ana 'abduka, wa ana 'alaa 'ahdika wa wa'dika mastataa'tu, a'oodhu bika min sharri maa sana'tu, aboo'u laka bini'matika 'alayya wa aboo'u bidhanbee, faghfir lee fa innahu laa yaghfirudh-dhunooba illaa Anta.",
    translation: 'O Allah, You are my Lord. There is no god but You. You created me and I am Your servant, and I am faithful to my covenant and my promise as much as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessings upon me, and I acknowledge my sins. So forgive me, for none forgives sins except You.',
    reference: 'Sahih Al-Bukhari 6306',
    occasion: ['morning', 'evening', 'forgiveness'],
  },
  {
    id: 15,
    category: 'forgiveness',
    arabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaah-allazee laa ilaaha illaa Huwal-Hayyul-Qayyoomu wa atoobu ilayhi.',
    translation: 'I seek the forgiveness of Allah, there is no god but He, the Ever-Living, the Self-Subsisting, and I repent to Him.',
    reference: 'Abu Dawud 1517, At-Tirmidhi 3577',
    occasion: ['forgiveness'],
  },
  {
    id: 16,
    category: 'forgiveness',
    arabic: 'اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ دِقَّهُ وَجِلَّهُ وَأَوَّلَهُ وَآخِرَهُ وَعَلَانِيَتَهُ وَسِرَّهُ',
    transliteration: "Allaahummagh-fir lee dhanbee kullahu diqqahu wa jillahu wa awwalahu wa aakhirahu wa 'alaaniyyatahu wa sirrahu.",
    translation: 'O Allah, forgive me all my sins — the small and the great, the first and the last, the open and the hidden.',
    reference: 'Sahih Muslim 483',
    occasion: ['forgiveness'],
  },

  // ─── Guidance ──────────────────────────────────────────────────────
  {
    id: 17,
    category: 'guidance',
    arabic: 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي',
    transliteration: 'Allaahummah-dinee wa saddidnee.',
    translation: 'O Allah, guide me and set me on the right path.',
    reference: 'Sahih Muslim 2725',
    occasion: ['guidance'],
  },
  {
    id: 18,
    category: 'guidance',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
    transliteration: "Allaahumma innee as'alukal-hudaa wat-tuqaa wal-'afaafa wal-ghinaa.",
    translation: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.',
    reference: 'Sahih Muslim 2721',
    occasion: ['guidance'],
  },
  {
    id: 19,
    category: 'guidance',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    transliteration: 'Rabbish-rah lee sadree wa yassir lee amree.',
    translation: 'My Lord, expand my chest and ease my affair.',
    reference: 'Quran 20:25-26',
    occasion: ['guidance', 'distress'],
  },
  {
    id: 20,
    category: 'guidance',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Rabbanaa aatinaa fid-dunyaa hasanataw-wa fil-aakhirati hasanataw-wa qinaa 'adhaaban-naar.",
    translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
    reference: 'Quran 2:201',
    occasion: ['guidance', 'after_prayer'],
  },

  // ─── Distress ──────────────────────────────────────────────────────
  {
    id: 21,
    category: 'distress',
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: 'Laa ilaaha illaa Anta Subhaanaka innee kuntu minaz-zaalimeen.',
    translation: 'There is no god but You. Glory be to You. Indeed, I have been among the wrongdoers.',
    reference: 'Quran 21:87, At-Tirmidhi 3505',
    occasion: ['distress'],
  },
  {
    id: 22,
    category: 'distress',
    arabic: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration: "Allaahumma rahmataka arjoo falaa takilnee ilaa nafsee tarfata 'aynin wa aslih lee sha'nee kullahu laa ilaaha illaa Anta.",
    translation: 'O Allah, it is Your mercy that I hope for, so do not leave me in charge of my affairs even for the blink of an eye, and rectify all of my affairs. There is no god but You.',
    reference: 'Abu Dawud 5090',
    occasion: ['distress'],
  },
  {
    id: 23,
    category: 'distress',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
    transliteration: "Laa ilaaha ill-Allaahul-'Azeemul-Haleem. Laa ilaaha ill-Allaahu Rabbul-'Arshil-'Azeem. Laa ilaaha ill-Allaahu Rabbus-samaawaati wa Rabbul-ardi wa Rabbul-'Arshil-Kareem.",
    translation: 'There is no god but Allah, the Great, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens and the earth and Lord of the Noble Throne.',
    reference: 'Sahih Al-Bukhari 6346, Sahih Muslim 2730',
    occasion: ['distress'],
  },
  {
    id: 24,
    category: 'distress',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: "Hasbunallaahu wa ni'mal-wakeel.",
    translation: 'Allah is Sufficient for us, and He is the Best Disposer of affairs.',
    reference: 'Quran 3:173, Sahih Al-Bukhari 4563',
    occasion: ['distress', 'protection'],
  },

  // ─── Gratitude ─────────────────────────────────────────────────────
  {
    id: 25,
    category: 'gratitude',
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    transliteration: "Allaahumma a'innee 'alaa dhikrika wa shukrika wa husni 'ibaadatika.",
    translation: 'O Allah, help me to remember You, to thank You, and to worship You in the best manner.',
    reference: 'Abu Dawud 1522',
    occasion: ['gratitude', 'after_prayer'],
  },
  {
    id: 26,
    category: 'gratitude',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَكَفَانَا وَآوَانَا فَكَمْ مِمَّنْ لَا كَافِيَ لَهُ وَلَا مُؤْوِيَ',
    transliteration: "Alhamdu lillaahil-lazee at'amanaa wa saqaanaa wa kafaanaa wa aawaanaa, fakam mimman laa kaafiya lahu wa laa mu'wiya.",
    translation: 'All praise is for Allah, Who fed us, gave us drink, sufficed us, and gave us shelter. How many are there with no one to suffice them and no one to shelter them.',
    reference: 'Sahih Muslim 2715',
    occasion: ['gratitude', 'sleeping'],
  },

  // ─── Sleeping ──────────────────────────────────────────────────────
  {
    id: 27,
    category: 'sleeping',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismikallaahumma amootu wa ahyaa.',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Sahih Al-Bukhari 6324',
    occasion: ['sleeping'],
  },
  {
    id: 28,
    category: 'sleeping',
    arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
    transliteration: "Allaahumma qinee 'adhaabaka yawma tab'athu 'ibaadaka.",
    translation: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.',
    reference: 'Abu Dawud 5045',
    occasion: ['sleeping'],
  },
  {
    id: 29,
    category: 'sleeping',
    arabic: 'اللَّهُمَّ بِاسْمِكَ أَحْيَا وَبِاسْمِكَ أَمُوتُ',
    transliteration: 'Allaahumma bismika ahyaa wa bismika amootu.',
    translation: 'O Allah, in Your name I live and in Your name I die.',
    reference: 'Sahih Al-Bukhari 6325',
    occasion: ['sleeping'],
  },
  {
    id: 30,
    category: 'sleeping',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdu lillaahil-lazee ahyaanaa ba\'damaa amaatanaa wa ilayhin-nushoor.',
    translation: 'All praise is for Allah Who gave us life after having taken it from us, and unto Him is the resurrection.',
    reference: 'Sahih Al-Bukhari 6312',
    occasion: ['sleeping'],
  },

  // ─── Eating ────────────────────────────────────────────────────────
  {
    id: 31,
    category: 'eating',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillaah.',
    translation: 'In the name of Allah.',
    reference: 'Abu Dawud 3767, At-Tirmidhi 1858',
    occasion: ['eating'],
  },
  {
    id: 32,
    category: 'eating',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration: "Alhamdu lillaahil-lazee at'amanee haazaa wa razaqaneehi min ghayri hawlim-minnee wa laa quwwah.",
    translation: 'All praise is for Allah Who has fed me this and provided it for me without any might or power from me.',
    reference: 'Abu Dawud 4023, At-Tirmidhi 3458',
    occasion: ['eating'],
  },
  {
    id: 33,
    category: 'eating',
    arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَأَطْعِمْنَا خَيْرًا مِنْهُ',
    transliteration: "Allaahumma baarik lanaa feehi wa at'imnaa khayram-minh.",
    translation: 'O Allah, bless it for us and feed us something better than it.',
    reference: 'Abu Dawud 3730, At-Tirmidhi 3455',
    occasion: ['eating'],
  },

  // ─── Travel ────────────────────────────────────────────────────────
  {
    id: 34,
    category: 'travel',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration: 'SubhaanAllazee sakhkhara lanaa haazaa wa maa kunnaa lahu muqrineena wa innaa ilaa Rabbinaa lamunqaliboon.',
    translation: 'Glory be to Him Who has subjected this for us, and we could never have it by our efforts, and to our Lord we shall surely return.',
    reference: 'Quran 43:13-14, Abu Dawud 2602',
    occasion: ['travel'],
  },
  {
    id: 35,
    category: 'travel',
    arabic: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى وَمِنَ الْعَمَلِ مَا تَرْضَى',
    transliteration: "Allaahumma innaa nas'aluka fee safarinaa haazal-birra wat-taqwaa wa minal-'amali maa tardaa.",
    translation: 'O Allah, we ask You in this journey of ours for righteousness, piety, and deeds that are pleasing to You.',
    reference: 'Sahih Muslim 1342',
    occasion: ['travel'],
  },
  {
    id: 36,
    category: 'travel',
    arabic: 'اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ',
    transliteration: "Allaahumma hawwin 'alaynaa safaranaa haazaa watwi 'annaa bu'dahu.",
    translation: 'O Allah, ease this journey of ours and fold up its distance for us.',
    reference: 'Sahih Muslim 1342',
    occasion: ['travel'],
  },

  // ─── Entering & Leaving Mosque ─────────────────────────────────────
  {
    id: 37,
    category: 'entering_mosque',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allaahummaf-tah lee abwaaba rahmatika.',
    translation: 'O Allah, open for me the doors of Your mercy.',
    reference: 'Sahih Muslim 713',
    occasion: ['entering_mosque'],
  },
  {
    id: 38,
    category: 'entering_mosque',
    arabic: 'أَعُوذُ بِاللَّهِ الْعَظِيمِ وَبِوَجْهِهِ الْكَرِيمِ وَسُلْطَانِهِ الْقَدِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration: "A'oodhu billaahil-'Azeem wa bi wajhihil-kareem wa sultaanihil-qadeem minash-shaytaanir-rajeem.",
    translation: 'I seek refuge in Allah the Almighty, and in His Noble Face, and in His Eternal Authority, from the accursed devil.',
    reference: 'Abu Dawud 466',
    occasion: ['entering_mosque'],
  },
  {
    id: 39,
    category: 'leaving_mosque',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: "Allaahumma innee as'aluka min fadlika.",
    translation: 'O Allah, I ask You from Your bounty.',
    reference: 'Sahih Muslim 713',
    occasion: ['leaving_mosque'],
  },

  // ─── Parents ───────────────────────────────────────────────────────
  {
    id: 40,
    category: 'parents',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbir-hamhumaa kamaa rabbayaanee sagheera.',
    translation: 'My Lord, have mercy upon them as they brought me up when I was small.',
    reference: 'Quran 17:24',
    occasion: ['parents'],
  },
  {
    id: 41,
    category: 'parents',
    arabic: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    transliteration: "Rabbighfir lee wa liwaalidayya wa lil-mu'mineena yawma yaqoomul-hisaab.",
    translation: 'Our Lord, forgive me and my parents and the believers on the Day the account is established.',
    reference: 'Quran 14:41',
    occasion: ['parents'],
  },

  // ─── Rain ──────────────────────────────────────────────────────────
  {
    id: 42,
    category: 'rain',
    arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
    transliteration: 'Allaahumma sayyiban naafi\'aa.',
    translation: 'O Allah, let it be a beneficial rain.',
    reference: 'Sahih Al-Bukhari 1032',
    occasion: ['rain'],
  },
  {
    id: 43,
    category: 'rain',
    arabic: 'مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ',
    transliteration: 'Mutirnaa bi fadlillaahi wa rahmatihi.',
    translation: 'We have been given rain by the grace and mercy of Allah.',
    reference: 'Sahih Al-Bukhari 1038, Sahih Muslim 71',
    occasion: ['rain'],
  },

  // ─── Morning ───────────────────────────────────────────────────────
  {
    id: 44,
    category: 'morning',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: "Asbahnaa wa asbahal-mulku lillaah, walhamdu lillaah, laa ilaaha ill-Allaahu wahdahu laa shareeka lah.",
    translation: 'We have reached the morning and the sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah alone, having no partner.',
    reference: 'Abu Dawud 5071',
    occasion: ['morning'],
  },
  {
    id: 45,
    category: 'morning',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allaahumma bika asbahnaa wa bika amsaynaa wa bika nahyaa wa bika namootu wa ilaykan-nushoor.',
    translation: 'O Allah, by You we reach the morning and by You we reach the evening. By You we live and by You we die, and unto You is the resurrection.',
    reference: 'At-Tirmidhi 3391',
    occasion: ['morning'],
  },

  // ─── Evening ───────────────────────────────────────────────────────
  {
    id: 46,
    category: 'evening',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: "Amsaynaa wa amsal-mulku lillaah, walhamdu lillaah, laa ilaaha ill-Allaahu wahdahu laa shareeka lah.",
    translation: 'We have reached the evening and the sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah alone, having no partner.',
    reference: 'Abu Dawud 5071',
    occasion: ['evening'],
  },
  {
    id: 47,
    category: 'evening',
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allaahumma bika amsaynaa wa bika asbahnaa wa bika nahyaa wa bika namootu wa ilaykal-maseer.',
    translation: 'O Allah, by You we reach the evening and by You we reach the morning. By You we live and by You we die, and unto You is the final return.',
    reference: 'At-Tirmidhi 3391',
    occasion: ['evening'],
  },

  // ─── Additional duas ──────────────────────────────────────────────
  {
    id: 48,
    category: 'guidance',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
    transliteration: "Allaahumma innee as'aluka 'ilman naafi'aw-wa rizqan tayyibaw-wa 'amalam-mutaqabbalaa.",
    translation: 'O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.',
    reference: 'Ibn Majah 925',
    occasion: ['guidance', 'morning'],
  },
  {
    id: 49,
    category: 'protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبُخْلِ وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَأَعُوذُ بِكَ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ',
    transliteration: "Allaahumma innee a'oodhu bika minal-bukhli wa a'oodhu bika minal-jubni wa a'oodhu bika an uradda ilaa ardhalil-'umur.",
    translation: 'O Allah, I seek refuge in You from miserliness, cowardice, and being returned to feeble old age.',
    reference: 'Sahih Al-Bukhari 6390',
    occasion: ['protection'],
  },
  {
    id: 50,
    category: 'forgiveness',
    arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
    transliteration: 'Rabbanaa zalamnaa anfusanaa wa il-lam taghfir lanaa wa tarhamnaa lanakoonanna minal-khaasireen.',
    translation: 'Our Lord, we have wronged ourselves. If You do not forgive us and have mercy upon us, we will surely be among the losers.',
    reference: 'Quran 7:23',
    occasion: ['forgiveness'],
  },
  {
    id: 51,
    category: 'gratitude',
    arabic: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ',
    transliteration: "Allaahumma maa asbaha bee min ni'matin aw bi-ahadin min khalqika faminka wahdaka laa shareeka laka falakal-hamdu wa lakash-shukr.",
    translation: 'O Allah, whatever blessings I or any of Your creation have risen upon, it is from You alone without partner. So for You is all praise and unto You is all thanks.',
    reference: 'Abu Dawud 5073',
    occasion: ['morning', 'gratitude'],
  },
  {
    id: 52,
    category: 'distress',
    arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    transliteration: 'Yaa Hayyu yaa Qayyoomu birahmatika astagheethu.',
    translation: 'O Ever-Living, O Self-Sustaining, in Your mercy I seek relief.',
    reference: 'At-Tirmidhi 3524',
    occasion: ['distress'],
  },
  {
    id: 53,
    category: 'guidance',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zidnee 'ilmaa.",
    translation: 'My Lord, increase me in knowledge.',
    reference: 'Quran 20:114',
    occasion: ['guidance'],
  },
  {
    id: 54,
    category: 'protection',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ وَتَحَوُّلِ عَافِيَتِكَ وَفُجَاءَةِ نِقْمَتِكَ وَجَمِيعِ سَخَطِكَ',
    transliteration: "Allaahumma innee a'oodhu bika min zawaali ni'matika wa tahawwuli 'aafiyatika wa fujaa'ati niqmatika wa jamee'i sakhatika.",
    translation: 'O Allah, I seek refuge in You from the loss of Your blessings, the decline of the health You grant, the suddenness of Your punishment, and all of Your displeasure.',
    reference: 'Sahih Muslim 2739',
    occasion: ['protection'],
  },
  {
    id: 55,
    category: 'before_prayer',
    arabic: 'اللَّهُمَّ اغْسِلْنِي مِنْ خَطَايَايَ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ',
    transliteration: 'Allaahummagh-silnee min khataayaaya bil-maa\'i wath-thalji wal-barad.',
    translation: 'O Allah, wash me of my sins with water, snow, and hail.',
    reference: 'Sahih Al-Bukhari 744, Sahih Muslim 598',
    occasion: ['before_prayer'],
  },
  {
    id: 56,
    category: 'after_prayer',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبُخْلِ وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَأَعُوذُ بِكَ مِنْ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا وَعَذَابِ الْقَبْرِ',
    transliteration: "Allaahumma innee a'oodhu bika minal-bukhli wa a'oodhu bika minal-jubni wa a'oodhu bika min an uradda ilaa ardhalil-'umur, wa a'oodhu bika min fitnatid-dunyaa wa 'adhaabil-qabr.",
    translation: 'O Allah, I seek refuge in You from miserliness, cowardice, being returned to feeble old age, from the trials of this world, and the punishment of the grave.',
    reference: 'Sahih Al-Bukhari 6374',
    occasion: ['after_prayer'],
  },
  {
    id: 57,
    category: 'sleeping',
    arabic: 'اللَّهُمَّ إِنِّي أَسْلَمْتُ نَفْسِي إِلَيْكَ وَوَجَّهْتُ وَجْهِي إِلَيْكَ وَفَوَّضْتُ أَمْرِي إِلَيْكَ وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ رَغْبَةً وَرَهْبَةً إِلَيْكَ',
    transliteration: "Allaahumma innee aslamtu nafsee ilayka wa wajjahtu wajhee ilayka wa fawwadtu amree ilayka wa alja'tu zahree ilayka raghbataw-wa rahbatan ilayka.",
    translation: 'O Allah, I submit my soul to You, turn my face to You, entrust my affairs to You, and lean my back on You, hoping in You and fearing You.',
    reference: 'Sahih Al-Bukhari 6313, Sahih Muslim 2710',
    occasion: ['sleeping'],
  },
  {
    id: 58,
    category: 'gratitude',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي عَافَانِي فِي جَسَدِي وَرَدَّ عَلَيَّ رُوحِي وَأَذِنَ لِي بِذِكْرِهِ',
    transliteration: "Alhamdu lillaahil-lazee 'aafaanee fee jasadee wa radda 'alayya roohee wa adhina lee bidhikrih.",
    translation: 'All praise is for Allah who restored to me my health, returned my soul, and permitted me to remember Him.',
    reference: 'At-Tirmidhi 3401',
    occasion: ['gratitude', 'morning'],
  },
  {
    id: 59,
    category: 'guidance',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: "Rabbanaa hab lanaa min azwaajinaa wa dhurriyyaatinaa qurrata a'yuniw-waj'alnaa lil-muttaqeena imaama.",
    translation: 'Our Lord, grant us from our spouses and offspring comfort to our eyes, and make us leaders for the righteous.',
    reference: 'Quran 25:74',
    occasion: ['guidance', 'parents'],
  },
  {
    id: 60,
    category: 'forgiveness',
    arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِنْ نَسِينَا أَوْ أَخْطَأْنَا',
    transliteration: "Rabbanaa laa tu'aakhidhnaa in naseenaa aw akhta'naa.",
    translation: 'Our Lord, do not impose blame upon us if we have forgotten or erred.',
    reference: 'Quran 2:286',
    occasion: ['forgiveness'],
  },
];

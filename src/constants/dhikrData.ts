// src/constants/dhikrData.ts
//
// Authentic post-Fard dhikr based on Sahih ahadith.
// Each item maps to what the Prophet ﷺ practiced after every obligatory prayer.

export interface DhikrItem {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  count: number;
  reference: string;
  type: 'tap' | 'recite'; // 'tap' = counter, 'recite' = read & confirm
}

export const POST_FARD_DHIKR: DhikrItem[] = [
  {
    id: 'istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    translation: 'I seek forgiveness from Allah',
    count: 3,
    reference: 'Sahih Muslim 591',
    type: 'tap',
  },
  {
    id: 'allahumma-antas-salam',
    arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: "Allahumma Antas-Salaam wa minkas-salaam, tabaarakta yaa Dhal-Jalaali wal-Ikraam",
    translation: 'O Allah, You are As-Salam and from You is peace. Blessed are You, O Possessor of Majesty and Honor.',
    count: 1,
    reference: 'Sahih Muslim 592',
    type: 'recite',
  },
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    translation: 'Glory be to Allah',
    count: 33,
    reference: 'Sahih Muslim 597',
    type: 'tap',
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    translation: 'All praise is due to Allah',
    count: 33,
    reference: 'Sahih Muslim 597',
    type: 'tap',
  },
  {
    id: 'allahu-akbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    translation: 'Allah is the Greatest',
    count: 33,
    reference: 'Sahih Muslim 597',
    type: 'tap',
  },
  {
    id: 'tahleel',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: "Laa ilaaha ill-Allahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamd, wa huwa 'ala kulli shay'in qadeer",
    translation: 'There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.',
    count: 1,
    reference: 'Sahih Muslim 597',
    type: 'recite',
  },
  {
    id: 'ayat-al-kursi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration: "Allahu laa ilaaha illaa Huwal-Hayyul-Qayyoom. Laa ta'khuzuhoo sinatun wa laa nawm. Lahoo maa fis-samaawaati wa maa fil-ard. Man zal-lazee yashfa'u 'indahoo illaa bi-iznih. Ya'lamu maa bayna aydeehim wa maa khalfahum. Wa laa yuheetoona bi shay'im-min 'ilmihee illaa bimaa shaa'. Wasi'a kursiyyuhus-samaawaati wal-ard. Wa laa ya'ooduhoo hifzuhumaa. Wa Huwal-'Aliyyul-'Azeem.",
    translation: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Quran 2:255)',
    count: 1,
    reference: "An-Nasa'i — authenticated by Al-Albani",
    type: 'recite',
  },
];

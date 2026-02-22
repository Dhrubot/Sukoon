// src/constants/adhkarData.ts
//
// Authentic Morning (Adhkar al-Sabah) and Evening (Adhkar al-Masa) remembrances
// sourced from Hisnul Muslim (Fortress of the Muslim) by Sa'id bin Ali bin Wahf al-Qahtani.
// Chapters 24 & 25.

import { DhikrItem } from './dhikrData';

// ─── Morning Adhkar (after Fajr until sunrise) ─────────────────────────────

export const MORNING_ADHKAR: DhikrItem[] = [
  {
    id: 'morning-ayat-al-kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration:
      "Allahu laa ilaaha illaa Huwal-Hayyul-Qayyoom. Laa ta'khuzuhoo sinatun wa laa nawm. Lahoo maa fis-samaawaati wa maa fil-ard. Man zal-lazee yashfa'u 'indahoo illaa bi-iznih. Ya'lamu maa bayna aydeehim wa maa khalfahum. Wa laa yuheetoona bi shay'im-min 'ilmihee illaa bimaa shaa'. Wasi'a kursiyyuhus-samaawaati wal-ard. Wa laa ya'ooduhoo hifzuhumaa. Wa Huwal-'Aliyyul-'Azeem.",
    translation:
      'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth.',
    count: 1,
    reference: 'Quran 2:255',
    type: 'recite',
  },
  {
    id: 'morning-ikhlas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul Huwa Allaahu Ahad. Allaahus-Samad. Lam yalid wa lam yoolad. Wa lam yakun lahu kufuwan ahad.",
    translation:
      'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'morning-falaq',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul a'oodhu bi Rabbil-falaq. Min sharri maa khalaq. Wa min sharri ghaasiqin idhaa waqab. Wa min sharrin-naffaathaati fil-'uqad. Wa min sharri haasidin idhaa hasad.",
    translation:
      'Say: I seek refuge in the Lord of daybreak, from the evil of that which He created, from the evil of darkness when it settles, from the evil of those who blow on knots, and from the evil of an envier when he envies.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'morning-nas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul a'oodhu bi Rabbin-naas. Malikin-naas. Ilaahin-naas. Min sharril-waswaasil-khannaas. Allazee yuwaswisu fee sudoorin-naas. Minal-jinnati wan-naas.",
    translation:
      'Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers in the breasts of mankind, from among the jinn and mankind.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'morning-master-dua',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma Anta Rabbee laa ilaaha illaa Anta, khalaqtanee wa ana 'abduka, wa ana 'alaa 'ahdika wa wa'dika mas-tata'tu, a'oodhu bika min sharri maa sana'tu, aboo'u laka bi ni'matika 'alayya, wa aboo'u laka bi dhanbee, faghfir lee fa innahu laa yaghfirudh-dhunooba illaa Anta.",
    translation:
      'O Allah, You are my Lord. There is no god but You. You created me and I am Your servant. I abide by Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your blessings upon me and I acknowledge my sins. So forgive me, for none forgives sins but You.',
    count: 1,
    reference: 'Sahih Al-Bukhari 7/150',
    type: 'recite',
  },
  {
    id: 'morning-asbahna',
    arabic:
      'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration:
      "Asbahnaa wa asbahal-mulku lillaah, walhamdu lillaah, laa ilaaha ill-Allaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'alaa kulli shay'in Qadeer.",
    translation:
      'We have reached the morning and at this very time all sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah alone, having no partner. To Him belongs the dominion and to Him belongs all praise, and He is over all things Omnipotent.',
    count: 1,
    reference: 'Sahih Muslim 4/2088',
    type: 'recite',
  },
  {
    id: 'morning-allahumma-bika-asbahna',
    arabic:
      'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    transliteration:
      'Allaahumma bika asbahnaa, wa bika amsaynaa, wa bika nahyaa, wa bika namootu, wa ilaykan-nushoor.',
    translation:
      'O Allah, by Your leave we have reached the morning, by Your leave we have reached the evening, by Your leave we live and die, and unto You is our resurrection.',
    count: 1,
    reference: 'At-Tirmidhi 5/466',
    type: 'recite',
  },
  {
    id: 'morning-allahumma-inni-asbahtu',
    arabic:
      'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
    transliteration:
      "Allaahumma innee asbahtu ush-hiduka, wa ush-hidu hamalata 'arshika, wa malaa'ikataka, wa jamee'a khalqika, annaka Ant-Allaahu laa ilaaha illaa Anta wahdaka laa shareeka laka, wa anna Muhammadan 'abduka wa Rasooluka.",
    translation:
      'O Allah, verily I have reached the morning and call on You, the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, none has the right to be worshipped except You alone, without partner, and that Muhammad is Your servant and messenger.',
    count: 4,
    reference: 'Abu Dawud 4/317',
    type: 'tap',
  },
  {
    id: 'morning-allahumma-aafini',
    arabic:
      'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma 'aafinee fee badanee, Allaahumma 'aafinee fee sam'ee, Allaahumma 'aafinee fee basaree, laa ilaaha illaa Anta.",
    translation:
      'O Allah, grant my body health. O Allah, grant my hearing health. O Allah, grant my sight health. None has the right to be worshipped except You.',
    count: 3,
    reference: 'Abu Dawud 4/324',
    type: 'tap',
  },
  {
    id: 'morning-audhu-protection',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ، وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma innee a'oodhu bika minal-kufri, wal-faqri, wa a'oodhu bika min 'adhaabil-qabri, laa ilaaha illaa Anta.",
    translation:
      'O Allah, I seek refuge in You from disbelief, and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped except You.',
    count: 3,
    reference: 'Abu Dawud 4/324',
    type: 'tap',
  },
  {
    id: 'morning-hasbiyallah',
    arabic:
      'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration:
      "Hasbiy-Allaahu laa ilaaha illaa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'Arshil-'Azeem.",
    translation:
      'Allah is Sufficient for me, there is no god but He. Upon Him I have relied, and He is Lord of the Mighty Throne.',
    count: 7,
    reference: 'Abu Dawud 4/321',
    type: 'tap',
  },
  {
    id: 'morning-bismillah-protection',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration:
      "Bismillaahil-lazee laa yadurru ma'asmihi shay'un fil-ardi wa laa fis-samaa'i, wa Huwas-Samee'ul-'Aleem.",
    translation:
      'In the name of Allah with Whose name nothing can harm on earth or in the heavens, and He is the All-Hearing, the All-Knowing.',
    count: 3,
    reference: 'Abu Dawud 4/323, At-Tirmidhi 5/465',
    type: 'tap',
  },
  {
    id: 'morning-radheetu',
    arabic:
      'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    transliteration:
      "Radheetu billaahi Rabbaa, wa bil-Islaami deenaa, wa bi Muhammadin sall-Allaahu 'alayhi wa sallama nabiyyaa.",
    translation:
      'I am pleased with Allah as a Lord, with Islam as a religion, and with Muhammad (peace be upon him) as a Prophet.',
    count: 3,
    reference: 'Abu Dawud 4/318',
    type: 'tap',
  },
  {
    id: 'morning-subhanallah-wa-bihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhaanAllaahi wa bihamdihi.',
    translation:
      'Glory be to Allah and praise Him.',
    count: 100,
    reference: 'Sahih Muslim 4/2071',
    type: 'tap',
  },
  {
    id: 'morning-la-ilaha-illallah',
    arabic:
      'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration:
      "Laa ilaaha ill-Allaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamdu, wa Huwa 'alaa kulli shay'in Qadeer.",
    translation:
      'None has the right to be worshipped except Allah alone, having no partner. To Him belongs all sovereignty and praise, and He is over all things Omnipotent.',
    count: 10,
    reference: 'Sahih Al-Bukhari 4/95, Sahih Muslim 4/2071',
    type: 'tap',
  },
];

// ─── Evening Adhkar (after Asr until Maghrib) ──────────────────────────────

export const EVENING_ADHKAR: DhikrItem[] = [
  {
    id: 'evening-ayat-al-kursi',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration:
      "Allahu laa ilaaha illaa Huwal-Hayyul-Qayyoom. Laa ta'khuzuhoo sinatun wa laa nawm. Lahoo maa fis-samaawaati wa maa fil-ard. Man zal-lazee yashfa'u 'indahoo illaa bi-iznih. Ya'lamu maa bayna aydeehim wa maa khalfahum. Wa laa yuheetoona bi shay'im-min 'ilmihee illaa bimaa shaa'. Wasi'a kursiyyuhus-samaawaati wal-ard. Wa laa ya'ooduhoo hifzuhumaa. Wa Huwal-'Aliyyul-'Azeem.",
    translation:
      'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth.',
    count: 1,
    reference: 'Quran 2:255',
    type: 'recite',
  },
  {
    id: 'evening-ikhlas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul Huwa Allaahu Ahad. Allaahus-Samad. Lam yalid wa lam yoolad. Wa lam yakun lahu kufuwan ahad.",
    translation:
      'Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'evening-falaq',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul a'oodhu bi Rabbil-falaq. Min sharri maa khalaq. Wa min sharri ghaasiqin idhaa waqab. Wa min sharrin-naffaathaati fil-'uqad. Wa min sharri haasidin idhaa hasad.",
    translation:
      'Say: I seek refuge in the Lord of daybreak, from the evil of that which He created, from the evil of darkness when it settles, from the evil of those who blow on knots, and from the evil of an envier when he envies.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'evening-nas',
    arabic:
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ',
    transliteration:
      "Bismillaahir-Rahmaanir-Raheem. Qul a'oodhu bi Rabbin-naas. Malikin-naas. Ilaahin-naas. Min sharril-waswaasil-khannaas. Allazee yuwaswisu fee sudoorin-naas. Minal-jinnati wan-naas.",
    translation:
      'Say: I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer, who whispers in the breasts of mankind, from among the jinn and mankind.',
    count: 3,
    reference: 'Abu Dawud 4/322, At-Tirmidhi 5/567',
    type: 'tap',
  },
  {
    id: 'evening-master-dua',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma Anta Rabbee laa ilaaha illaa Anta, khalaqtanee wa ana 'abduka, wa ana 'alaa 'ahdika wa wa'dika mas-tata'tu, a'oodhu bika min sharri maa sana'tu, aboo'u laka bi ni'matika 'alayya, wa aboo'u laka bi dhanbee, faghfir lee fa innahu laa yaghfirudh-dhunooba illaa Anta.",
    translation:
      'O Allah, You are my Lord. There is no god but You. You created me and I am Your servant. I abide by Your covenant and promise as best I can. I seek refuge in You from the evil I have done. I acknowledge Your blessings upon me and I acknowledge my sins. So forgive me, for none forgives sins but You.',
    count: 1,
    reference: 'Sahih Al-Bukhari 7/150',
    type: 'recite',
  },
  {
    id: 'evening-amsayna',
    arabic:
      'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration:
      "Amsaynaa wa amsal-mulku lillaah, walhamdu lillaah, laa ilaaha ill-Allaahu wahdahu laa shareeka lah, lahul-mulku wa lahul-hamdu wa Huwa 'alaa kulli shay'in Qadeer.",
    translation:
      'We have reached the evening and at this very time all sovereignty belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah alone, having no partner. To Him belongs the dominion and to Him belongs all praise, and He is over all things Omnipotent.',
    count: 1,
    reference: 'Sahih Muslim 4/2088',
    type: 'recite',
  },
  {
    id: 'evening-allahumma-bika-amsayna',
    arabic:
      'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    transliteration:
      'Allaahumma bika amsaynaa, wa bika asbahnaa, wa bika nahyaa, wa bika namootu, wa ilaykal-maseer.',
    translation:
      'O Allah, by Your leave we have reached the evening, by Your leave we have reached the morning, by Your leave we live and die, and unto You is our return.',
    count: 1,
    reference: 'At-Tirmidhi 5/466',
    type: 'recite',
  },
  {
    id: 'evening-allahumma-inni-amsaytu',
    arabic:
      'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
    transliteration:
      "Allaahumma innee amsaytu ush-hiduka, wa ush-hidu hamalata 'arshika, wa malaa'ikataka, wa jamee'a khalqika, annaka Ant-Allaahu laa ilaaha illaa Anta wahdaka laa shareeka laka, wa anna Muhammadan 'abduka wa Rasooluka.",
    translation:
      'O Allah, verily I have reached the evening and call on You, the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, none has the right to be worshipped except You alone, without partner, and that Muhammad is Your servant and messenger.',
    count: 4,
    reference: 'Abu Dawud 4/317',
    type: 'tap',
  },
  {
    id: 'evening-allahumma-aafini',
    arabic:
      'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma 'aafinee fee badanee, Allaahumma 'aafinee fee sam'ee, Allaahumma 'aafinee fee basaree, laa ilaaha illaa Anta.",
    translation:
      'O Allah, grant my body health. O Allah, grant my hearing health. O Allah, grant my sight health. None has the right to be worshipped except You.',
    count: 3,
    reference: 'Abu Dawud 4/324',
    type: 'tap',
  },
  {
    id: 'evening-audhu-protection',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ، وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration:
      "Allaahumma innee a'oodhu bika minal-kufri, wal-faqri, wa a'oodhu bika min 'adhaabil-qabri, laa ilaaha illaa Anta.",
    translation:
      'O Allah, I seek refuge in You from disbelief, and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped except You.',
    count: 3,
    reference: 'Abu Dawud 4/324',
    type: 'tap',
  },
  {
    id: 'evening-hasbiyallah',
    arabic:
      'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration:
      "Hasbiy-Allaahu laa ilaaha illaa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbul-'Arshil-'Azeem.",
    translation:
      'Allah is Sufficient for me, there is no god but He. Upon Him I have relied, and He is Lord of the Mighty Throne.',
    count: 7,
    reference: 'Abu Dawud 4/321',
    type: 'tap',
  },
  {
    id: 'evening-bismillah-protection',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration:
      "Bismillaahil-lazee laa yadurru ma'asmihi shay'un fil-ardi wa laa fis-samaa'i, wa Huwas-Samee'ul-'Aleem.",
    translation:
      'In the name of Allah with Whose name nothing can harm on earth or in the heavens, and He is the All-Hearing, the All-Knowing.',
    count: 3,
    reference: 'Abu Dawud 4/323, At-Tirmidhi 5/465',
    type: 'tap',
  },
  {
    id: 'evening-radheetu',
    arabic:
      'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    transliteration:
      "Radheetu billaahi Rabbaa, wa bil-Islaami deenaa, wa bi Muhammadin sall-Allaahu 'alayhi wa sallama nabiyyaa.",
    translation:
      'I am pleased with Allah as a Lord, with Islam as a religion, and with Muhammad (peace be upon him) as a Prophet.',
    count: 3,
    reference: 'Abu Dawud 4/318',
    type: 'tap',
  },
  {
    id: 'evening-subhanallah-wa-bihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'SubhaanAllaahi wa bihamdihi.',
    translation:
      'Glory be to Allah and praise Him.',
    count: 100,
    reference: 'Sahih Muslim 4/2071',
    type: 'tap',
  },
  {
    id: 'evening-allahumma-innee-audhu',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    transliteration:
      "Allaahumma innee a'oodhu bika minal-hammi wal-hazan, wa a'oodhu bika minal-'ajzi wal-kasal, wa a'oodhu bika minal-jubni wal-bukhl, wa a'oodhu bika min ghalabatid-dayni wa qahrir-rijaal.",
    translation:
      'O Allah, I seek refuge in You from anxiety and sorrow, weakness and laziness, miserliness and cowardice, the burden of debts and from being overpowered by men.',
    count: 1,
    reference: 'Sahih Al-Bukhari 7/158',
    type: 'recite',
  },
];

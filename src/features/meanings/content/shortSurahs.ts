// Short surahs commonly recited after Al-Fatihah.
//
// 10 items, Mushaf order, all Makki. Orders 4–13 slot between Fatihah
// (order 3) and the takbir transitioning into ruku (order 14), so the
// browse view reads in natural salah sequence.
//
// English: Saheeh International (2010). Reflections original.

import type { Meaning } from './schema';
import surahAlAsr from '../assets/audio/surah-al-asr.m4a';
import surahAlHumazah from '../assets/audio/surah-al-humazah.m4a';
import surahAlFil from '../assets/audio/surah-al-fil.m4a';
import surahQuraysh from '../assets/audio/surah-quraysh.m4a';
import surahAlMaun from '../assets/audio/surah-al-maun.m4a';
import surahAlKawthar from '../assets/audio/surah-al-kawthar.m4a';
import surahAlKafirun from '../assets/audio/surah-al-kafirun.m4a';
import surahAlIkhlas from '../assets/audio/surah-al-ikhlas.m4a';
import surahAlFalaq from '../assets/audio/surah-al-falaq.m4a';
import surahAnNas from '../assets/audio/surah-an-nas.m4a';

const SAHEEH = 'Saheeh International, 2010';

export const SHORT_SURAHS: Meaning[] = [
  // ─── 4. Al-Asr (103) ─────────────────────────────────────────────────
  {
    id: 'surah-al-asr',
    position: 'standing',
    order: 4,
    title: "Al-ʿAṣr (103)",
    arabic:
      'وَالْعَصْرِ\n' +
      'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ\n' +
      'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ',
    transliteration:
      "Wa l-ʿaṣr. Inna l-insāna la-fī khusr. Illā lladhīna āmanū wa ʿamilū ṣ-ṣāliḥāti wa tawāṣaw bi-l-ḥaqqi wa tawāṣaw bi-ṣ-ṣabr.",
    audioAsset: surahAlAsr,
    translations: {
      en: {
        translation:
          'By time. Indeed, mankind is in loss, except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience.',
        reflection:
          'Imam ash-Shāfiʿī said that if Allah had revealed only this surah, it would suffice as guidance. In three ayat: the human condition (loss), the way out (faith and righteous deeds), and the social dimension (advising one another to truth and patience). The brevity is the point — recite it slowly and the structure speaks.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 103", translation: SAHEEH },
  },

  // ─── 5. Al-Humazah (104) ─────────────────────────────────────────────
  {
    id: 'surah-al-humazah',
    position: 'standing',
    order: 5,
    title: 'Al-Humazah (104)',
    arabic:
      'وَيْلٌ لِّكُلِّ هُمَزَةٍ لُّمَزَةٍ\n' +
      'الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ\n' +
      'يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ\n' +
      'كَلَّا ۖ لَيُنبَذَنَّ فِي الْحُطَمَةِ\n' +
      'وَمَا أَدْرَاكَ مَا الْحُطَمَةُ\n' +
      'نَارُ اللَّهِ الْمُوقَدَةُ\n' +
      'الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ\n' +
      'إِنَّهَا عَلَيْهِم مُّؤْصَدَةٌ\n' +
      'فِي عَمَدٍ مُّمَدَّدَةٍ',
    transliteration:
      "Waylun li-kulli humazatin lumazah. Alladhī jamaʿa mālan wa ʿaddadah. Yaḥsabu anna mālahu akhladah. Kallā la-yunbadhanna fī l-Ḥuṭamah. Wa mā adrāka ma l-Ḥuṭamah. Nāru llāhi l-mūqadah. Allatī taṭṭaliʿu ʿalā l-afʾidah. Innahā ʿalayhim muʾṣadah. Fī ʿamadin mumaddadah.",
    audioAsset: surahAlHumazah,
    translations: {
      en: {
        translation:
          'Woe to every scorner and mocker, who collects wealth and [continuously] counts it. He thinks that his wealth will make him immortal. No! He will surely be thrown into the Crusher. And what can make you know what is the Crusher? It is the fire of Allah, [eternally] fueled, which mounts directed at the hearts. Indeed, it will be closed down upon them in extended columns.',
        reflection:
          'The surah names two postures: humazah (scornful gossip) and lumazah (mocking gestures). Sins of the tongue and face we sometimes commit without noticing. They are tied to the wealth-counter who thinks possessions make him immortal. Recite slowly — the sounds themselves (humazah, lumazah, ḥuṭamah) imitate the corrosion they describe.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 104", translation: SAHEEH },
  },

  // ─── 6. Al-Fil (105) ─────────────────────────────────────────────────
  {
    id: 'surah-al-fil',
    position: 'standing',
    order: 6,
    title: 'Al-Fīl (105)',
    arabic:
      'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ\n' +
      'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ\n' +
      'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ\n' +
      'تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ\n' +
      'فَجَعَلَهُمْ كَعَصْفٍ مَّأْكُولٍ',
    transliteration:
      "Alam tara kayfa faʿala rabbuka bi-aṣḥābi l-fīl. Alam yajʿal kaydahum fī taḍlīl. Wa arsala ʿalayhim ṭayran abābīl. Tarmīhim bi-ḥijāratin min sijjīl. Fa-jaʿalahum ka-ʿaṣfin maʾkūl.",
    audioAsset: surahAlFil,
    translations: {
      en: {
        translation:
          'Have you not considered, [O Muhammad], how your Lord dealt with the companions of the elephant? Did He not make their plan into misguidance? And He sent against them birds in flocks, striking them with stones of hard clay, and He made them like eaten straw.',
        reflection:
          'An event from history — Abraha\'s army with elephants, halted at the gates of Makkah by birds carrying stones. The opening "Alam tara" — "have you not seen" — invites you to picture it. The lesson: what looked unstoppable was undone by what seemed small. The Quran often makes you remember this when you are facing something that feels too large.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 105", translation: SAHEEH },
  },

  // ─── 7. Quraysh (106) ────────────────────────────────────────────────
  {
    id: 'surah-quraysh',
    position: 'standing',
    order: 7,
    title: 'Quraysh (106)',
    arabic:
      'لِإِيلَافِ قُرَيْشٍ\n' +
      'إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ\n' +
      'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ\n' +
      'الَّذِي أَطْعَمَهُم مِّن جُوعٍ وَآمَنَهُم مِّنْ خَوْفٍ',
    transliteration:
      "Li-īlāfi Quraysh. Īlāfihim riḥlata sh-shitāʾi wa ṣ-ṣayf. Fa-l-yaʿbudū rabba hādha l-bayt. Alladhī aṭʿamahum min jūʿin wa āmanahum min khawf.",
    audioAsset: surahQuraysh,
    translations: {
      en: {
        translation:
          'For the accustomed security of the Quraysh — their accustomed security [in] the caravan of winter and summer — let them worship the Lord of this House, who has fed them, [saving them] from hunger and made them safe, [saving them] from fear.',
        reflection:
          'Quraysh — the Prophet\'s own tribe — had two annual trade caravans (winter to Yemen, summer to Sham). The surah names the protection they enjoyed and reaches the conclusion: "So let them worship the Lord of this House." The argument is gentle: the very safety that lets you trade is itself a sign worth gratitude. Often paired in prayer with Al-Fīl — read together, they tell one story.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 106", translation: SAHEEH },
  },

  // ─── 8. Al-Maun (107) ────────────────────────────────────────────────
  {
    id: 'surah-al-maun',
    position: 'standing',
    order: 8,
    title: "Al-Māʿūn (107)",
    arabic:
      'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ\n' +
      'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ\n' +
      'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ\n' +
      'فَوَيْلٌ لِّلْمُصَلِّينَ\n' +
      'الَّذِينَ هُمْ عَن صَلَاتِهِمْ سَاهُونَ\n' +
      'الَّذِينَ هُمْ يُرَاءُونَ\n' +
      'وَيَمْنَعُونَ الْمَاعُونَ',
    transliteration:
      "A-raʾayta lladhī yukadhdhibu bi-d-dīn. Fa-dhālika lladhī yaduʿʿu l-yatīm. Wa lā yaḥuḍḍu ʿalā ṭaʿāmi l-miskīn. Fa-waylun li-l-muṣallīn. Alladhīna hum ʿan ṣalātihim sāhūn. Alladhīna hum yurāʾūn. Wa yamnaʿūna l-māʿūn.",
    audioAsset: surahAlMaun,
    translations: {
      en: {
        translation:
          'Have you seen the one who denies the Recompense? For that is the one who drives away the orphan and does not encourage the feeding of the poor. So woe to those who pray [but] who are heedless of their prayer — those who make show [of their deeds] and withhold small kindnesses.',
        reflection:
          'A surah every praying person should sit with. "Woe to those who pray... heedless of their prayer" — heedless, not absent. The criticism is not of someone who skips prayer but of someone who is in it without being in it. The remedies named are concrete: caring for orphans, feeding the poor, lending small things to neighbors. Khushuʿ in prayer cannot survive cruelty outside it.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 107", translation: SAHEEH },
  },

  // ─── 9. Al-Kawthar (108) ─────────────────────────────────────────────
  {
    id: 'surah-al-kawthar',
    position: 'standing',
    order: 9,
    title: 'Al-Kawthar (108)',
    arabic:
      'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ\n' +
      'فَصَلِّ لِرَبِّكَ وَانْحَرْ\n' +
      'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ',
    transliteration:
      "Innā aʿṭaynāka l-kawthar. Fa-ṣalli li-rabbika wa-nḥar. Inna shāniʾaka huwa l-abtar.",
    audioAsset: surahAlKawthar,
    translations: {
      en: {
        translation:
          'Indeed, We have granted you, [O Muhammad], al-Kawthar. So pray to your Lord and sacrifice [to Him alone]. Indeed, your enemy is the one cut off.',
        reflection:
          'The shortest surah in the Qur\'an. Revealed when the Prophet ﷺ had lost his sons and his enemies mocked him as "cut off" — without legacy. The reply names a gift (al-Kawthar, abundance) and reverses the charge: the one cut off is the mocker, not the Prophet ﷺ. Recite it remembering: what feels like loss in this life may be the disguise of an immense gift.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 108", translation: SAHEEH },
  },

  // ─── 10. Al-Kafirun (109) ────────────────────────────────────────────
  {
    id: 'surah-al-kafirun',
    position: 'standing',
    order: 10,
    title: 'Al-Kāfirūn (109)',
    arabic:
      'قُلْ يَا أَيُّهَا الْكَافِرُونَ\n' +
      'لَا أَعْبُدُ مَا تَعْبُدُونَ\n' +
      'وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ\n' +
      'وَلَا أَنَا عَابِدٌ مَّا عَبَدتُّمْ\n' +
      'وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ\n' +
      'لَكُمْ دِينُكُمْ وَلِيَ دِينِ',
    transliteration:
      "Qul yā ayyuha l-kāfirūn. Lā aʿbudu mā taʿbudūn. Wa lā antum ʿābidūna mā aʿbud. Wa lā anā ʿābidun mā ʿabadtum. Wa lā antum ʿābidūna mā aʿbud. Lakum dīnukum wa liya dīn.",
    audioAsset: surahAlKafirun,
    translations: {
      en: {
        translation:
          'Say, "O disbelievers, I do not worship what you worship. Nor are you worshippers of what I worship. Nor will I be a worshipper of what you worship. Nor will you be worshippers of what I worship. For you is your religion, and for me is my religion."',
        reflection:
          'A surah of clear lines — and of peaceful coexistence. The repetition is not redundancy; it covers every variation of compromise (you worship mine, I yours, swap occasionally...). The closing line is the model: "For you is your religion, and for me is my religion" — distinct, but not hostile. The Prophet ﷺ recited it often in the first rakʿah of Fajr.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 109", translation: SAHEEH },
  },

  // ─── 11. Al-Ikhlas (112) ─────────────────────────────────────────────
  {
    id: 'surah-al-ikhlas',
    position: 'standing',
    order: 11,
    title: 'Al-Ikhlāṣ (112)',
    arabic:
      'قُلْ هُوَ اللَّهُ أَحَدٌ\n' +
      'اللَّهُ الصَّمَدُ\n' +
      'لَمْ يَلِدْ وَلَمْ يُولَدْ\n' +
      'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    transliteration:
      "Qul huwa llāhu aḥad. Allāhu ṣ-ṣamad. Lam yalid wa lam yūlad. Wa lam yakun lahu kufuwan aḥad.",
    audioAsset: surahAlIkhlas,
    translations: {
      en: {
        translation:
          'Say, "He is Allah, [who is] One. Allah, the Eternal Refuge. He neither begets nor is born. Nor is there to Him any equivalent."',
        reflection:
          'The Prophet ﷺ said this surah is equivalent to one-third of the Qur\'an in reward. Four short ayat that compress tawhid into its purest form. "Aḥad" is not just "one" — it is "one in a way nothing else can be one." Notice it does not say "He is not multiple" — it states something positive: He is uniquely Himself. Read slowly. The brevity hides the depth.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 112", translation: SAHEEH },
  },

  // ─── 12. Al-Falaq (113) ──────────────────────────────────────────────
  {
    id: 'surah-al-falaq',
    position: 'standing',
    order: 12,
    title: 'Al-Falaq (113)',
    arabic:
      'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ\n' +
      'مِن شَرِّ مَا خَلَقَ\n' +
      'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ\n' +
      'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ\n' +
      'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    transliteration:
      "Qul aʿūdhu bi-rabbi l-falaq. Min sharri mā khalaq. Wa min sharri ghāsiqin idhā waqab. Wa min sharri n-naffāthāti fī l-ʿuqad. Wa min sharri ḥāsidin idhā ḥasad.",
    audioAsset: surahAlFalaq,
    translations: {
      en: {
        translation:
          'Say, "I seek refuge in the Lord of daybreak — from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies."',
        reflection:
          'Together with An-Nās, the "Muʿawwidhatayn" — the two protective surahs. The Prophet ﷺ recited them before sleep, after every fard prayer, and during illness. Notice the progression: from the evil of creation in general, to darkness, to magical knot-blowing, to envy. From cosmic to intimate. The last threat — envy from those close — is often the one we underestimate.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 113", translation: SAHEEH },
  },

  // ─── 13. An-Nas (114) ────────────────────────────────────────────────
  {
    id: 'surah-an-nas',
    position: 'standing',
    order: 13,
    title: 'An-Nās (114)',
    arabic:
      'قُلْ أَعُوذُ بِرَبِّ النَّاسِ\n' +
      'مَلِكِ النَّاسِ\n' +
      'إِلَٰهِ النَّاسِ\n' +
      'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ\n' +
      'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ\n' +
      'مِنَ الْجِنَّةِ وَالنَّاسِ',
    transliteration:
      "Qul aʿūdhu bi-rabbi n-nās. Maliki n-nās. Ilāhi n-nās. Min sharri l-waswāsi l-khannās. Alladhī yuwaswisu fī ṣudūri n-nās. Mina l-jinnati wa n-nās.",
    audioAsset: surahAnNas,
    translations: {
      en: {
        translation:
          'Say, "I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer — who whispers [evil] into the breasts of mankind — from among the jinn and mankind."',
        reflection:
          'The final surah of the Qur\'an. The seeker calls Allah by three titles in escalating intimacy — Lord, Sovereign, God — before naming the threat: whisperers, who try to settle thoughts that are not yours. "Khannās" means "the one who retreats": the whisperer withdraws when Allah is remembered. To recite this surah is itself the act that makes the whisperer step back.',
      },
    },
    source: { arabic: 'mushaf', arabicReference: "Qur'an 114", translation: SAHEEH },
  },
];

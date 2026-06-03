export type JummahResourceTopic = 'kahf' | 'ghusl' | 'salawat';

export interface JummahResourceSection {
  id: string;
  label: string;
  arabic?: string;
  transliteration?: string;
  translation: string;
  reference?: string;
}

export const JUMMAH_RESOURCE_COPY: Record<
  JummahResourceTopic,
  {
    title: string;
    subtitle: string;
    hint: string;
  }
> = {
  kahf: {
    title: 'Surah Al-Kahf',
    subtitle: 'Read the full surah with Arabic, transliteration, and English translation.',
    hint: 'Tap any ayah to expand transliteration and the full translation.',
  },
  ghusl: {
    title: 'Jumu\'ah Ghusl',
    subtitle: 'A Friday reminder about cleanliness, ghusl, and coming prepared.',
    hint: 'Tap to expand the hadith and reference.',
  },
  salawat: {
    title: 'Salawat',
    subtitle: 'Keep your tongue moist with blessings upon the Prophet ﷺ throughout Friday.',
    hint: 'Tap to expand the full salawat.',
  },
};

export const JUMMAH_GHUSL_SECTIONS: JummahResourceSection[] = [
  {
    id: 'ghusl-hadith',
    label: 'Hadith',
    translation:
      'Bathing on Friday is essential for every adult, along with using the siwak and applying whatever perfume is available.',
    reference: 'Sahih Muslim 846b',
  },
  {
    id: 'ghusl-reminder',
    label: 'Why it matters',
    translation:
      'Friday is a day of gathering, dignity, and remembrance. Ghusl, clean clothes, and fragrance help a believer arrive for Jumu\'ah with outward cleanliness and inward readiness.',
  },
];

export const JUMMAH_SALAWAT_SECTIONS: JummahResourceSection[] = [
  {
    id: 'salawat-ibrahimiyyah',
    label: 'Salawat Ibrahimiyyah',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration:
      'Allahumma salli \'ala Muhammadin wa \'ala ali Muhammad, kama sallayta \'ala Ibrahima wa \'ala ali Ibrahim, innaka Hamidun Majid. Allahumma barik \'ala Muhammadin wa \'ala ali Muhammad, kama barakta \'ala Ibrahima wa \'ala ali Ibrahim, innaka Hamidun Majid.',
    translation:
      'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious. O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim. Indeed, You are Praiseworthy and Glorious.',
    reference: 'Sahih al-Bukhari and Sahih Muslim',
  },
];

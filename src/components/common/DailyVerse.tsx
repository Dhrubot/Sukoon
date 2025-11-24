import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

// Sample verses - in production, this would come from a larger database
const verses = [
  {
    arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ',
    translation: 'Indeed, prayer prohibits immorality and wrongdoing',
    reference: 'Quran 29:45',
    theme: 'prayer',
  },
  {
    arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ',
    translation: 'And seek help through patience and prayer',
    reference: 'Quran 2:45',
    theme: 'patience',
  },
  {
    arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translation: 'Indeed, Allah is with the patient',
    reference: 'Quran 2:153',
    theme: 'patience',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    translation: 'So remember Me; I will remember you',
    reference: 'Quran 2:152',
    theme: 'remembrance',
  },
];

const DailyVerse: React.FC = () => {
  const { theme } = useTheme();
  const [verse, setVerse] = useState(verses[0]);
  const [showTranslation, setShowTranslation] = useState(true);

  useEffect(() => {
    // Get a daily verse based on the date
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    const verseIndex = dayOfYear % verses.length;
    setVerse(verses[verseIndex]);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${verse.translation}\n\n${verse.arabic}\n\n- ${verse.reference}\n\nShared via Sukoon 🕌`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Daily Verse 📖</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={[styles.shareButton, { color: theme.colors.primary.DEFAULT }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.verseContainer, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}
        onPress={() => setShowTranslation(!showTranslation)}
        activeOpacity={0.8}
      >
        <Text style={[styles.arabic, { color: theme.colors.text.primary }]}>{verse.arabic}</Text>
        
        {showTranslation && (
          <>
            <Text style={[styles.translation, { color: theme.colors.text.secondary }]}>"{verse.translation}"</Text>
            <Text style={[styles.reference, { color: theme.colors.text.muted }]}>{verse.reference}</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.hint, { color: theme.colors.text.muted }]}>Tap to toggle translation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  shareButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  verseContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  arabic: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif',
  },
  translation: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  reference: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default DailyVerse;
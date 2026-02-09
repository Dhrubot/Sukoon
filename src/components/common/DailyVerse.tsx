import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { VERSES } from '../../constants';

// Quran/Book Icon Component
const QuranIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 6L14 10L12 14L10 10L12 6Z"
      fill={color}
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const verses = VERSES;

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
        <View style={styles.titleRow}>
          <QuranIcon color={theme.colors.primary.DEFAULT} size={24} />
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Daily Verse</Text>
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,  // 2xl
    fontWeight: '600',  // semibold
  },
  shareButton: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
  },
  verseContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  arabic: {
    fontSize: 24,  // 3xl
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    fontFamily: Platform.OS === 'ios' ? 'Damascus' : 'serif',
  },
  translation: {
    fontSize: 16,  // lg
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  reference: {
    fontSize: 14,  // md
    textAlign: 'center',
    fontWeight: '500',  // medium
  },
  hint: {
    fontSize: 13,  // sm (adjusted up)
    textAlign: 'center',
    marginTop: 8,
  },
});

export default DailyVerse;
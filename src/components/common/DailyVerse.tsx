import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { VERSES } from '../../constants';
import { HADITH_COLLECTION, Hadith } from '../../constants/hadithCollection';
import { isRamadan } from '../../utils/ramadan';

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

interface DailyContent {
  arabic: string;
  translation: string;
  reference: string;
  narrator?: string;
  isHadith: boolean;
}

const DailyVerse: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [content, setContent] = useState<DailyContent>({
    arabic: verses[0].arabic,
    translation: verses[0].translation,
    reference: verses[0].reference,
    isHadith: false,
  });
  const [showTranslation, setShowTranslation] = useState(true);

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    // During Ramadan, bias toward Ramadan-themed verses (always Quran)
    if (isRamadan()) {
      const ramadanVerses = verses.filter((v: any) => v.theme === 'ramadan');
      if (ramadanVerses.length > 0) {
        const idx = dayOfYear % ramadanVerses.length;
        const v = ramadanVerses[idx];
        setContent({ arabic: v.arabic, translation: v.translation, reference: v.reference, isHadith: false });
        return;
      }
    }

    // Alternate: even days = verse, odd days = hadith
    if (dayOfYear % 2 === 0) {
      const idx = Math.floor(dayOfYear / 2) % verses.length;
      const v = verses[idx];
      setContent({ arabic: v.arabic, translation: v.translation, reference: v.reference, isHadith: false });
    } else {
      const idx = Math.floor(dayOfYear / 2) % HADITH_COLLECTION.length;
      const h = HADITH_COLLECTION[idx];
      setContent({ arabic: h.arabic, translation: h.translation, reference: h.source, narrator: h.narrator, isHadith: true });
    }
  }, []);

  const handleShare = async () => {
    const label = content.isHadith ? 'Hadith' : 'Verse';
    const narratorLine = content.narrator ? `\nNarrated by ${content.narrator}` : '';
    try {
      await Share.share({
        message: `${content.translation}\n\n${content.arabic}${narratorLine}\n\n- ${content.reference}\n\nShared via Sukoon`,
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
          <Text style={styles.title}>
            {content.isHadith ? 'Daily Hadith' : 'Daily Verse'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.verseContainer}
        onPress={() => setShowTranslation(!showTranslation)}
        activeOpacity={0.8}
      >
        <Text style={styles.arabic}>{content.arabic}</Text>
        
        {showTranslation && (
          <>
            <Text style={styles.translation}>"{content.translation}"</Text>
            {content.narrator && (
              <Text style={styles.narrator}>Narrated by {content.narrator}</Text>
            )}
            <Text style={styles.reference}>{content.reference}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* <Text style={[styles.hint, { color: theme.colors.text.muted }]}>Tap to toggle translation</Text> */}
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
  },
  shareButton: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary.DEFAULT,
  },
  verseContainer: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    backgroundColor: theme.colors.card.background,
    borderColor: theme.colors.border.primary,
  },
  arabic: {
    fontSize: theme.typography.fontSize['3xl'],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 36,
    fontFamily: theme.typography.fontFamily.arabic,
    color: theme.colors.text.primary,
  },
  translation: {
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 24,
    fontStyle: 'italic',
    color: theme.colors.text.secondary,
  },
  narrator: {
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontStyle: 'italic',
    color: theme.colors.text.muted,
  },
  reference: {
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.muted,
  },
  hint: {
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});

export default DailyVerse;
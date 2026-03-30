import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { DailyContent, resolveDailyContent } from '../../utils/dailyContent';
import { getLocalDateKey } from '../../utils/dateHelpers';
import logger from '../../utils/logger';

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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DailyVerseRef {
  openSheet: () => void;
}

interface DailyVerseProps {
  modalOnly?: boolean;
}

const DailyVerse = forwardRef<DailyVerseRef, DailyVerseProps>(({ modalOnly }, ref) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [content, setContent] = useState<DailyContent>({
    arabic: '',
    translation: '',
    reference: '',
    isHadith: false,
  });
  const [sheetVisible, setSheetVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const loadedForDateRef = useRef<string | null>(null);

  const ensureContentLoaded = React.useCallback(() => {
    const now = new Date();
    const todayKey = getLocalDateKey(now);
    if (loadedForDateRef.current === todayKey) {
      return;
    }

    try {
      setContent(resolveDailyContent(now));
      loadedForDateRef.current = todayKey;
    } catch (error) {
      logger.error('Failed to load daily content:', error);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    openSheet,
  }));

  const openSheet = () => {
    ensureContentLoaded();
    setSheetVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setSheetVisible(false));
  };

  useEffect(() => {
    if (!modalOnly) {
      ensureContentLoaded();
    }
  }, [ensureContentLoaded, modalOnly]);

  const handleShare = async () => {
    const narratorLine = content.narrator ? `\nNarrated by ${content.narrator}` : '';
    try {
      await Share.share({
        message: `${content.translation}\n\n${content.arabic}${narratorLine}\n\n- ${content.reference}\n\nShared via Sukoon`,
      });
    } catch (error) {
      logger.error('Error sharing:', error);
    }
  };

  if (modalOnly) {
    return (
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropAnim },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.sheetLabel}>
                {content.isHadith ? 'Daily Hadith' : 'Daily Verse'}
              </Text>

              <Text style={[styles.sheetQuoteMark, { color: theme.colors.gold }]}>"</Text>

              <Text style={styles.sheetArabic}>{content.arabic}</Text>

              <View style={[styles.sheetDivider, { backgroundColor: theme.colors.gold }]} />

              <Text style={styles.sheetTranslation}>"{content.translation}"</Text>

              {content.narrator && (
                <Text style={styles.sheetNarrator}>Narrated by {content.narrator}</Text>
              )}

              <Text style={styles.sheetReference}>{content.reference}</Text>

              <TouchableOpacity style={styles.sheetShareButton} onPress={handleShare} activeOpacity={0.7}>
                <Text style={styles.sheetShareText}>Share</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }

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
        onPress={openSheet}
        activeOpacity={0.8}
      >
        {/* Gold decorative quote mark */}
        <Text style={[styles.quoteMark, { color: theme.colors.gold }]}>"</Text>

        <Text style={styles.arabic} numberOfLines={3}>{content.arabic}</Text>

        {/* Gold divider */}
        <View style={[styles.goldDivider, { backgroundColor: theme.colors.gold }]} />
        
        <Text style={styles.translation} numberOfLines={2}>"{content.translation}"</Text>
        <Text style={styles.reference}>{content.reference}</Text>

        <Text style={styles.tapHint}>Tap to read more</Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: backdropAnim },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.sheetLabel}>
                {content.isHadith ? 'Daily Hadith' : 'Daily Verse'}
              </Text>

              <Text style={[styles.sheetQuoteMark, { color: theme.colors.gold }]}>"</Text>

              <Text style={styles.sheetArabic}>{content.arabic}</Text>

              <View style={[styles.sheetDivider, { backgroundColor: theme.colors.gold }]} />

              <Text style={styles.sheetTranslation}>"{content.translation}"</Text>

              {content.narrator && (
                <Text style={styles.sheetNarrator}>Narrated by {content.narrator}</Text>
              )}

              <Text style={styles.sheetReference}>{content.reference}</Text>

              <TouchableOpacity style={styles.sheetShareButton} onPress={handleShare} activeOpacity={0.7}>
                <Text style={styles.sheetShareText}>Share</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
});

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
    fontFamily: theme.typography.fontFamily.headingMedium,
    color: theme.colors.text.secondary,
  },
  shareButton: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
  },
  verseContainer: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    backgroundColor: theme.colors.card.background,
    borderColor: theme.colors.border.primary,
  },
  quoteMark: {
    fontSize: 60,
    fontFamily: theme.typography.fontFamily.headingRegular,
    textAlign: 'center',
    lineHeight: 60,
    marginBottom: theme.spacing.xs,
    opacity: 0.6,
  },
  arabic: {
    fontSize: theme.typography.fontSize['3xl'],
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 36,
    fontFamily: theme.typography.fontFamily.arabic,
    color: theme.colors.text.primary,
  },
  goldDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
    opacity: 0.4,
  },
  translation: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.headingRegular,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 26,
    fontStyle: 'italic',
    color: theme.colors.text.secondary,
  },
  narrator: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
    fontStyle: 'italic',
    color: theme.colors.text.muted,
  },
  reference: {
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.muted,
  },
  tapHint: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    opacity: 0.7,
  },
  // ── Bottom Sheet styles ──
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background.overlay,
  },
  sheet: {
    backgroundColor: theme.colors.card.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.primary,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  sheetQuoteMark: {
    fontSize: 72,
    fontFamily: theme.typography.fontFamily.headingRegular,
    textAlign: 'center',
    lineHeight: 72,
    marginBottom: theme.spacing.sm,
    opacity: 0.5,
  },
  sheetArabic: {
    fontSize: theme.typography.fontSize['4xl'],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 44,
    fontFamily: theme.typography.fontFamily.arabic,
    color: theme.colors.text.primary,
  },
  sheetDivider: {
    width: 48,
    height: 2,
    borderRadius: 1,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
    opacity: 0.4,
  },
  sheetTranslation: {
    fontSize: 19,
    fontFamily: theme.typography.fontFamily.headingRegular,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 30,
    fontStyle: 'italic',
    color: theme.colors.text.secondary,
  },
  sheetNarrator: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
    color: theme.colors.text.muted,
  },
  sheetReference: {
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing['2xl'],
  },
  sheetShareButton: {
    alignSelf: 'center',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  sheetShareText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.contrast,
  },
});

export default React.memo(DailyVerse);

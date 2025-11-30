import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';

interface NextPrayerCardProps {
  prayer: PrayerTime;
  onPrepare: () => void;
}

const { width } = Dimensions.get('window');

const NextPrayerCard: React.FC<NextPrayerCardProps> = ({ prayer, onPrepare }) => {
  const { theme } = useTheme();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = prayer.time.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Now');
        setProgress(1);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes} minutes`);
      }

      // Calculate progress (assuming 5 hours between prayers on average)
      const totalTime = 5 * 60 * 60 * 1000; // 5 hours in ms
      const elapsed = totalTime - diff;
      setProgress(Math.min(Math.max(elapsed / totalTime, 0), 1));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [prayer]);

  const getPrayerGradient = (): [string, string] => {
    return [theme.colors.card.background, theme.colors.card.hover];
  };

  return (
    <LinearGradient
      colors={getPrayerGradient()}
      style={[styles.container, { borderColor: theme.colors.primary.DEFAULT, shadowColor: theme.colors.primary.DEFAULT }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={[styles.nextLabel, { color: theme.colors.text.secondary }]}>NEXT PRAYER</Text>
        <Text style={[styles.timeRemaining, { color: theme.colors.text.primary }]}>{timeRemaining}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.prayerName, { color: theme.colors.text.primary }]}>
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
        </Text>
        <Text style={[styles.prayerTime, { color: theme.colors.text.secondary }]}>
          {PrayerTimeService.formatPrayerTime(prayer.time)}
        </Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < Math.floor(progress * 5) && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={[styles.prepareButton, { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.light }]} onPress={onPrepare}>
        <Text style={[styles.prepareButtonText, { color: theme.colors.primary.contrast }]}>Prepare Mindfully</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,      // xl
    marginVertical: 16,        // lg
    borderRadius: 20,          // xl
    padding: 20,               // xl
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,          // lg
  },
  nextLabel: {
    fontSize: 11,              // xs
    fontWeight: '600',         // semibold
    letterSpacing: 1,
  },
  timeRemaining: {
    fontSize: 14,              // md
    fontWeight: '600',         // semibold
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,          // xl
  },
  prayerName: {
    fontSize: 32,              // 5xl
    fontWeight: '700',         // bold
    marginBottom: 8,           // sm
  },
  prayerTime: {
    fontSize: 20,              // 2xl
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,                    // sm
    marginBottom: 20,          // xl
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#FFFFFF',
  },
  prepareButton: {
    borderRadius: 12,          // md
    paddingVertical: 14,       // md+
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  prepareButtonText: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
  },
});

export default NextPrayerCard;
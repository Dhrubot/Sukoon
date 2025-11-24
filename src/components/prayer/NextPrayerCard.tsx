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

interface NextPrayerCardProps {
  prayer: PrayerTime;
  onPrepare: () => void;
}

const { width } = Dimensions.get('window');

const NextPrayerCard: React.FC<NextPrayerCardProps> = ({ prayer, onPrepare }) => {
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

  const getPrayerGradient = (name: string): [string, string] => {
    // Use consistent dark theme with turquoise accent
    return ['#252B47', '#2D3454'];
  };

  return (
    <LinearGradient
      colors={getPrayerGradient(prayer.name)}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.nextLabel}>NEXT PRAYER</Text>
        <Text style={styles.timeRemaining}>{timeRemaining}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prayerName}>
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
        </Text>
        <Text style={styles.prayerTime}>
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

      <TouchableOpacity style={styles.prepareButton} onPress={onPrepare}>
        <Text style={styles.prepareButtonText}>Prepare Mindfully</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00C9A7', // Turquoise border
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  timeRemaining: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
  },
  prayerName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  prayerTime: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
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
    backgroundColor: '#00C9A7', // Turquoise button
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1DD1A1',
  },
  prepareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NextPrayerCard;
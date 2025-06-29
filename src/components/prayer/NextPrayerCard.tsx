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
    const gradients: Record<string, [string, string]> = {
      fajr: ['#1a237e', '#3949ab'],
      dhuhr: ['#f57c00', '#ffb74d'],
      asr: ['#ff6f00', '#ffca28'],
      maghrib: ['#c2185b', '#f06292'],
      isha: ['#512da8', '#7e57c2'],
    };
    return gradients[name] || ['#1B5E3F', '#2E7D32'];
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  prepareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NextPrayerCard;
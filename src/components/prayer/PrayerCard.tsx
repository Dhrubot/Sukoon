import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { format, isPast, isFuture } from 'date-fns';
import { PrayerTime, PrayerRecord } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';

interface PrayerCardProps {
  prayer: PrayerTime;
  record?: PrayerRecord;
  onComplete: () => void;
  currentTime: Date;
}

const { width } = Dimensions.get('window');

const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  record,
  onComplete,
  currentTime,
}) => {
  const getPrayerIcon = (name: string): string => {
    const icons: Record<string, string> = {
      fajr: '🌅',
      dhuhr: '☀️',
      asr: '🌤',
      maghrib: '🌇',
      isha: '🌙',
    };
    return icons[name] || '🕌';
  };

  const getStatusColor = (): string => {
    if (record?.status === 'prayed') return '#4CAF50';
    if (record?.status === 'missed' && isPast(prayer.time)) return '#F44336';
    if (isFuture(prayer.time)) return '#FFFFFF';
    return '#FF9800'; // Current or recently passed
  };

  const getStatusText = (): string => {
    if (record?.status === 'prayed') {
      return record.mindfulnessCompleted ? '✓ Prayed Mindfully' : '✓ Prayed';
    }
    if (isPast(prayer.time) && !record) {
      return 'Missed';
    }
    if (prayer.isNext) {
      return 'Next Prayer';
    }
    if (isFuture(prayer.time)) {
      return 'Upcoming';
    }
    return 'Time to Pray';
  };

  const isActive = prayer.isNext || 
    (isPast(prayer.time) && !record && 
     Math.abs(currentTime.getTime() - prayer.time.getTime()) < 30 * 60 * 1000);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.activeContainer,
        record?.status === 'prayed' && styles.completedContainer,
      ]}
      onPress={onComplete}
      disabled={record?.status === 'prayed' || isFuture(prayer.time)}
      activeOpacity={0.8}
    >
      <View style={styles.leftSection}>
        <Text style={styles.icon}>{getPrayerIcon(prayer.name)}</Text>
        <View style={styles.timeInfo}>
          <Text style={[styles.prayerName, isActive && styles.activeName]}>
            {PrayerTimeService.getPrayerDisplayName(prayer.name)}
          </Text>
          <Text style={[styles.time, isActive && styles.activeTime]}>
            {format(prayer.time, 'h:mm a')}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {record?.reflectionAdded && (
          <Text style={styles.reflectionBadge}>📝</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  completedContainer: {
    opacity: 0.7,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  timeInfo: {
    justifyContent: 'center',
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeName: {
    fontSize: 20,
    fontWeight: '700',
  },
  time: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTime: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  reflectionBadge: {
    fontSize: 16,
  },
});

export default PrayerCard;
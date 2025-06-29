import { format, isToday, isTomorrow, isYesterday, differenceInMinutes } from 'date-fns';

export const formatTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const diffMinutes = differenceInMinutes(targetDate, now);

  if (diffMinutes <= 0) {
    return 'Now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  return `${days} days`;
};

export const formatPrayerDate = (date: Date): string => {
  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'EEEE, MMM d');
};

export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export const getGreeting = (name?: string): string => {
  const timeOfDay = getTimeOfDay();
  const displayName = name ? `, ${name}` : '';
  
  switch (timeOfDay) {
    case 'morning':
      return `Good morning${displayName} ☀️`;
    case 'afternoon':
      return `Good afternoon${displayName} 🌞`;
    case 'evening':
      return `Good evening${displayName} 🌅`;
    case 'night':
      return `Peace be upon you${displayName} 🌙`;
  }
};

export const getIslamicDate = (): string => {
  // This is a placeholder - in production, use a proper Islamic calendar library
  // For now, we'll return a formatted Gregorian date
  return format(new Date(), 'dd MMMM yyyy');
};

export const isPrayerTime = (prayerTime: Date, windowMinutes: number = 30): boolean => {
  const now = new Date();
  const diffMinutes = Math.abs(differenceInMinutes(now, prayerTime));
  return diffMinutes <= windowMinutes;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return remainingSeconds > 0 
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes} minutes`;
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
};
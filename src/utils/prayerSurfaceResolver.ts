import { HERO_ADVANCE_MINUTES } from '../constants/NotificationConstants';
import { PrayerRecord, PrayerTime } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_WINDOW_MS = 4 * 60 * 60 * 1000;

export type PrayerSurfacePhase = 'pre_adhan' | 'fiqh_window' | 'prayed';
export type PrayerSurfaceCountdownMode = 'current_prayer_end' | 'next_prayer_start';

export interface PrayerSurfaceState {
  activePrayer: PrayerTime;
  displayPrayer: PrayerTime;
  countdownTarget: {
    name: string;
    time: Date;
    timestamp: number;
    isNext?: boolean;
  };
  nextChronologicalPrayer: PrayerTime | null;
  phase: PrayerSurfacePhase;
  countdownMode: PrayerSurfaceCountdownMode;
  progress: number;
  prayerStatuses: string[];
  displayWindowStart: Date;
  displayWindowEnd: Date;
}

function isPrayerLogged(records: PrayerRecord[], prayerName: string): boolean {
  return records.some((record) => record.prayer === prayerName && record.status === 'prayed');
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function shiftPrayer(prayer: PrayerTime, deltaMs: number): PrayerTime {
  const shiftedTime = new Date(prayer.time.getTime() + deltaMs);
  return {
    ...prayer,
    time: shiftedTime,
    timestamp: (prayer.timestamp ?? prayer.time.getTime()) + deltaMs,
    isNext: false,
  };
}

function findPrayerIndex(prayerTimes: PrayerTime[], prayer: PrayerTime): number {
  const exactIndex = prayerTimes.findIndex(
    (candidate) =>
      candidate.name === prayer.name &&
      candidate.time.getTime() === prayer.time.getTime(),
  );

  if (exactIndex !== -1) {
    return exactIndex;
  }

  return prayerTimes.findIndex((candidate) => candidate.name === prayer.name);
}

function inferTomorrowFajrFallback(prayerTimes: PrayerTime[]): PrayerTime | null {
  const firstPrayer = prayerTimes[0];
  if (!firstPrayer) {
    return null;
  }

  return shiftPrayer(firstPrayer, DAY_MS);
}

function resolvePreviousBoundary(
  prayerTimes: PrayerTime[],
  prayer: PrayerTime,
): PrayerTime | null {
  const prayerIndex = findPrayerIndex(prayerTimes, prayer);

  if (prayerIndex > 0) {
    return prayerTimes[prayerIndex - 1];
  }

  const lastPrayer = prayerTimes[prayerTimes.length - 1];
  if (!lastPrayer) {
    return null;
  }

  if (prayerIndex === 0) {
    return shiftPrayer(lastPrayer, -DAY_MS);
  }

  if (prayer.name === prayerTimes[0]?.name) {
    return lastPrayer;
  }

  return null;
}

function resolveNextChronologicalPrayer(
  prayerTimes: PrayerTime[],
  activePrayer: PrayerTime,
  tomorrowFajr: PrayerTime | null,
): PrayerTime | null {
  const prayerIndex = findPrayerIndex(prayerTimes, activePrayer);

  if (prayerIndex !== -1 && prayerIndex < prayerTimes.length - 1) {
    return prayerTimes[prayerIndex + 1];
  }

  if (tomorrowFajr) {
    return tomorrowFajr;
  }

  return inferTomorrowFajrFallback(prayerTimes);
}

function resolveCurrentPrayerWindowEnd(
  activePrayer: PrayerTime,
  nextChronologicalPrayer: PrayerTime | null,
  todaySunrise: Date | null | undefined,
  prayerTimes: PrayerTime[],
): {
  name: string;
  time: Date;
  timestamp: number;
  isNext?: boolean;
} {
  if (activePrayer.name === 'Fajr' && todaySunrise && todaySunrise > activePrayer.time) {
    return {
      name: 'Sunrise',
      time: todaySunrise,
      timestamp: todaySunrise.getTime(),
      isNext: false,
    };
  }

  if (nextChronologicalPrayer) {
    return nextChronologicalPrayer;
  }

  return inferTomorrowFajrFallback(prayerTimes) ?? activePrayer;
}

function resolveElapsedProgress(
  start: Date,
  end: Date,
  now: Date,
): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) {
    return now >= end ? 1 : 0;
  }

  const elapsed = now.getTime() - start.getTime();
  return clamp01(elapsed / total);
}

function resolvePrayerStatuses(
  prayerTimes: PrayerTime[],
  records: PrayerRecord[],
  activePrayer: PrayerTime,
  displayPrayer: PrayerTime,
  phase: PrayerSurfacePhase,
  countdownMode: PrayerSurfaceCountdownMode,
  now: Date,
): string[] {
  return prayerTimes.map((prayer) => {
    if (isPrayerLogged(records, prayer.name)) {
      return 'prayed';
    }

    if (prayer.name === displayPrayer.name) {
      if (
        phase === 'fiqh_window' &&
        displayPrayer.name === activePrayer.name &&
        countdownMode === 'current_prayer_end'
      ) {
        return 'current';
      }

      return 'next';
    }

    if (phase !== 'pre_adhan' && prayer.name === activePrayer.name) {
      return countdownMode === 'current_prayer_end' ? 'current' : 'upcoming';
    }

    if (prayer.time < now) {
      return 'missed';
    }

    return 'upcoming';
  });
}

export function resolvePrayerSurfaceState(
  prayerTimes: PrayerTime[],
  records: PrayerRecord[],
  nextPrayer: PrayerTime | null,
  tomorrowFajr: PrayerTime | null,
  now: Date = new Date(),
  todaySunrise?: Date | null,
): PrayerSurfaceState | null {
  if (!nextPrayer || prayerTimes.length === 0) {
    return null;
  }

  const isPrayerTimePassed = nextPrayer.time <= now;
  const isActivePrayerLogged = isPrayerLogged(records, nextPrayer.name);
  const nextChronologicalPrayer = resolveNextChronologicalPrayer(prayerTimes, nextPrayer, tomorrowFajr);
  const currentPrayerWindowEnd = resolveCurrentPrayerWindowEnd(
    nextPrayer,
    nextChronologicalPrayer,
    todaySunrise,
    prayerTimes,
  );

  const phase: PrayerSurfacePhase = !isPrayerTimePassed
    ? 'pre_adhan'
    : isActivePrayerLogged
      ? 'prayed'
      : 'fiqh_window';

  let displayPrayer = nextPrayer;
  let countdownTarget = nextPrayer;
  let countdownMode: PrayerSurfaceCountdownMode = 'next_prayer_start';
  let displayWindowStart = resolvePreviousBoundary(prayerTimes, nextPrayer)?.time
    ?? new Date(nextPrayer.time.getTime() - FALLBACK_WINDOW_MS);

  if (phase !== 'pre_adhan') {
    const minutesUntilCurrentWindowEnd = currentPrayerWindowEnd
      ? (currentPrayerWindowEnd.time.getTime() - now.getTime()) / (1000 * 60)
      : Number.POSITIVE_INFINITY;
    const shouldSwitchToNextPrayer = !!nextChronologicalPrayer && (
      isActivePrayerLogged ||
      (
        currentPrayerWindowEnd.name === nextChronologicalPrayer.name &&
        minutesUntilCurrentWindowEnd > 0 &&
        minutesUntilCurrentWindowEnd <= HERO_ADVANCE_MINUTES
      )
    );

    displayWindowStart = nextPrayer.time;

    if (shouldSwitchToNextPrayer && nextChronologicalPrayer) {
      displayPrayer = nextChronologicalPrayer;
      countdownTarget = nextChronologicalPrayer;
      countdownMode = 'next_prayer_start';
    } else {
      displayPrayer = nextPrayer;
      countdownTarget = currentPrayerWindowEnd;
      countdownMode = 'current_prayer_end';
    }
  }

  const displayWindowEnd = countdownTarget.time;
  const progress = resolveElapsedProgress(displayWindowStart, displayWindowEnd, now);
  const prayerStatuses = resolvePrayerStatuses(
    prayerTimes,
    records,
    nextPrayer,
    displayPrayer,
    phase,
    countdownMode,
    now,
  );

  return {
    activePrayer: nextPrayer,
    displayPrayer,
    countdownTarget,
    nextChronologicalPrayer,
    phase,
    countdownMode,
    progress,
    prayerStatuses,
    displayWindowStart,
    displayWindowEnd,
  };
}

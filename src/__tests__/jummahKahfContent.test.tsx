import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { createTheme } from '../theme';

const mockTheme = createTheme('midnight');

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (createStyles: (theme: typeof mockTheme) => unknown) => createStyles(mockTheme),
}));

import { SURAH_AL_KAHF_AYAHS } from '../constants/surahAlKahf';
import JummahSunnahSheet from '../components/prayer/JummahSunnahSheet';

describe('Jummah Al-Kahf bundled content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'spring').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
    jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
    jest.spyOn(Animated, 'parallel').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bundles all 110 ayahs with Arabic, transliteration, and translation', () => {
    expect(SURAH_AL_KAHF_AYAHS).toHaveLength(110);
    expect(
      SURAH_AL_KAHF_AYAHS.every((ayah) =>
        ayah.arabic.trim().length > 0 &&
        ayah.transliteration.trim().length > 0 &&
        ayah.translation.trim().length > 0
      )
    ).toBe(true);
  });

  it('renders the Kahf sheet immediately without async loading state', () => {
    const screen = render(
      <JummahSunnahSheet
        visible
        topic="kahf"
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('Surah Al-Kahf')).toBeTruthy();
    expect(screen.getByText('Ayah 1')).toBeTruthy();
    expect(screen.queryByText('Loading Surah Al-Kahf…')).toBeNull();
  });
});

import React from 'react';
import { Animated, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { createTheme } from '../theme';

const mockImpactAsync = jest.fn();
const mockTheme = createTheme('midnight');

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (createStyles: (theme: typeof mockTheme) => unknown) => createStyles(mockTheme),
}));

import { LoadingScreen } from '../components/LoadingScreen';
import NotificationToggleButton from '../components/common/NotificationToggleButton';
import AutoDeduceSheet from '../components/AutoDeduceSheet';
import { SegmentedControl } from '../components/settings/SegmentedControl';
import { SettingRow } from '../components/settings/SettingRow';
import { SettingSection } from '../components/settings/SettingSection';

describe('presentation components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, 'sequence').mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the loading screen and triggers retry presses', () => {
    const onPress = jest.fn();
    const screen = render(
      <LoadingScreen message="Initializing Sukoon..." onPress={onPress} />
    );

    expect(screen.getByText('Initializing Sukoon...')).toBeTruthy();
    fireEvent.press(screen.getByText('Initializing Sukoon...'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders settings primitives and handles interactions', () => {
    const onRowPress = jest.fn();
    const onValueChange = jest.fn();

    const screen = render(
      <>
        <SettingSection title="Notifications">
          <SettingRow
            label="Adhan"
            subtitle="Play the call to prayer"
            value="Enabled"
            onPress={onRowPress}
            icon={<Text>icon</Text>}
            iconColor="#00ffaa"
          />
        </SettingSection>
        <SegmentedControl
          options={[
            { value: 'short', label: 'Short', description: 'Short adhan' },
            { value: 'full', label: 'Full', description: 'Full adhan' },
          ]}
          selectedValue="short"
          onValueChange={onValueChange}
        />
      </>
    );

    expect(screen.getByText('Notifications')).toBeTruthy();
    fireEvent.press(screen.getByText('Adhan'));
    expect(onRowPress).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Full'));
    expect(onValueChange).toHaveBeenCalledWith('full');
  });

  it('toggles notification state when enabled and ignores disabled presses', () => {
    const onToggle = jest.fn();

    const enabledButton = render(
      <NotificationToggleButton
        prayerName="Fajr"
        enabled
        onToggle={onToggle}
      />
    );

    fireEvent.press(enabledButton.UNSAFE_getByType(require('react-native').TouchableOpacity));
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('Fajr', false);
    enabledButton.unmount();

    const disabledButton = render(
      <NotificationToggleButton
        prayerName="Isha"
        enabled={false}
        disabled
        onToggle={onToggle}
      />
    );

    fireEvent.press(disabledButton.UNSAFE_getByType(require('react-native').TouchableOpacity));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the auto-deduce sheet when an event is present and dismisses it', () => {
    const onDismiss = jest.fn();
    const screen = render(
      <AutoDeduceSheet
        visible
        event={{
          type: 'eid_fitr',
          title: 'Tomorrow is Eid al-Fitr!',
          body: 'Ramadan has been 30 days this year.',
          emoji: '🌙',
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Tomorrow is Eid al-Fitr!')).toBeTruthy();
    fireEvent.press(screen.getByText('Alhamdulillah'));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const hidden = render(
      <AutoDeduceSheet visible={false} event={null} onDismiss={onDismiss} />
    );
    expect(hidden.toJSON()).toBeNull();
  });
});

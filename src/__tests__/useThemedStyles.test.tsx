import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { createTheme } from '../theme';

const mockTheme = createTheme('midnight');

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

import { useThemedStyles } from '../hooks/useThemedStyles';

describe('useThemedStyles', () => {
  it('creates memoized styles from the current theme', () => {
    const createStyles = jest.fn((theme) => ({
      label: {
        color: theme.colors.text.primary,
      },
    }));

    const Probe = () => {
      const styles = useThemedStyles(createStyles);
      return <Text style={styles.label}>Theme probe</Text>;
    };

    const screen = render(<Probe />);
    expect(screen.getByText('Theme probe')).toBeTruthy();
    expect(createStyles).toHaveBeenCalledWith(mockTheme);
  });
});

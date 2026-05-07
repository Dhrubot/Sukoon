import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { createTheme } from '../theme';

const mockTheme = createTheme('midnight');

jest.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('../hooks/useThemedStyles', () => ({
  useThemedStyles: (createStyles: (theme: typeof mockTheme) => unknown) => createStyles(mockTheme),
}));

const { CalculationMethodModal } = require('../screens/Settings/modals/CalculationMethodModal');

describe('CalculationMethodModal', () => {
  it('renders and selects the automatic regional method option', () => {
    const onAutomaticSelect = jest.fn();
    const onMethodSelect = jest.fn();

    const screen = render(
      <CalculationMethodModal
        visible
        onClose={jest.fn()}
        calculationMethods={[
          { value: 'MWL', label: 'Muslim World League' },
          { value: 'Karachi', label: 'University of Islamic Sciences, Karachi' },
        ]}
        selectedMethod="Karachi"
        onMethodSelect={onMethodSelect}
        regionalMethod="Karachi"
        regionalMethodLabel="University of Islamic Sciences, Karachi"
        regionalCountry="Bangladesh"
        isAutomaticSelected
        onAutomaticSelect={onAutomaticSelect}
      />
    );

    expect(screen.getByText('Automatic for my region')).toBeTruthy();
    expect(screen.getByText('Uses University of Islamic Sciences, Karachi for Bangladesh')).toBeTruthy();

    fireEvent.press(screen.getByText('Automatic for my region'));

    expect(onAutomaticSelect).toHaveBeenCalledTimes(1);
    expect(onMethodSelect).not.toHaveBeenCalled();
  });
});

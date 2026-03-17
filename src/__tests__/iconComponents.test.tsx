import React from 'react';
import { render } from '@testing-library/react-native';

import AsrSvg from '../assets/icons/prayer/AsrSvg';
import DhuhrSvg from '../assets/icons/prayer/DhuhrSvg';
import FajrSvg from '../assets/icons/prayer/FajrSvg';
import IshaSvg from '../assets/icons/prayer/IshaSvg';
import MaghribSvg from '../assets/icons/prayer/MaghribSvg';
import SunriseSvg from '../assets/icons/prayer/SunriseSvg';
import SunsetSvg from '../assets/icons/prayer/SunsetSvg';
import { Icon } from '../components/common/Icon';

describe('icon components', () => {
  it('renders the prayer svg icon set', () => {
    const icons = [
      AsrSvg,
      DhuhrSvg,
      FajrSvg,
      IshaSvg,
      MaghribSvg,
      SunriseSvg,
      SunsetSvg,
    ];

    for (const Component of icons) {
      const screen = render(<Component size={20} color="#123456" />);
      expect(screen.toJSON()).toBeTruthy();
      screen.unmount();
    }
  });

  it('renders the universal icon wrapper for both svg and image sources', () => {
    const svgIcon = render(<Icon source={FajrSvg} size={18} color="#abcdef" />);
    expect(svgIcon.toJSON()).toBeTruthy();
    svgIcon.unmount();

    const imageIcon = render(<Icon source={{ uri: 'test-icon' }} size={22} color="#fedcba" />);
    expect(imageIcon.toJSON()).toBeTruthy();
  });
});

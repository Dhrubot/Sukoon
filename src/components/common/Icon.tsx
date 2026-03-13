// src/components/common/Icon.tsx
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { SvgProps } from 'react-native-svg';

interface IconProps {
  source: ImageSourcePropType | React.FC<SvgProps>;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Universal Icon component that handles both PNG and SVG icons
 * Usage:
 * - For PNG: <Icon source={require('../../assets/icons/icon.png')} size={24} />
 * - For SVG: <Icon source={IconSvg} size={24} color="#fff" />
 */
export const Icon: React.FC<IconProps> = ({ 
  source, 
  size = 24, 
  color,
  style 
}) => {
  // Check if source is a React component (SVG)
  if (typeof source === 'function') {
    const SvgComponent = source as React.FC<SvgProps>;
    return (
      <View style={[{ width: size, height: size }, style]}>
        <SvgComponent 
          width={size} 
          height={size} 
          fill={color}
          stroke={color}
          color={color}
          // @ts-ignore - These props override hardcoded SVG colors
          fillColor={color}
          strokeColor={color}
        />
      </View>
    );
  }

  // Otherwise treat as PNG/image source
  return (
    <Image
      source={source as ImageSourcePropType}
      style={[
        styles.image,
        { width: size, height: size },
        color ? { tintColor: color } : null,
        style
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    // Base style for image icons
  },
});

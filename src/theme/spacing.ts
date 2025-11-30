// src/theme/spacing.ts
export const spacing = {
  xxs: 2,   // Minimal gap
  xs: 4,    // Tight spacing
  sm: 8,    // Small gaps, icon margins
  md: 12,   // Default spacing between items
  lg: 16,   // Card padding, section gaps
  xl: 20,   // Large card padding
  '2xl': 24, // Screen padding
  '3xl': 32, // Large sections
  '4xl': 40, // Extra large spacing
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};

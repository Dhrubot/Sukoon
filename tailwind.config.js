/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B5E3F',
          light: '#2E7D32',
          dark: '#14432B',
        },
        secondary: {
          DEFAULT: '#D4AF37',
          light: '#FFD54F',
          dark: '#B8941F',
        },
        prayer: {
          fajr: '#3949AB',
          dhuhr: '#FFB74D',
          asr: '#FF9800',
          maghrib: '#E91E63',
          isha: '#512DA8',
        },
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
      fontFamily: {
        'arabic': ['Amiri', 'serif'],
        'sans': ['Rubik', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
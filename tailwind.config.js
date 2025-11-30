/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        background: {
          DEFAULT: '#1A1F3A', // Dark navy background
          light: '#252B47',   // Lighter navy for cards
          dark: '#131729',    // Darker navy for depth
        },
        primary: {
          DEFAULT: '#00C9A7', // Turquoise accent
          light: '#1DD1A1',   // Lighter turquoise
          dark: '#00A589',    // Darker turquoise
        },
        secondary: {
          DEFAULT: '#6C7A89', // Gray for secondary elements
          light: '#95A5A6',   // Light gray
          dark: '#4A5568',    // Dark gray
        },
        text: {
          DEFAULT: '#FFFFFF', // White text
          secondary: '#A0AEC0', // Gray text
          muted: '#718096',   // Muted text
        },
        card: {
          DEFAULT: '#252B47', // Card background
          hover: '#2D3454',   // Card hover
        },
        prayer: {
          fajr: '#3949AB',
          dhuhr: '#FFB74D',
          asr: '#FF9800',
          maghrib: '#E91E63',
          isha: '#512DA8',
        },
        success: '#00C9A7',
        warning: '#FFB74D',
        error: '#F44336',
        info: '#00C9A7',
      },
      fontFamily: {
        'arabic': ['Amiri', 'serif'],
        'sans': ['Rubik', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
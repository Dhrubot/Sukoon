module.exports = {
  root: true,
  ignorePatterns: ['.expo/', 'android/app/build/', 'coverage/', 'dist/', 'edge-api/dist/', 'ios/build/'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react', 'react-native', '@typescript-eslint'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    'react-native/react-native': true,
  },
  rules: {
    // Add custom rules here
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-unused-styles': 'off',
    'react-native/sort-styles': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    'prefer-const': 'warn',
    'no-useless-escape': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'react-native/no-single-element-style-arrays': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['jest.setup.js', 'jest.afterEnv.js', '**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.{test,spec}.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      files: ['jest.setup.js'],
      rules: {
        'no-undef': 'off',
      },
    },
    {
      files: ['app.config.js', 'metro.config.js', 'plugins/**/*.{js,ts}', 'src/assets/**/*.{ts,tsx}'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};

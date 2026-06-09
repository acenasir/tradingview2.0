/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // TradingView-like dark palette
        bg: {
          DEFAULT: '#131722', // app background
          panel: '#1e222d', // panels / toolbars
          elevated: '#262b3c', // hovered / elevated surfaces
          input: '#2a2e39',
        },
        border: {
          DEFAULT: '#2a2e39',
          strong: '#363a45',
        },
        text: {
          DEFAULT: '#d1d4dc',
          muted: '#787b86',
          bright: '#f0f3fa',
        },
        accent: {
          DEFAULT: '#2962ff', // TradingView blue
          hover: '#1e53e5',
        },
        up: '#26a69a', // bullish green
        down: '#ef5350', // bearish red
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Trebuchet MS',
          'Roboto',
          'Ubuntu',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};

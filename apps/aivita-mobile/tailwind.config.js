/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Background
        'bg-app':        '#f9f7f4',
        'bg-soft-pink':  '#f5eaed',
        'bg-soft-blue':  '#e8eef8',
        'bg-soft-mint':  '#e5f2ee',
        'bg-soft-purple':'#ede8f5',
        'bg-soft-sage':  '#edf2e8',
        // Text
        'text-primary':   '#1a1a2e',
        'text-secondary': '#4a4a6a',
        'text-muted':     '#9090a8',
        // Accents
        'accent-rose':         '#c8576b',
        'accent-blue-deep':    '#3d5a99',
        'accent-mint-deep':    '#2d7a5f',
        'accent-purple-deep':  '#5e4a8c',
        'accent-sage-deep':    '#4a6e35',
        // Border
        'border-soft': '#e8e4dc',
      },
      borderRadius: {
        'card':  '16px',
        'hero':  '24px',
        'chip':  '100px',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};

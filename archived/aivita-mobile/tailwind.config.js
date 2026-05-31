/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-app': '#f4f3ef',
        'bg-soft-pink': '#f0d4dc',
        'bg-soft-purple': '#e0d8f0',
        'bg-soft-mint': '#d4e8d8',
        'accent-rose': '#9c5e6c',
        'accent-purple': '#6e5fa0',
        'text-primary': '#2a2540',
        'text-secondary': '#6a6580',
        'text-muted': '#9a96a8',
        'border-soft': '#e8e4dc',
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'Inter', 'system-ui'],
        bold: ['Inter_700Bold', 'Inter', 'system-ui'],
      },
    },
  },
  plugins: [],
};

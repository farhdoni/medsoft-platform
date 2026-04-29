import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'navy': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'medical-blue': {
          50: 'rgb(var(--blue-50) / <alpha-value>)',
          200: 'rgb(var(--blue-200) / <alpha-value>)',
          500: 'rgb(var(--blue-500) / <alpha-value>)',
          700: 'rgb(var(--blue-700) / <alpha-value>)',
        },
        'mint': {
          100: 'rgb(var(--mint-100) / <alpha-value>)',
          300: 'rgb(var(--mint-300) / <alpha-value>)',
          500: 'rgb(var(--mint-500) / <alpha-value>)',
          700: 'rgb(var(--mint-700) / <alpha-value>)',
        },
        'pink': {
          50: 'rgb(var(--pink-50) / <alpha-value>)',
          100: 'rgb(var(--pink-100) / <alpha-value>)',
          200: 'rgb(var(--pink-200) / <alpha-value>)',
          300: 'rgb(var(--pink-300) / <alpha-value>)',
          400: 'rgb(var(--pink-400) / <alpha-value>)',
          500: 'rgb(var(--pink-500) / <alpha-value>)',
          600: 'rgb(var(--pink-600) / <alpha-value>)',
          700: 'rgb(var(--pink-700) / <alpha-value>)',
        },
        'severity': {
          100: 'rgb(var(--red-100) / <alpha-value>)',
          500: 'rgb(var(--red-500) / <alpha-value>)',
          700: 'rgb(var(--red-700) / <alpha-value>)',
        },
        'violet': {
          100: 'rgb(var(--violet-100) / <alpha-value>)',
          300: 'rgb(var(--violet-300) / <alpha-value>)',
          700: 'rgb(var(--violet-700) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        'tightest': '-0.05em',
        'tighter': '-0.04em',
        'tight': '-0.03em',
      },
      backgroundImage: {
        'gradient-base': 'linear-gradient(180deg, rgb(var(--bg-base-1)) 0%, rgb(var(--bg-base-2)) 50%, rgb(var(--bg-base-3)) 100%)',
        'gradient-pink-blue-mint': 'linear-gradient(135deg, rgb(var(--blue-700)) 0%, rgb(var(--pink-500)) 60%, rgb(var(--mint-700)) 100%)',
        'gradient-pink-blue': 'linear-gradient(135deg, rgb(var(--pink-500)) 0%, rgb(var(--blue-700)) 100%)',
        'gradient-air-pink': 'linear-gradient(135deg, rgba(255,232,240,0.7), rgba(255,218,232,0.6))',
        'gradient-air-blue': 'linear-gradient(135deg, rgba(180,220,240,0.4), rgba(255,218,232,0.45), rgba(200,235,225,0.4))',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
        'pink': 'var(--shadow-pink)',
        'pink-strong': 'var(--shadow-pink-strong)',
        'mint': 'var(--shadow-mint)',
      },
      animation: {
        'drift-1': 'drift1 30s ease-in-out infinite',
        'drift-2': 'drift2 35s ease-in-out infinite',
        'drift-3': 'drift3 40s ease-in-out infinite',
        'drift-4': 'drift4 45s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 1s ease-out',
      },
      keyframes: {
        drift1: { '0%, 100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(50px,30px) scale(1.1)' } },
        drift2: { '0%, 100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-40px,40px) scale(0.95)' } },
        drift3: { '0%, 100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(60px,-30px) scale(1.05)' } },
        drift4: { '0%, 100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(-30px,-50px) scale(1.08)' } },
        pulseDot: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,132,154,0.5)' }, '50%': { boxShadow: '0 0 0 8px rgba(212,132,154,0)' } },
        fadeInUp: { 'from': { opacity: '0', transform: 'translateY(30px)' }, 'to': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

export default config

/** @type {import('tailwindcss').Config} */
const tokens = require('./src/theme/tokens.json');
const c = tokens.color;

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // Feldführer is light only (D-18). 'class' keeps `dark:` variants inert; none are used.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    // Square corners everywhere (sketch tokens --r-*: 0). Only `rounded-full` keeps a radius,
    // for check circles and dots.
    borderRadius: {
      none: '0px', sm: '0px', DEFAULT: '0px', md: '0px', lg: '0px', xl: '0px',
      '2xl': '0px', '3xl': '0px', full: '9999px',
    },
    extend: {
      colors: {
        bg: c.bg,
        surface: c.surface,
        'surface-2': c.surface2,
        ink: c.ink,
        'ink-muted': c.inkMuted,
        line: c.line,
        'line-soft': c.lineSoft,
        primary: c.primary,
        'on-primary': c.onPrimary,
        accent: c.accent,
        select: c.select,
        danger: c.danger,
        'danger-soft': c.dangerSoft,
        warn: c.warn,
        'warn-soft': c.warnSoft,
        'ok-soft': c.okSoft,
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Newsreader', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

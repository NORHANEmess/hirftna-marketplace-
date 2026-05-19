/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    fontFamily: {
      sans:    ['"Plus Jakarta Sans"', '"Readex Pro"', 'system-ui', 'sans-serif'],
      display: ['"Plus Jakarta Sans"', '"Readex Pro"', 'system-ui', 'sans-serif'],
    },
    extend: {
      colors: {
        // ── CREAM & BEIGE BASE ──────────────────────────
        cream: {
          50:  '#FEFDFB',
          100: '#FDF9F3',
          200: '#FAF4EA',
          300: '#F5ECD8',
          400: '#EFE0C4',
          500: '#E8D4B0',
        },
        beige: {
          100: '#F7F0E6',
          200: '#EDE0CC',
          300: '#E2CFB2',
          400: '#D6BE98',
          500: '#C9AC7E',
        },
        // ── SAGE GREEN ACCENT ───────────────────────────
        sage: {
          50:  '#F2F5F0',
          100: '#E4EBE0',
          200: '#C9D7C1',
          300: '#ADBFA3',
          400: '#8FA684',
          500: '#728C67',  // ← primary accent
          600: '#5C7253',
          700: '#475840',
          800: '#313D2C',
          900: '#1A2117',
        },
        // ── WARM NEUTRALS ───────────────────────────────
        warm: {
          50:  '#FAFAF8',
          100: '#F5F4F0',
          200: '#ECEAE4',
          300: '#D9D6CC',
          400: '#B8B4A8',
          500: '#8C8878',
          600: '#6B6758',
          700: '#4F4C40',
          800: '#35322A',
          900: '#1C1A14',
        },
        // ── BRICK RED ACCENT ────────────────────────────
        brick: {
          50:  '#FDF5F3',
          100: '#FAEAE5',
          200: '#F2D0C5',
          300: '#E5A999',
          400: '#C27560',
          500: '#8B3A2A',
          600: '#76311F',
          700: '#5F2719',
          800: '#4A1E13',
          900: '#351510',
        },
        // ── STATUS COLORS ────────────────────────────────
        success: '#5C8A4A',
        warning: '#C4862A',
        danger:  '#C0443A',
        info:    '#3A6EA8',
      },
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft-sm': '0 2px 8px 0 rgba(60, 50, 30, 0.08)',
        'soft':    '0 4px 16px 0 rgba(60, 50, 30, 0.10)',
        'soft-md': '0 6px 24px 0 rgba(60, 50, 30, 0.12)',
        'soft-lg': '0 12px 40px 0 rgba(60, 50, 30, 0.15)',
        'soft-xl': '0 20px 60px 0 rgba(60, 50, 30, 0.18)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      screens: {
        'xs': '380px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'ken-burns':     'kenBurns 7s ease-in-out infinite alternate',
        'progress-fill': 'progressFill 5s linear forwards',
      },
      keyframes: {
        fadeIn:       { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:      { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown:    { from: { opacity: 0, transform: 'translateY(-12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        kenBurns:     { '0%': { transform: 'scale(1) translate(0,0)' }, '100%': { transform: 'scale(1.08) translate(-1%,-1%)' } },
        progressFill: { '0%': { transform: 'scaleX(0)' }, '100%': { transform: 'scaleX(1)' } },
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        handwriting: ['"Courgette"', 'cursive'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        slate: {
          950: '#020617',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        heritage: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        forest: {
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#34d399',
          500: '#10b981',
          700: '#047857',
        },
      },
      boxShadow: {
        soft: '0 20px 45px rgba(15, 23, 42, 0.12)',
        'soft-xl': '0 32px 80px rgba(15, 23, 42, 0.22)',
        'glow-amber': '0 28px 60px rgba(251, 191, 36, 0.28)',
        'glow-rose': '0 28px 60px rgba(244, 114, 182, 0.28)',
      },
      backgroundImage: {
        'heritage-gradient': 'radial-gradient(circle at 8% 15%, rgba(251, 191, 36, 0.28), transparent 55%), radial-gradient(circle at 92% 8%, rgba(244, 114, 182, 0.24), transparent 48%)',
        'canvas-patina': 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 247, 237, 0.82) 60%, rgba(255, 228, 230, 0.88) 100%)',
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      spacing: {
        18: '4.5rem',
      },
      transitionTimingFunction: {
        'soft-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

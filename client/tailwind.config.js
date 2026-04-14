/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs:     '480px',   // tiny mobile
        tablet: '820px',   // tablet — two-column layout
        laptop: '1024px',  // laptop — three-column layout with word list sidebar
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'float-up': 'floatUp 3s ease-out forwards',
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-in':'bounceIn 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'shake':    'shake 0.4s ease-in-out',
      },
      keyframes: {
        floatUp: {
          '0%':   { opacity: '1', transform: 'translateY(0) scale(1)' },
          '75%':  { opacity: '1', transform: 'translateY(-130px) scale(1.35)' },
          '100%': { opacity: '0', transform: 'translateY(-190px) scale(0.8)' },
        },
        fadeIn:   { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        bounceIn: {
          '0%':   { opacity: '0', transform: 'scale(0.3)' },
          '50%':  { opacity: '1', transform: 'scale(1.06)' },
          '70%':  { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '15%':     { transform: 'translateX(-6px)' },
          '45%':     { transform: 'translateX(6px)' },
          '75%':     { transform: 'translateX(-4px)' },
          '90%':     { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
};

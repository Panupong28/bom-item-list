/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      letterSpacing: {
        'mega-wide': '0.2em',
      },
      boxShadow: {
        'soft-sm': '0 1px 2px 0 rgb(15 23 42 / 0.04)',
        'soft': '0 1px 3px 0 rgb(15 23 42 / 0.05), 0 1px 2px -1px rgb(15 23 42 / 0.04)',
        'soft-md': '0 4px 10px -2px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
        'glow-indigo': '0 10px 30px -10px rgb(79 70 229 / 0.35)',
      },
    },
  },
  plugins: [],
};

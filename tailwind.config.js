/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/styles/**/*.css',
    './public/scripts/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        hack: {
          primary: 'var(--primary)',
          secondary: 'var(--secondary)',
          accent: 'var(--accent)',
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          text: 'var(--text)'
        }
      },
      fontFamily: {
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
        retro: ['var(--font-retro)']
      },
      boxShadow: {
        hack: 'var(--shadow-green)',
        'hack-lg': 'var(--shadow-green-lg)'
      }
    }
  },
  plugins: []
};

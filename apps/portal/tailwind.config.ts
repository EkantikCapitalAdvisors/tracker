import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A4A',
        gold: '#C8A951',
        ivory: '#FAF8F5',
        quiet: '#2E7D52',
        armed: '#C8A951',
        triggered: '#B3402A',
      },
      fontFamily: {
        heading: ['Georgia', 'Times New Roman', 'serif'],
        body: ['Calibri', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

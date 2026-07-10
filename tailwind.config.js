/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        graphite: {
          950: '#0e111a', // Brighter, rich slate base
          900: '#141824', // Main background
          800: '#1c2132', // Panel background
          700: '#252b41', // Card background / borders
          600: '#313955', // Input fields / secondary active states
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pulse: {
          bg:       '#0e1117',
          surface:  '#161b27',
          border:   '#232b3e',
          teal:     '#5dcaa5',
          tealDark: '#085041',
          tealGlow: '#3de0a0',
          orange:   '#f09a7b',
          violet:   '#afaae6',
          blue:     '#85b7eb',
          green:    '#97c459',
          text:     '#e8e6da',
          muted:    '#8a8878',
          critical: '#f87171',
          high:     '#fb923c',
          medium:   '#facc15',
          low:      '#4ade80',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

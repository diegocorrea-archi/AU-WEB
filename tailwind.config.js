/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F4EF',
        ink: '#1B1D1B',
        muted: '#6B6F68',
        line: '#E6E2D8',
        panel: '#FFFFFF',
        sidebar: '#14171A',
        sidebartext: '#E8E6DF',
        union: {
          DEFAULT: '#B9862F',
          light: '#E9D3A6',
          dark: '#8A631F',
        },
        primo: {
          DEFAULT: '#E1543A',
          light: '#F6C7B9',
          dark: '#AD3A25',
        },
        positive: '#4C7A5E',
        negative: '#B4483B',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
}


export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        kurio: {
          bg: '#130D09',
          surface: '#1F150F',
          surfaceAlt: '#261A12',
          card: '#221710',
          border: '#3C281B',
          borderLight: '#523827',
          amber: '#CF8A49',
          amberHover: '#DF9B5A',
          amberDark: '#9A622D',
          text: '#F5EFEA',
          muted: '#A89688',
          subtle: '#7B695B',
          danger: '#E05844',
          success: '#4CAF7A',
        },
      },
       keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};


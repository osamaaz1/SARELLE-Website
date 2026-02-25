import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wimc: {
          bg: '#0A0A0A',
          surface: '#141414',
          'surface-alt': '#1C1C1C',
          border: '#222222',
          'border-alt': '#333333',
          white: '#FFFFFF',
          muted: '#AAAAAA',
          subtle: '#666666',
          dim: '#555555',
          red: '#FF4444',
          green: '#44DD66',
          blue: '#88BBFF',
          yellow: '#FFBB44',
          purple: '#AA88FF',
          orange: '#FF8844',
          // Admin-specific
          sidebar: '#0F0F0F',
          'admin-border': '#1E1E1E',
          'admin-border-alt': '#2A2A2A',
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        accent: ['Dancing Script', 'cursive'],
      },
      aspectRatio: {
        '3/4': '3 / 4',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'toast-in': 'toastIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translate(-50%, -16px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

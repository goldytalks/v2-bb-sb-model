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
        // Terminal theme
        terminal: {
          bg: '#0A0A0A',
          'bg-alt': '#141414',
          fg: '#FFFFFF',
          dim: '#666666',
          border: '#333333',
        },
        // Gold accent palette
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFEC8B',
          dark: '#B8860B',
          muted: '#C5A000',
        },
        // Status colors
        status: {
          success: '#00FF88',
          danger: '#FF4444',
          warning: '#FFAA00',
        },
      },
      fontFamily: {
        mono: ['Space Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'ticker': 'ticker 30s linear infinite',
        'blink': 'blink 1s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'gold': '6px 6px 0px #FFD700',
        'gold-sm': '4px 4px 0px #B8860B',
        'gold-lg': '8px 8px 0px #FFEC8B',
        'glow': '0 0 20px rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;

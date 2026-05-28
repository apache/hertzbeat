import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './packages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        hb: {
          bg: 'var(--hb-bg)',
          surface: 'var(--hb-surface)',
          surface2: 'var(--hb-surface-2)',
          surface3: 'var(--hb-surface-3)',
          border: 'var(--hb-border)',
          borderStrong: 'var(--hb-border-strong)',
          text: 'var(--hb-text)',
          text2: 'var(--hb-text-2)',
          text3: 'var(--hb-text-3)',
          accent: 'var(--hb-accent)',
          accentSoft: 'var(--hb-accent-soft)',
          success: 'var(--hb-success)',
          warning: 'var(--hb-warning)',
          danger: 'var(--hb-danger)'
        }
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px'
      },
      boxShadow: {
        hb: 'var(--hb-shadow)',
        rail: '0 18px 48px rgba(0, 0, 0, 0.34)',
        glow: '0 0 0 1px rgba(93, 139, 244, 0.14), 0 18px 40px rgba(11, 18, 32, 0.42)'
      },
      fontFamily: {
        sans: ['var(--hb-font)'],
        mono: ['var(--hb-mono)']
      },
      backgroundImage: {
        'hb-canvas':
          'radial-gradient(circle at top left, rgba(93, 139, 244, 0.14), transparent 28%), radial-gradient(circle at bottom right, rgba(68, 195, 219, 0.10), transparent 26%), linear-gradient(180deg, rgba(255,255,255,.02), transparent 18%)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;

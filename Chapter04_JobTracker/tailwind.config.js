/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        paper: '#F4F5FA',
        ink: '#111214',
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#12131A',
        },
        base: {
          DEFAULT: '#F4F5FA',
          dark: '#080910',
        },
        line: {
          DEFAULT: '#E3E5EF',
          dark: '#20222D',
        },
        muted: {
          DEFAULT: '#6B7280',
          dark: '#8B8FA3',
        },
        accent: {
          DEFAULT: '#6366F1',
          soft: '#EEF0FF',
          dark: '#818CF8',
        },
        stage: {
          wishlist: '#9095A0',
          applied: '#4C7CF0',
          followup: '#E0A030',
          interview: '#9061F0',
          offer: '#34C77B',
          rejected: '#F0555F',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 20, 25, 0.04), 0 1px 8px rgba(20, 20, 25, 0.04)',
        cardHover: '0 2px 4px rgba(20, 20, 25, 0.06), 0 8px 24px rgba(20, 20, 25, 0.08)',
      },
      borderRadius: {
        xl2: '0.875rem',
      },
    },
  },
  plugins: [],
}

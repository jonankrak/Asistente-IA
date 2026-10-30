/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        a11y: {
          bg: 'var(--color-bg)',
          card: 'var(--color-card)',
          text: 'var(--color-text)',
          primary: 'var(--color-primary)',
          primaryText: 'var(--color-primary-text)',
          focus: 'var(--color-focus)',
          border: 'var(--color-border)',
          accent: 'var(--color-accent)',
          alert: 'var(--color-alert)'
        }
      },
      minHeight: {
        'touch': '64px',
      },
      minWidth: {
        'touch': '64px',
      }
    },
  },
  plugins: [],
}

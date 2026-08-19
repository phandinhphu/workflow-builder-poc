/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0F172A',
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
        },
        page: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        muted: '#64748B',
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#EA580C',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
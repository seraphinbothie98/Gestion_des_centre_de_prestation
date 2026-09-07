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
        // Official Brand Color (Guinean Green / Vert National)
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
          950: '#021e0e',
        },
        // Official Flag Colors (Rouge, Jaune, Vert)
        guinea: {
          red: '#dc2626',
          'red-light': '#ef4444',
          'red-dark': '#b91c1c',
          yellow: '#eab308',
          'yellow-light': '#facc15',
          'yellow-dark': '#ca8a04',
          green: '#16a34a',
          'green-light': '#22c55e',
          'green-dark': '#15803d',
        },
        navy: {
          800: '#0f172a',
          900: '#0b0f19',
          950: '#06090e',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-red': '0 0 25px -5px rgba(220, 38, 38, 0.3)',
        'glow-yellow': '0 0 25px -5px rgba(234, 179, 8, 0.3)',
        'glow-green': '0 0 25px -5px rgba(22, 163, 74, 0.3)',
        'glow': '0 0 25px -5px rgba(22, 163, 74, 0.25)',
        'glow-success': '0 0 25px -5px rgba(22, 163, 74, 0.25)',
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'premium-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}

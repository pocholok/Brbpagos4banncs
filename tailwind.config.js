/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'breb-bg': '#0f0b29', // Color de fondo oscuro aproximado
        'breb-card': '#ffffff',
        'breb-cyan': '#00ffcc', // Para el logo
        'breb-purple': '#8a2be2',
        'breb-input-bg': '#f3f4f6',
      },
    },
  },
  plugins: [],
}

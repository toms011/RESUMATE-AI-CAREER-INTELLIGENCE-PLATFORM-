/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',   // Professional Blue
        secondary: '#475569', // Slate Gray
        dark: '#0f172a',      // Modern Dark Background
        light: '#f8fafc',     // Clean Light Background
      }
    },
  },
  plugins: [],
}
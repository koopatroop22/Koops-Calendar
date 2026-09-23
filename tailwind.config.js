/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'sans-serif'],
        display: ['Space Grotesk', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

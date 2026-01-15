import colors from 'tailwindcss/colors';

const texudo = {
  50: '#fff7e1',
  100: '#ffe9b3',
  200: '#ffdb85',
  300: '#ffd066',
  400: '#ffca45',
  500: '#e3b53d',
  600: '#b7892d',
  700: '#8f6621',
  800: '#664716',
  900: '#4a3410',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    colors: {
      ...colors,
      green: texudo,
    },
    extend: {
      colors: {
        'brand-primary': '#ffffff',
        'brand-secondary': '#ffca45',
        'brand-tertiary': '#0d5051',
        'brand-green': '#ffca45',
        'brand-green-dark': '#b7892d',
      },
      fontFamily: {
        sans: ['DMSans', 'sans-serif'],
        display: ['HKGrotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

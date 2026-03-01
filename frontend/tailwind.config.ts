import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mistral: {
          bg: '#1A1A1A',
          card: '#222222',
          border: '#2E2E2E',
          accent: '#FA500F',
          'accent-hover': '#E04600',
          text: '#FFFAEB',
          'text-secondary': '#999999',
          yellow: '#FFD800',
          'orange-light': '#FFAF00',
          orange: '#FF8205',
          'orange-dark': '#FA500F',
          red: '#E10500',
          'beige-light': '#FFFAEB',
          'beige-medium': '#FFF0C3',
          'beige-dark': '#E9E2CB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

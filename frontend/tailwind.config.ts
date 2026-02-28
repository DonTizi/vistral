import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mistral: {
          bg: '#1a1a1a',
          card: '#242424',
          border: '#333333',
          accent: '#FA500F',
          'accent-hover': '#E04600',
          text: '#FFFAEB',
          'text-secondary': '#999999',
          beige: '#FFF0C3',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

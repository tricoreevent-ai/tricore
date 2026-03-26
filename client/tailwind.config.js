/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#0F5FDB',
          navy: '#0A2C66',
          orange: '#F97316',
          mist: '#E8F0FF'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Sora"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 40px rgba(15, 95, 219, 0.12)'
      }
    }
  },
  plugins: []
};


/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Arial', 'Helvetica', 'sans-serif'],
        display: ['"Abril Fatface"', 'cursive', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        brand: '#bc2938',
        'brand-dark': '#7b1922',
        'brand-bg': '#fce6ef',
        'footer-bg': '#323132',
      },
      borderRadius: {
        'box': '29px',
        'btn': '30px',
      },
    },
  },
  plugins: [],
};

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://kalkulatorspalaniapaliwa.com',
  vite: {
    plugins: [tailwindcss()],
  },
});


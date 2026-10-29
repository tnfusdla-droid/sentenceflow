import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths work for both local preview and GitHub Pages project URLs.
export default defineConfig({
  base: './',
  plugins: [react()],
});

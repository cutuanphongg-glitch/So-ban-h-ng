import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Nếu deploy lên GitHub Pages, đổi base thành '/ten-repo/'
  // VD: nếu repo tên là "sales-app", đặt: base: '/sales-app/'
  // Nếu deploy lên Vercel/Netlify, để '/'
  base: '/',
});

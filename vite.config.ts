import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // base: './' permite que la app funcione tanto en GitHub Pages (https://usuario.github.io/repo/)
  // como en servidor local, ejecutable Windows (.exe) y Capacitor Android sin errores 404.
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin proxy so the httpOnly session cookie just works in development.
    proxy: { '/api': 'http://localhost:4000' },
  },
});

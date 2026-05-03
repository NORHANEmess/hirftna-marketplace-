// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Allow: import { ... } from '../../../shared/schemas/auth.schema.js'
      // This resolves the shared/ folder that sits OUTSIDE the frontend/ directory
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    // Vite's default security policy blocks imports from outside the project root.
    // We must explicitly allow the shared/ directory one level up.
    fs: {
      allow: [
        // Allow the frontend source
        fileURLToPath(new URL('.', import.meta.url)),
        // Allow the shared schemas folder
        fileURLToPath(new URL('../shared', import.meta.url)),
      ],
    },
  },
});

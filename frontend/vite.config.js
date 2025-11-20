import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Add CORS headers for FHEVM WASM threading support
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // Optimize dependencies to handle WASM files
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});

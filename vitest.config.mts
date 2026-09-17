import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Satu konfigurasi tes untuk seluruh workspace.
 *
 * Tanpa `@vitejs/plugin-react`: transformer bawaan Vitest sudah membaca
 * `jsx: react-jsx` dari tsconfig, dan tes di sini tidak memakai Fast Refresh
 * maupun plugin Babel apa pun.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // Tanpa `globals`: tiap berkas tes mengimpor `describe`/`it`/`expect`
    // yang dipakainya, jadi tidak ada nama yang muncul entah dari mana.
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import next from '@next/eslint-plugin-next';

/**
 * Satu konfigurasi untuk seluruh workspace: `app`, `landing`, dan `shared`.
 *
 * Tanpa type-aware linting — aturan bertipe menuntut satu program TypeScript
 * per paket dan membuat lint berjalan selambat `tsc`, padahal `tsc --noEmit`
 * memang sudah dijalankan terpisah. Yang dicari di sini justru yang luput dari
 * `tsc`: dependency hook yang kurang, dan aturan khusus Next.
 */
export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/out/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
      // Halaman klien di sini memuat datanya sendiri lewat `useEffect` —
      // `setLoading(true)` di awal efek memang render tambahan, bukan render
      // berantai. Menghilangkannya berarti memindahkan pengambilan data ke
      // server component atau Suspense, keputusan arsitektur tersendiri.
      'react-hooks/set-state-in-effect': 'off',
      // Argumen/variabel berawalan garis bawah memang sengaja tidak dipakai.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Skrip perkakas berjalan di Node, bukan di browser.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', fetch: 'readonly', WebSocket: 'readonly' },
    },
  },
);

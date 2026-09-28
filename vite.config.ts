import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const DEV_PORT = 5183;
const PREVIEW_PORT = 4183;
/** Where the game is expected to live. Share cards need absolute image links. */
const DEFAULT_SITE_URL = 'https://taxi-rush.grok.me';

export default defineConfig(({ mode }) => {
  const siteUrl = (loadEnv(mode, '.', 'VITE_').VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
  return {
    base: './',
    plugins: [
      {
        name: 'site-url',
        transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl),
      },
    ],
    server: { port: DEV_PORT, strictPort: true, host: '127.0.0.1' },
    preview: { port: PREVIEW_PORT, strictPort: true, host: '127.0.0.1' },
    build: { target: 'es2022', chunkSizeWarningLimit: 900 },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  plugins: [
    react({
      // CmdZero stamping is dev-only: production builds skip Babel entirely.
      babel:
        command === 'serve'
          ? { plugins: [['@cmdzero/babel-plugin', { root: process.cwd() }]] }
          : undefined,
    }),
    tailwindcss(),
    {
      name: 'cmdzero-overlay-inject',
      apply: 'serve',
      transformIndexHtml(html) {
        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: { src: 'http://localhost:4100/overlay.js', defer: true },
              injectTo: 'body',
            },
          ],
        };
      },
    },
  ],
}));

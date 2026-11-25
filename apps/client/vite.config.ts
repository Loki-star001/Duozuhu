import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { rolldownOptions: { input: { client: fileURLToPath(new URL('./index.html', import.meta.url)), exhibition: fileURLToPath(new URL('./exhibition.html', import.meta.url)) } } },
  server: {
    port: 5173,
    host: '127.0.0.1',
    watch: { ignored: ['**/backups/**'] },
    fs: {
      strict: true,
      allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../../node_modules', import.meta.url))],
      deny: ['**/backups/**', '**/.git/**', '**/.env*'],
    },
  },
});

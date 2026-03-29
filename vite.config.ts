import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_VERIFY_MODEL': JSON.stringify(env.GEMINI_VERIFY_MODEL),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
      'process.env.OPENAI_REPORT_MODEL': JSON.stringify(env.OPENAI_REPORT_MODEL),
      'process.env.OPENAI_VERIFY_MODEL': JSON.stringify(env.OPENAI_VERIFY_MODEL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify: file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('node_modules/recharts')) return 'recharts';
            if (
              id.includes('node_modules/react-markdown') ||
              id.includes('node_modules/remark-') ||
              id.includes('node_modules/mdast-') ||
              id.includes('node_modules/micromark')
            ) {
              return 'markdown';
            }
            if (id.includes('node_modules/@google/genai')) return 'google-genai';
            if (id.includes('node_modules/openai')) return 'openai-sdk';
            if (id.includes('node_modules/motion')) return 'motion';
            return 'vendor';
          },
        },
      },
    },
  };
});

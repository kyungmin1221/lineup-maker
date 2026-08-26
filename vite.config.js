import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// HTML에 firebase-sdk 청크의 modulepreload 태그를 삽입해 브라우저가 HTML 파싱 즉시 다운로드 시작
function preloadFirebasePlugin() {
  return {
    name: 'preload-firebase-sdk',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      const firebaseChunk = Object.keys(ctx.bundle).find(k => k.startsWith('assets/firebase-sdk'));
      if (!firebaseChunk) return html;
      return html.replace(
        '</head>',
        `  <link rel="modulepreload" crossorigin href="/${firebaseChunk}">\n  </head>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFirebasePlugin()],
  resolve: {
    alias: {
      '@apps-in-toss/web-framework': path.resolve('./src/lib/tossFramework.js'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Firebase SDK를 별도 청크로 고정 → 앱 코드 변경 시에도 Firebase 캐시 유지
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-sdk';
          }
        },
      },
    },
  },
})

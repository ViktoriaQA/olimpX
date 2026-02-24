import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath, URL } from "node:url";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: '../',  // Шукати .env файл в батьківській директорії (корінь проєкту)
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    ...(mode === 'development' && {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    }),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    ...(mode === 'development' && {
      __CSP_HTML__: `<meta http-equiv="Content-Security-Policy" 
          content="default-src 'self';
                   script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://googletagmanager.com https://accounts.google.com https://static.cloudflareinsights.com https://static.liqpay.ua https://www.google-analytics.com;
                   connect-src 'self' ws://localhost:8080 wss://olimpxx.pp.ua:8080 https://accounts.google.com https://olimpx-production.up.railway.app https://olimpxx-production.up.railway.app https://www.google-analytics.com http://localhost:3001;
                   style-src 'self' 'unsafe-inline';
                   img-src 'self' data: https:;">`
    })
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
}));

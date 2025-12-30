import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    server: {
        host: '0.0.0.0',
        port: 5173
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@skillforge': resolve(__dirname, 'src/skillforge')
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                // Legacy entry point
                main: resolve(__dirname, 'index.html'),
                // New Skillforge entry point
                skillforge: resolve(__dirname, 'src/skillforge/skillforge.html')
            }
        }
    }
});

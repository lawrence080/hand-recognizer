import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.',
        },
        {
          src: 'src/background/background.js',
          dest: '.',
        },
        {
          src: 'node_modules/@mediapipe/hands/hands.js',
          dest: 'vendor/mediapipe',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/drawing_utils/drawing_utils.js',
          dest: 'vendor/mediapipe',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/control_utils/control_utils.js',
          dest: 'vendor/mediapipe',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/control_utils_3d/control_utils_3d.js',
          dest: 'vendor/mediapipe',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/camera_utils/camera_utils.js',
          dest: 'vendor/mediapipe',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/hands/*',
          dest: 'mediapipe/hands',
          rename: { stripBase: true },
        },
        {
          src: 'node_modules/@mediapipe/tasks-vision/wasm/*',
          dest: 'vendor/tasks-vision/wasm',
          rename: { stripBase: true },
        }
      ],
    }),
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
        landmark: './welcome.html',
      },
    },
  },
});

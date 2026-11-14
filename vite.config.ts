import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' + HashRouter: the build works on any static host or sub-path (GitHub Pages included).
export default defineConfig({ base: './', plugins: [react()] });

import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'lineupmaker',
  brand: {
    displayName: '라인업메이커',
    primaryColor: '#034694',
    icon: 'https://static.toss.im/appsintoss/59451/45ca667b-2fca-4d3d-8fde-b840ebaabcdb.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});

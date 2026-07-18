import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lineupmaker",
  brand: {
    displayName: "라인업메이커",
    primaryColor: "#034694",
    icon: "https://static.toss.im/appsintoss/59451/a170f5e7-4417-4f18-8e66-c14f1cd498fa.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});

import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lineupmaker",
  brand: {
    displayName: "라인업메이커",
    primaryColor: "#034694",
    icon: "",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});

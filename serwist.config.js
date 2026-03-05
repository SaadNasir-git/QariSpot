// serwist.config.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export default {
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  globDirectory: "public",
  globPatterns: [
    "**/*.{js,css,html,png,svg,ico,json}",
  ]
};
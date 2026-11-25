// Self-hosts Excalidraw's fonts (CSP: font-src 'self'). Runs before dev/build; the copy is git-ignored.
// 1. Copy dist/prod/fonts → public/excalidraw-assets/fonts.
// 2. Excalidraw always appends a hard-coded CDN fallback (esm.sh) to every font's source list, which our CSP
//    blocks and logs as violations. Point that fallback at our own copy too, so fonts never leave the site.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
const dist = "node_modules/@excalidraw/excalidraw/dist/prod";
if (existsSync(dist)) {
  cpSync(`${dist}/fonts`, "public/excalidraw-assets/fonts", { recursive: true });
  const CDN = /"ASSETS_FALLBACK_URL",\s*`https:\/\/esm\.sh\/.*?\/dist\/prod\/`(?=\))/; // prod (minified) and dev builds
  const LOCAL = '"ASSETS_FALLBACK_URL",`${typeof window<"u"?window.location.origin:"http://localhost"}/excalidraw-assets/`';
  let patched = 0;
  for (const dir of [dist, dist.replace(/prod$/, "dev")].filter(existsSync)) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".js"))) {
      const p = `${dir}/${f}`, src = readFileSync(p, "utf8");
      if (CDN.test(src)) { writeFileSync(p, src.replace(CDN, LOCAL)); patched++; }
    }
  }
  console.log(`excalidraw: fonts copied; CDN fallback → self in ${patched} file(s)`);
}

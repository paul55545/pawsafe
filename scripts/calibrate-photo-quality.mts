// Calibrates the blur/darkness thresholds on real photos.
// Run: node scripts/calibrate-photo-quality.mts
// For each photo in test-photos/ it prints brightness + sharpness for: the original,
// an artificially blurred copy, and an artificially darkened copy.
import { readdirSync, readFileSync } from "node:fs";
import jpeg from "jpeg-js";
import { ANALYSIS_SIZE, analyzeGray, rgbaToGray } from "../src/lib/photoQuality.ts";

function downscale(gray: Float32Array, w: number, h: number) {
  const scale = ANALYSIS_SIZE / Math.max(w, h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);
  const out = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      // box average over the source pixels (similar to the browser's smoothing)
      const x0 = Math.floor(x / scale), x1 = Math.max(x0 + 1, Math.floor((x + 1) / scale));
      const y0 = Math.floor(y / scale), y1 = Math.max(y0 + 1, Math.floor((y + 1) / scale));
      let s = 0, n = 0;
      for (let yy = y0; yy < y1 && yy < h; yy++) for (let xx = x0; xx < x1 && xx < w; xx++) { s += gray[yy * w + xx]; n++; }
      out[y * nw + x] = s / n;
    }
  }
  return { gray: out, w: nw, h: nh };
}

function boxBlur(gray: Float32Array, w: number, h: number, r: number) {
  const out = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w) { s += gray[yy * w + xx]; n++; }
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

const dir = "test-photos";
const fmt = (q: { brightness: number; sharpness: number; warning: string | null }) =>
  `bright ${q.brightness.toFixed(0).padStart(3)}  sharp ${q.sharpness.toFixed(0).padStart(5)}  ${q.warning ? "WARN: " + q.warning.split(".")[0] : "ok"}`;

for (const f of readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f))) {
  const img = jpeg.decode(readFileSync(`${dir}/${f}`), { useTArray: true });
  const { gray, w, h } = downscale(rgbaToGray(img.data), img.width, img.height);
  console.log(f);
  console.log("  original     ", fmt(analyzeGray(gray, w, h)));
  console.log("  blurred r=1  ", fmt(analyzeGray(boxBlur(gray, w, h, 1), w, h)));
  console.log("  blurred r=2  ", fmt(analyzeGray(boxBlur(gray, w, h, 2), w, h)));
  console.log("  dark x0.25   ", fmt(analyzeGray(gray.map((v) => v * 0.25), w, h)));
}

// Simple, AI-free photo checks that run on the phone before uploading.
// - Darkness: average brightness of the photo.
// - Blur: "variance of the Laplacian" — sharp photos have lots of strong edges,
//   blurry photos have soft edges, so this number drops when a photo is blurry.
// Works on a small grayscale copy (ANALYSIS_SIZE px on the long side) so it's fast and
// so the numbers don't depend on the camera's resolution.

export const ANALYSIS_SIZE = 256;
export const DARK_BELOW = 50; // mean brightness 0..255, calibrated in scripts/calibrate-photo-quality.mts
export const BRIGHT_ABOVE = 235;
export const BLURRY_BELOW = 60; // Laplacian variance at ANALYSIS_SIZE, calibrated in the same script

export type PhotoQuality = { brightness: number; sharpness: number; warning: string | null };

/** gray: one brightness value (0..255) per pixel, row by row. */
export function analyzeGray(gray: ArrayLike<number>, width: number, height: number): PhotoQuality {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const brightness = sum / gray.length;

  // Laplacian = 4*centre - up - down - left - right; we measure how spread out its values are.
  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      n++;
      const d = lap - mean;
      mean += d / n;
      m2 += d * (lap - mean);
    }
  }
  const sharpness = n > 0 ? m2 / n : 0;

  let warning: string | null = null;
  if (brightness < DARK_BELOW) warning = "This photo looks too dark. Try again in better light.";
  else if (brightness > BRIGHT_ABOVE) warning = "This photo looks overexposed. Avoid pointing at a bright window.";
  else if (sharpness < BLURRY_BELOW) warning = "This photo looks blurry. Hold the phone steady and tap to focus.";
  return { brightness, sharpness, warning };
}

/** RGBA pixels (canvas / jpeg decoder format) -> grayscale. */
export function rgbaToGray(rgba: ArrayLike<number>): Float32Array {
  const gray = new Float32Array(rgba.length / 4);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  return gray;
}

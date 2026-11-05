"use client";
// "use client" = this component runs in the phone's browser (it needs the camera and buttons).

import { useEffect, useState } from "react";
import { previewResult } from "@/lib/previewResult";
import { saveScan } from "@/lib/history";
import { ANALYSIS_SIZE, analyzeGray, rgbaToGray } from "@/lib/photoQuality";
import { plantEmoji } from "@/lib/plantEmoji";
import type { Candidate, Verdict } from "@/lib/types";

const MAX_PHOTOS = 3;

type Photo = { blob: Blob; url: string; warning: string | null; thumb: string | null };

function drawScaled(bitmap: ImageBitmap, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

// Phone photos are 4-10 MB; Vercel rejects uploads over 4.5 MB.
// So we shrink each photo to max 1280px, and check a tiny copy for blur/darkness.
async function preparePhoto(file: File): Promise<Photo> {
  const bitmap = await createImageBitmap(file); // respects phone rotation (EXIF)

  const small = drawScaled(bitmap, ANALYSIS_SIZE);
  const pixels = small.ctx.getImageData(0, 0, small.canvas.width, small.canvas.height).data;
  const quality = analyzeGray(rgbaToGray(pixels), small.canvas.width, small.canvas.height);

  const { canvas } = drawScaled(bitmap, 1280);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process photo"))), "image/jpeg", 0.85),
  );
  // Tiny copy (~5 KB) kept in "Recent plants" on this phone
  const thumb = drawScaled(bitmap, 112).canvas.toDataURL("image/jpeg", 0.7);
  return { blob, url: URL.createObjectURL(blob), warning: quality.warning, thumb };
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** Explains that a card shows general info for the genus, borrowed from its ASPCA-listed member. */
function GenusNote({ info }: { info: NonNullable<Verdict["genusInfo"]> }) {
  return (
    <p className="mt-1 text-xs text-muted">
      {Math.round(info.confidence * 100)}% likely to be a {info.genus}. This exact species isn&apos;t on the ASPCA
      list, so this is based on {info.basedOn}, the {info.genus} that ASPCA does list.
    </p>
  );
}

const LEVEL_STYLE = {
  safe: { box: "bg-green-100 text-green-900 border-green-600", icon: "✅" },
  toxic: { box: "bg-red-100 text-red-900 border-red-600", icon: "☠️" },
  unknown: { box: "bg-amber-100 text-amber-900 border-amber-500", icon: "⚠️" },
} as const;

export default function PlantScanner() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [result, setResult] = useState<{ candidates: Candidate[]; verdict: Verdict } | null>(null);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false); // shrinking + checking a new photo
  const [error, setError] = useState<string | null>(null);

  // #preview shows a sample result; #preview-leaf shows the full two-part leaf (no camera needed).
  useEffect(() => {
    const samplePhoto = { blob: new Blob(), url: "/brand/cat-leaf.png", warning: null, thumb: null };
    if (location.hash === "#preview") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off, only for the preview link
      setPhotos([samplePhoto]);
      setResult(previewResult);
    } else if (location.hash === "#preview-leaf") {
      setPhotos([samplePhoto]);
    }
  }, []);

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    setPreparing(true);
    setResult(null);
    setError(null);
    try {
      const photo = await preparePhoto(file);
      setPhotos((p) => [...p, photo].slice(0, MAX_PHOTOS));
    } catch {
      setError("Could not read that photo. Please try again.");
    } finally {
      setPreparing(false);
    }
  }

  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setResult(null);
  }

  async function identify() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      photos.forEach((p) => form.append("image", p.blob, "plant.jpg"));
      const res = await fetch("/api/identify", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
      saveScan(data.verdict, photos[0]?.thumb ?? null); // remembered under "Recent plants" (this phone only)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhotos([]);
    setResult(null);
    setError(null);
  }

  const v = result?.verdict;
  const photoWarnings = photos.map((p) => p.warning).filter(Boolean);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* Photo thumbnails (tap ✕ to remove) */}
      {(photos.length > 0 || preparing) && (
        <div className="flex gap-2">
          {photos.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Photo ${i + 1}`}
                className={`h-24 w-24 rounded-xl object-cover ${p.warning ? "ring-4 ring-amber-400" : ""}`}
              />
              <button
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-zinc-900 text-sm text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {/* Placeholder tile with a spinning leaf while the new photo is being prepared */}
          {preparing && (
            <div
              role="status"
              aria-label="Preparing photo"
              className="flex h-24 w-24 animate-pulse flex-col items-center justify-center gap-2 rounded-xl bg-leaf-wash text-moss-deep"
            >
              <span className="leaf-spinner" />
              <span className="text-xs">Preparing…</span>
            </div>
          )}
        </div>
      )}

      {/* Option B: instant blur/darkness feedback, before anything is uploaded */}
      {photoWarnings.length > 0 && (
        <p className="rounded-xl bg-amber-100 p-3 text-amber-900">
          📸 {photoWarnings[photoWarnings.length - 1]} (You can still try to identify it.)
        </p>
      )}

      {/* The leaf: top half = camera, bottom half = Identify (appears once there's a photo).
          The camera "button" is a label around a hidden file input; capture="environment" opens the back camera. */}
      <div className="leaf my-2">
        <span className="leaf-stem" aria-hidden="true" />
        {photos.length < MAX_PHOTOS && !preparing ? (
          <label className="leaf-half leaf-top">
            <CameraIcon />
            {photos.length === 0 ? "Take a photo of the plant" : "Add another angle"}
            <input type="file" accept="image/*" capture="environment" onChange={addPhoto} className="hidden" />
          </label>
        ) : (
          <button type="button" className="leaf-half leaf-top" disabled>
            {preparing ? "Preparing photo…" : `${MAX_PHOTOS} photos added`}
          </button>
        )}

        {photos.length > 0 && !result && (
          <button type="button" onClick={identify} disabled={loading || preparing} className="leaf-half leaf-bottom">
            {loading ? "Identifying…" : `Identify (${photos.length} photo${photos.length > 1 ? "s" : ""})`}
          </button>
        )}
      </div>

      {error && <p className="rounded-xl bg-red-100 p-3 text-red-800">{error}</p>}

      {v && (
        <>
          {/* The verdict banner */}
          <section className={`vine-box leaf-corners border-2 p-4 ${LEVEL_STYLE[v.level].box}`}>
            <div className="flex items-start gap-3">
              {/* Plant-type emoji: 🌵 cactus, 🌴 palm, 🌸 orchid, 🌿 leafy plant... 🌱 when unsure */}
              <span
                aria-hidden="true"
                className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white/60 text-4xl dark:bg-black/20"
              >
                {plantEmoji(v.plant?.family, v.plant?.genus)}
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-bold">
                  {LEVEL_STYLE[v.level].icon} {v.title}
                </h2>
                {v.plant && (
                  <p className="mt-1 text-sm">
                    Best match: <i>{v.plant.scientificName}</i> · {Math.round(v.plant.confidence * 100)}% confidence
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2">{v.message}</p>
            {v.cactusNote && (
              <p className="mt-2 rounded-lg border border-current/20 bg-white/50 p-2 text-sm dark:bg-black/10">
                🌵 {v.cactusNote}
              </p>
            )}
            {v.severe && (
              <p className="mt-2 rounded-lg bg-red-700 p-2 font-semibold text-white">
                🚨 Lilies are extremely dangerous to cats. Even pollen or vase water can cause fatal kidney failure. If
                your cat may have been exposed, contact a vet immediately.
              </p>
            )}
            {v.aspca && <p className="mt-2 text-xs opacity-75">ASPCA entry: {v.aspca}</p>}
          </section>

          {/* Order: verdict, effects on cats, care, photo tip, other matches */}
          {/* What this plant does to a cat (verbatim from ASPCA) */}
          {v.effects && (
            <section className="vine-box rounded-2xl border-2 border-red-300 bg-card p-4 dark:border-red-800">
              <h3 className="font-semibold">
                🩺{" "}
                {v.genusInfo
                  ? `${v.genusInfo.genus} plants in general: effects on cats`
                  : `${v.level === "toxic" ? "" : "If it is "}${v.effects.plantName}: effects on cats`}
              </h3>
              {v.genusInfo && <GenusNote info={v.genusInfo} />}
              <dl className="mt-2 flex flex-col gap-2 text-sm">
                {v.effects.toxicPrinciples && (
                  <div>
                    <dt className="font-medium">🧪 What causes it</dt>
                    <dd>{v.effects.toxicPrinciples}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium">🤒 Symptoms</dt>
                  <dd>{v.effects.clinicalSigns}</dd>
                </div>
                <div>
                  <dt className="font-medium">⚖️ How serious / how much</dt>
                  <dd>
                    {v.effects.seriousness ? `${v.effects.seriousness} ` : ""}
                    ASPCA doesn&apos;t give a safe amount. How bad it gets depends on how much was eaten and on the
                    cat&apos;s size, so treat any chewing as a reason to call your vet.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">📞 What to do</dt>
                  <dd>
                    Remove the plant, check your cat&apos;s mouth, and contact your vet as soon as possible.
                  </dd>
                </div>
              </dl>
              <a href={v.effects.aspcaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs underline">
                Source: ASPCA plant page
              </a>
            </section>
          )}

          {/* Care card */}
          {v.care && v.plant && (
            <section className="vine-box rounded-2xl border border-line bg-card p-4">
              <h3 className="font-semibold">
                🌱 Care for {v.genusInfo ? `${v.genusInfo.genus} plants (general)` : v.plant.commonName}
              </h3>
              {v.genusInfo && <GenusNote info={v.genusInfo} />}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt>☀️ Light</dt>
                <dd>{v.care.light}</dd>
                <dt>💧 Water</dt>
                <dd>
                  {v.care.water} / {v.care.waterEvery}
                </dd>
                <dt>💨 Humidity</dt>
                <dd>{v.care.humidity}</dd>
                <dt>📈 Difficulty</dt>
                <dd>{v.care.difficulty}</dd>
              </dl>
              <p className="mt-2 text-xs text-zinc-500">
                Watering intervals are typical for indoor plants in spring/summer. Pot size, light and season change
                them, so check the soil first.
              </p>
            </section>
          )}

          {/* Option A: advice when the identification was unsure */}
          {v.photoTip && (
            <p className="vine-box rounded-xl border border-sky-300 bg-sky-100 p-3 text-sky-900">
              💡 {v.photoTip}
              {photos.length < MAX_PHOTOS && " Tap “Add another angle” above, then identify again."}
            </p>
          )}

          {/* Other candidates, for transparency */}
          {result.candidates.length > 1 && (
            <details className="vine-box rounded-2xl border border-line bg-card p-4">
              <summary className="cursor-pointer font-semibold">Other possible matches</summary>
              <ul className="mt-2 flex flex-col gap-2">
                {result.candidates.map((c) => (
                  <li key={c.scientificName}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span>
                        <i>{c.scientificName}</i>
                        {c.commonNames[0] && <span className="text-zinc-500"> · {c.commonNames[0]}</span>}
                      </span>
                      <span className="font-mono">{Math.round(c.score * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded bg-zinc-200 dark:bg-zinc-700">
                      <div className="h-1.5 rounded bg-green-600" style={{ width: `${c.score * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {photos.length > 0 && (
        <button onClick={reset} className="font-semibold text-moss underline underline-offset-4">
          Start over
        </button>
      )}

      <p className="text-center text-xs text-zinc-500">
        Toxicity data: ASPCA Animal Poison Control plant list. Not veterinary advice. If your cat ate a plant and seems
        unwell, contact a vet.
      </p>
    </div>
  );
}

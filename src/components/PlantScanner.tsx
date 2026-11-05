"use client";
// "use client" = this component runs in the phone's browser (it needs the camera and buttons).

import { useState } from "react";
import type { Candidate } from "@/app/api/identify/route";

const MAX_PHOTOS = 3;

// Phone photos are 4-10 MB; Vercel rejects uploads over 4.5 MB.
// So we shrink each photo in the browser to max 1280px before sending it.
async function shrinkImage(file: File, maxSize = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // respects phone rotation (EXIF)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process photo"))), "image/jpeg", 0.85),
  );
}

export default function PlantScanner() {
  const [photos, setPhotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    try {
      const blob = await shrinkImage(file);
      setPhotos((p) => [...p, { blob, url: URL.createObjectURL(blob) }].slice(0, MAX_PHOTOS));
      setCandidates(null);
      setError(null);
    } catch {
      setError("Could not read that photo. Please try again.");
    }
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
      setCandidates(data.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhotos([]);
    setCandidates(null);
    setError(null);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.url} alt={`Photo ${i + 1}`} className="h-24 w-24 rounded-xl object-cover" />
          ))}
        </div>
      )}

      {/* Camera button: a hidden file input; capture="environment" opens the back camera */}
      {photos.length < MAX_PHOTOS && (
        <label className="flex h-14 cursor-pointer items-center justify-center rounded-2xl bg-green-700 text-lg font-semibold text-white active:bg-green-800">
          📷 {photos.length === 0 ? "Take a photo of the plant" : "Add another angle (optional)"}
          <input type="file" accept="image/*" capture="environment" onChange={addPhoto} className="hidden" />
        </label>
      )}

      {photos.length > 0 && (
        <button
          onClick={identify}
          disabled={loading}
          className="h-14 rounded-2xl bg-zinc-900 text-lg font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "Identifying…" : `🔍 Identify (${photos.length} photo${photos.length > 1 ? "s" : ""})`}
        </button>
      )}

      {error && <p className="rounded-xl bg-red-100 p-3 text-red-800">{error}</p>}

      {/* Raw results for now; the safety verdict comes in the next step */}
      {candidates && (
        <div className="flex flex-col gap-2">
          {candidates.length === 0 ? (
            <p className="rounded-xl bg-amber-100 p-3 text-amber-900">
              No plant recognised. Try a clearer photo of the whole plant.
            </p>
          ) : (
            candidates.map((c) => (
              <div key={c.scientificName} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold italic">{c.scientificName}</span>
                  <span className="font-mono">{Math.round(c.score * 100)}%</span>
                </div>
                <div className="text-sm text-zinc-500">{c.commonNames.slice(0, 2).join(", ")}</div>
                <div className="mt-2 h-2 rounded bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-2 rounded bg-green-600" style={{ width: `${c.score * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {photos.length > 0 && (
        <button onClick={reset} className="text-zinc-500 underline">
          Start over
        </button>
      )}
    </div>
  );
}

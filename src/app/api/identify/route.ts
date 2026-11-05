// Server-side only: this code runs on Vercel, never in the browser.
// The phone uploads a photo here; we add the secret API key and ask Pl@ntNet.

import type { Candidate } from "@/lib/types";
import { evaluate } from "@/lib/verdict";

const PLANTNET_URL = "https://my-api.plantnet.org/v2/identify/all";

export async function POST(request: Request) {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing PLANTNET_API_KEY" }, { status: 500 });
  }

  // Accept 1-5 photos of the SAME plant; Pl@ntNet combines them for a better answer.
  const form = await request.formData();
  const images = form.getAll("image").filter((v): v is File => v instanceof Blob).slice(0, 5);
  if (images.length === 0) {
    return Response.json({ error: "No image uploaded" }, { status: 400 });
  }

  const body = new FormData();
  images.forEach((img, i) => {
    body.append("images", img, `plant-${i}.jpg`);
    body.append("organs", "auto");
  });

  const url = `${PLANTNET_URL}?api-key=${apiKey}&lang=en&nb-results=5&include-related-images=false`;
  const res = await fetch(url, { method: "POST", body });

  // Pl@ntNet answers 404 when it can't recognise any plant in the photo.
  if (res.status === 404) {
    return Response.json({ candidates: [], verdict: evaluate([]) });
  }
  if (!res.ok) {
    console.error("Pl@ntNet error", res.status, await res.text());
    return Response.json({ error: `Identification service error (${res.status})` }, { status: 502 });
  }

  const data = await res.json();
  const candidates: Candidate[] = (data.results ?? []).map(
    (r: {
      score: number;
      species: {
        scientificNameWithoutAuthor: string;
        genus?: { scientificNameWithoutAuthor: string };
        family?: { scientificNameWithoutAuthor: string };
        commonNames?: string[];
      };
    }) => ({
      scientificName: r.species.scientificNameWithoutAuthor,
      genus: r.species.genus?.scientificNameWithoutAuthor ?? "",
      family: r.species.family?.scientificNameWithoutAuthor ?? "",
      commonNames: r.species.commonNames ?? [],
      score: r.score,
    }),
  );

  // The safety decision is made here on the server, from the curated dataset — not by the AI.
  return Response.json({ candidates, verdict: evaluate(candidates) });
}

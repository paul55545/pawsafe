// Server-side only: this code runs on Vercel, never in the browser.
// The phone uploads a photo here; we add the secret API key and ask Pl@ntNet.

const PLANTNET_URL = "https://my-api.plantnet.org/v2/identify/all";

export type Candidate = {
  scientificName: string; // e.g. "Epipremnum aureum" (no author)
  genus: string;
  family: string;
  commonNames: string[];
  score: number; // 0..1, Pl@ntNet's confidence for this species
};

export async function POST(request: Request) {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing PLANTNET_API_KEY" }, { status: 500 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof Blob)) {
    return Response.json({ error: "No image uploaded" }, { status: 400 });
  }

  const body = new FormData();
  body.append("images", image, "plant.jpg");
  body.append("organs", "auto");

  const url = `${PLANTNET_URL}?api-key=${apiKey}&lang=en&nb-results=5&include-related-images=false`;
  const res = await fetch(url, { method: "POST", body });

  // Pl@ntNet answers 404 when it can't recognise any plant in the photo.
  if (res.status === 404) {
    return Response.json({ candidates: [] });
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

  return Response.json({ candidates });
}

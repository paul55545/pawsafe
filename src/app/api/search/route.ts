// GET /api/search?q=monstera  ->  matching plants from the curated dataset, each with its full verdict.
// The dataset and the safety rules stay on the server, the same as for photos.
import { plants } from "@/lib/plants";
import { searchPlants, verdictForEntry } from "@/lib/search";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = searchPlants(q).map((p) => ({
    id: p.id,
    commonName: p.commonName,
    scientificName: p.names[0],
    family: p.family,
    ...verdictForEntry(p),
  }));
  return Response.json({ results, total: plants.length });
}

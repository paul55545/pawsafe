// Search the curated dataset by name (common or scientific), e.g. "monstera", "snake plant", "Sansevieria".
// A search result goes through the SAME safety rules as a photo, as if identified with full confidence:
// the user told us the name, so there's no identification uncertainty, only the dataset's verdict.
import { plants } from "./plants";
import type { Candidate, PlantEntry, Verdict } from "./types";
import { evaluate } from "./verdict";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** All the names a plant can be found by: our common name, ASPCA's common names, scientific names. */
function searchTerms(p: PlantEntry): string[] {
  const aspcaCommon = (p.aspca ?? "").split(";").map((part) => part.split("|")[0]);
  return [p.commonName, ...aspcaCommon, ...p.names].map(normalize).filter(Boolean);
}

/** 0 = best. Whole-word prefix beats a match in the middle of a word. */
function matchScore(term: string, q: string): number | null {
  if (term === q) return 0;
  if (term.startsWith(q)) return 1;
  if (term.split(" ").some((w) => w.startsWith(q))) return 2;
  if (term.includes(q)) return 3;
  return null;
}

export function searchPlants(query: string, entries: PlantEntry[] = plants, limit = 8): PlantEntry[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  return entries
    .map((p) => {
      const scores = searchTerms(p)
        .map((t) => matchScore(t, q))
        .filter((s): s is number => s !== null);
      return { p, score: scores.length ? Math.min(...scores) : null };
    })
    .filter((r): r is { p: PlantEntry; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score || a.p.commonName.localeCompare(b.p.commonName))
    .slice(0, limit)
    .map((r) => r.p);
}

/** The verdict for a plant picked from search: same rules as a photo, at 100% identification. */
export function verdictForEntry(p: PlantEntry): { candidates: Candidate[]; verdict: Verdict } {
  const scientificName = p.names[0];
  const candidate: Candidate = {
    scientificName,
    genus: scientificName.split(" ")[0],
    family: p.family,
    commonNames: [p.commonName],
    score: 1,
  };
  return { candidates: [candidate], verdict: evaluate([candidate]) };
}

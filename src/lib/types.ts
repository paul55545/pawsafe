// Shared data shapes used by the server (API route) and the phone (UI).

/** One possible species returned by the plant identification service. */
export type Candidate = {
  scientificName: string; // e.g. "Epipremnum aureum" (no author)
  genus: string;
  family: string;
  commonNames: string[];
  score: number; // 0..1, the service's confidence for this species
};

export type Care = {
  light: string;
  water: string;
  humidity: string;
  difficulty: "Easy" | "Moderate" | "Hard";
};

/** One row of our curated dataset (src/data/plants.json). */
export type PlantEntry = {
  id: string;
  commonName: string;
  /** Scientific names that match this entry. First one is the main name. */
  names: string[];
  /** true = ASPCA lists the WHOLE genus (e.g. "Lilium species"), so any species in it matches. */
  genusWide: boolean;
  /** true = toxic, false = non-toxic, null = not listed by ASPCA (we only have care info). */
  toxicToCats: boolean | null;
  /** Extra-dangerous plants (lilies: can cause fatal kidney failure). */
  severe: boolean;
  /** The exact ASPCA list entry this row is based on: "Common | Scientific | Family". */
  aspca: string | null;
  note?: string;
  care: Care | null;
  /** Set to true only after a human has checked this row against the ASPCA website. */
  humanVerified: boolean;
};

export type VerdictLevel = "safe" | "toxic" | "unknown";

export type VerdictReason =
  | "confident-safe" // confident ID + verified non-toxic ASPCA entry
  | "confident-toxic" // confident ID of an ASPCA toxic plant
  | "possible-toxic" // a toxic plant is among the likely matches
  | "toxic-relative" // not listed itself, but a plant in the same genus is toxic
  | "low-confidence" // not sure enough which plant this is
  | "not-listed" // identified, but ASPCA doesn't list it
  | "not-in-dataset" // identified, but not in our curated dataset
  | "pending-review" // non-toxic per ASPCA, but our row isn't human-verified yet
  | "no-plant"; // no plant recognised in the photo

export type Verdict = {
  level: VerdictLevel;
  reason: VerdictReason;
  title: string;
  message: string;
  /** Best guess of what the plant is (may be uncertain). */
  plant: { commonName: string; scientificName: string; confidence: number } | null;
  severe: boolean;
  /** "Take a closer photo..." advice when the identification was unsure. */
  photoTip: string | null;
  care: Care | null;
  aspca: string | null;
};

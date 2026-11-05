// Sample result shown when the page is opened with #preview (for design checks and the demo video).
// It is a copy of a real API response for a golden pothos photo, so no API call is made.
import type { Candidate, Verdict } from "./types";

export const previewResult: { candidates: Candidate[]; verdict: Verdict } = {
  candidates: [
    { scientificName: "Epipremnum pinnatum", genus: "Epipremnum", family: "Araceae", commonNames: ["Pothos"], score: 0.835 },
    { scientificName: "Epipremnum aureum", genus: "Epipremnum", family: "Araceae", commonNames: ["Golden pothos"], score: 0.161 },
  ],
  verdict: {
    level: "toxic",
    reason: "confident-toxic",
    title: "Toxic to cats: Golden pothos",
    message:
      "ASPCA lists this plant as toxic to cats. Epipremnum pinnatum is not on the ASPCA list; mapped here conservatively (toxic direction only) because plant ID services often return it for golden pothos.",
    plant: { commonName: "Golden pothos", scientificName: "Epipremnum pinnatum", family: "Araceae", genus: "Epipremnum", confidence: 0.996 },
    severe: false,
    photoTip: null,
    care: {
      light: "Low to bright indirect light",
      water: "When the top 2–3 cm of soil is dry",
      waterEvery: "about every 7–10 days",
      humidity: "Average room humidity is fine",
      difficulty: "Easy",
    },
    aspca: "Golden Pothos | Epipremnum aureum | Araceae",
    genusInfo: null,
    cactusNote: null,
    effects: {
      plantName: "Golden pothos",
      toxicPrinciples: "Insoluble calcium oxalates",
      clinicalSigns:
        "Oral irritation, intense burning and irritation of mouth, tongue and lips, excessive drooling, vomiting, difficulty swallowing.",
      seriousness: null,
      aspcaUrl: "https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/golden-pothos",
    },
  },
};

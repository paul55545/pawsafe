// Loads the curated dataset and builds fast lookup tables by scientific name.
import rawPlants from "../data/plants.json";
import type { PlantEntry } from "./types";

/**
 * "Epipremnum aureum 'Marble Queen'" -> "epipremnum aureum"
 * "Schlumbergera × buckleyi"          -> "schlumbergera buckleyi"
 * Removes cultivar names in quotes, hybrid signs, and anything after genus + species.
 */
export function speciesKey(scientificName: string): string {
  return scientificName
    .toLowerCase()
    .replace(/['"‘’“”][^'"‘’“”]*['"‘’“”]/g, " ") // cultivar names in quotes
    .replace(/[×]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "x")
    .slice(0, 2)
    .join(" ");
}

export function genusKey(scientificName: string): string {
  return speciesKey(scientificName).split(" ")[0];
}

export type PlantIndex = {
  entries: PlantEntry[];
  bySpecies: Map<string, PlantEntry>; // "epipremnum aureum" -> entry
  byWholeGenus: Map<string, PlantEntry>; // "lilium" -> entry (only genus-wide ASPCA listings)
  toxicByGenus: Map<string, PlantEntry>; // "euphorbia" -> a toxic entry in that genus
};

export function buildIndex(entries: PlantEntry[]): PlantIndex {
  const bySpecies = new Map<string, PlantEntry>();
  const byWholeGenus = new Map<string, PlantEntry>();
  const toxicByGenus = new Map<string, PlantEntry>();
  for (const e of entries) {
    for (const name of e.names) {
      const key = speciesKey(name);
      if (bySpecies.has(key)) throw new Error(`Duplicate scientific name in dataset: ${name}`);
      bySpecies.set(key, e);
      if (e.genusWide) byWholeGenus.set(genusKey(name), e);
      if (e.toxicToCats === true && !toxicByGenus.has(genusKey(name))) toxicByGenus.set(genusKey(name), e);
    }
  }
  return { entries, bySpecies, byWholeGenus, toxicByGenus };
}

export const plants = rawPlants as PlantEntry[];
export const plantIndex = buildIndex(plants);

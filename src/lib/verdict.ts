// THE SAFETY LOGIC. The AI only says "which plant is this, and how sure am I".
// Whether it's safe for cats is decided here, from the curated ASPCA dataset and fixed rules.
//
// Rules (asymmetric on purpose: wrongly saying "safe" is far worse than wrongly saying "toxic"):
//  1. "Safe" only if ALL hold: confident ID (>= CONFIDENT), matched to an ASPCA non-toxic entry
//     by scientific name, entry checked by a human, and NO toxic plant among the likely matches.
//  2. Any toxic plant with >= TOXIC_ALERT confidence triggers a warning, even if it's not the top guess.
//  3. Everything else is "unknown -> treat as potentially toxic".
import { genusKey, plantIndex, speciesKey, type PlantIndex } from "./plants";
import type { Candidate, PlantEntry, Verdict } from "./types";

export const CONFIDENT = 0.6; // tuned on real photos (see DECISIONS.md)
export const TOXIC_ALERT = 0.1;
export const GENUS_INFO = 0.4; // combined confidence for a genus before we show general genus info

type MatchKind = "species" | "genus" | "toxic-relative" | "none";

/** Candidates that point to the same dataset entry are grouped and their scores added up. */
type Group = { key: string; entry: PlantEntry | null; kind: MatchKind; score: number; top: Candidate };

function matchCandidate(c: Candidate, index: PlantIndex): { entry: PlantEntry | null; kind: MatchKind } {
  const bySpecies = index.bySpecies.get(speciesKey(c.scientificName));
  if (bySpecies) return { entry: bySpecies, kind: "species" };
  const byGenus = index.byWholeGenus.get(genusKey(c.scientificName));
  if (byGenus) return { entry: byGenus, kind: "genus" };
  const relative = index.toxicByGenus.get(genusKey(c.scientificName));
  if (relative) return { entry: relative, kind: "toxic-relative" };
  return { entry: null, kind: "none" };
}

function groupCandidates(candidates: Candidate[], index: PlantIndex): Group[] {
  const groups = new Map<string, Group>();
  for (const c of candidates) {
    const { entry, kind } = matchCandidate(c, index);
    const key = entry && kind !== "toxic-relative" ? entry.id : `${kind}:${speciesKey(c.scientificName)}`;
    const g = groups.get(key);
    if (g) g.score += c.score;
    else groups.set(key, { key, entry, kind, score: c.score, top: c });
  }
  return [...groups.values()].sort((a, b) => b.score - a.score);
}

const PHOTO_TIP =
  "For a more reliable answer: move closer so the plant fills the frame, use good daylight, " +
  "and add a second photo of a different part (a close-up of leaves, stems or spines).";

const TREAT_AS_TOXIC = "Until you can confirm it, treat this plant as potentially toxic and keep it away from your cat.";

export function evaluate(candidates: Candidate[], index: PlantIndex = plantIndex): Verdict {
  if (candidates.length === 0) {
    return {
      level: "unknown",
      reason: "no-plant",
      title: "No plant recognised",
      message: `We couldn't recognise a plant in this photo. ${TREAT_AS_TOXIC}`,
      plant: null,
      severe: false,
      photoTip: PHOTO_TIP,
      care: null,
      aspca: null,
      effects: null,
      genusInfo: null,
    };
  }

  const groups = groupCandidates(candidates, index);
  const top = groups[0];
  const confident = top.score >= CONFIDENT;
  const name = (g: Group) =>
    g.entry && g.kind !== "toxic-relative" ? g.entry.commonName : (g.top.commonNames[0] ?? g.top.scientificName);
  const plant = {
    commonName: name(top),
    scientificName: top.top.scientificName,
    family: top.top.family,
    genus: top.top.genus,
    confidence: Math.min(1, top.score),
  };
  // Includes toxic relatives: e.g. an unlisted Euphorbia looking like a cactus.
  const toxicAlert = groups.find((g) => g.entry?.toxicToCats === true && g.score >= TOXIC_ALERT);
  const severe = groups.some((g) => g.entry?.severe && g.score >= TOXIC_ALERT);
  // Genus-level info: if the photo is >= GENUS_INFO likely to be SOME plant of a genus that has a toxic
  // ASPCA-listed member (e.g. an unlisted Monstera), show that member's care + dangers as "general" info.
  // Warning direction only: a non-toxic relative is never used to call a plant safe.
  const relative = top.kind === "toxic-relative" ? top : toxicAlert?.kind === "toxic-relative" ? toxicAlert : undefined;
  const genusScore = relative
    ? candidates
        .filter((c) => genusKey(c.scientificName) === genusKey(relative.top.scientificName))
        .reduce((s, c) => s + c.score, 0)
    : 0;
  const genusInfo =
    relative && genusScore >= GENUS_INFO
      ? {
          genus: relative.top.genus || relative.top.scientificName.split(" ")[0],
          basedOn: relative.entry!.commonName,
          confidence: Math.min(1, genusScore),
        }
      : null;

  // Care info only when we actually matched this plant, or as general genus info (labelled in the UI).
  const care =
    top.entry && (top.kind === "species" || top.kind === "genus")
      ? top.entry.care
      : genusInfo && relative === top
        ? relative.entry!.care
        : null;
  const aspca = top.entry && top.kind !== "toxic-relative" ? top.entry.aspca : null;
  // Symptoms are shown for the toxic plant we're warning about (exact/genus matches, or general genus info).
  const effectsOf = (g: Group | undefined) =>
    g?.entry?.effects && g.kind !== "toxic-relative" ? { ...g.entry.effects, plantName: g.entry.commonName } : null;
  const effects =
    effectsOf(top.entry?.toxicToCats && top.kind !== "toxic-relative" ? top : toxicAlert) ??
    (genusInfo && relative?.entry?.effects ? { ...relative.entry.effects, plantName: relative.entry.commonName } : null);
  const base = { plant, severe, care, aspca, effects, genusInfo, photoTip: confident ? null : PHOTO_TIP };
  const GENUS_NOTE = genusInfo
    ? ` Plants in the same genus usually contain the same irritants, so the ${genusInfo.genus} info below is a good guide.`
    : "";

  // Rule: confident ID of a toxic plant.
  if (confident && top.entry?.toxicToCats === true && top.kind !== "toxic-relative") {
    return {
      ...base,
      level: "toxic",
      reason: "confident-toxic",
      title: `Toxic to cats: ${name(top)}`,
      message: `ASPCA lists this plant as toxic to cats. ${top.entry.note ?? ""}`.trim(),
    };
  }

  // Rule: a toxic plant is among the likely matches -> warn, even if it's not the top guess.
  if (toxicAlert) {
    return {
      ...base,
      level: "unknown",
      reason: "possible-toxic",
      title: genusInfo && toxicAlert === relative ? `Likely toxic: a ${genusInfo.genus}` : "Possibly toxic",
      message:
        toxicAlert.kind === "toxic-relative"
          ? `This might be ${toxicAlert.top.scientificName} (${Math.round(toxicAlert.score * 100)}% match). ` +
            `It's a close relative of ${toxicAlert.entry!.commonName}, which ASPCA lists as toxic to cats.${GENUS_NOTE} ${TREAT_AS_TOXIC}`
          : `This might be ${toxicAlert.entry!.commonName} (${Math.round(toxicAlert.score * 100)}% match), ` +
            `which ASPCA lists as toxic to cats. ${TREAT_AS_TOXIC}`,
      photoTip: PHOTO_TIP,
    };
  }

  if (top.kind === "toxic-relative") {
    return {
      ...base,
      level: "unknown",
      reason: "toxic-relative",
      title: genusInfo ? `Likely toxic: a ${genusInfo.genus}` : "Possibly toxic",
      message:
        `This looks like ${top.top.scientificName}. It isn't on the ASPCA list, but a related plant in the same genus ` +
        `(${top.entry!.commonName}) is toxic to cats.${GENUS_NOTE} ${TREAT_AS_TOXIC}`,
    };
  }

  if (!top.entry) {
    return {
      ...base,
      level: "unknown",
      reason: "not-in-dataset",
      title: "Not in our safety database",
      message: `This looks like ${top.top.scientificName}, but it isn't in our ASPCA-based database yet. ${TREAT_AS_TOXIC}`,
    };
  }

  if (top.entry.toxicToCats === null) {
    return {
      ...base,
      level: "unknown",
      reason: "not-listed",
      title: "Not on the ASPCA list",
      message: `This looks like ${top.entry.commonName}. ASPCA doesn't list it as toxic or non-toxic. ${top.entry.note ?? ""} ${TREAT_AS_TOXIC}`
        .replace(/\s+/g, " ")
        .trim(),
    };
  }

  // From here on, the top match is an ASPCA non-toxic plant.
  if (!confident) {
    return {
      ...base,
      level: "unknown",
      reason: "low-confidence",
      title: "Not sure enough",
      message:
        `This might be ${top.entry.commonName}, which ASPCA lists as non-toxic, but we're only ` +
        `${Math.round(top.score * 100)}% sure. ${TREAT_AS_TOXIC}`,
    };
  }

  if (!top.entry.humanVerified) {
    return {
      ...base,
      level: "unknown",
      reason: "pending-review",
      title: "Pending review",
      message:
        `This looks like ${top.entry.commonName}, which ASPCA lists as non-toxic, but this entry in our ` +
        `database hasn't been double-checked by a person yet. ${TREAT_AS_TOXIC}`,
    };
  }

  return {
    ...base,
    level: "safe",
    reason: "confident-safe",
    title: `Non-toxic to cats: ${top.entry.commonName}`,
    message: `ASPCA lists this plant as non-toxic to cats. ${top.entry.note ?? ""}`.trim(),
  };
}

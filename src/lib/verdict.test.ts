import { describe, expect, it } from "vitest";
import { buildIndex, genusKey, plants, speciesKey } from "./plants";
import { evaluate } from "./verdict";
import { plantEmoji } from "./plantEmoji";
import type { Candidate } from "./types";

const c = (scientificName: string, score: number, commonName = ""): Candidate => ({
  scientificName,
  genus: scientificName.split(" ")[0],
  family: "",
  commonNames: commonName ? [commonName] : [],
  score,
});

// Same dataset, but pretending every row was human-checked (to test the "safe" path).
const verifiedIndex = buildIndex(plants.map((p) => ({ ...p, humanVerified: true })));

describe("dataset integrity", () => {
  it("has no duplicate scientific names (buildIndex throws otherwise)", () => {
    expect(() => buildIndex(plants)).not.toThrow();
  });

  it("every toxic/non-toxic verdict cites an exact ASPCA entry", () => {
    for (const p of plants) {
      if (p.toxicToCats !== null) expect(p.aspca, p.id).toBeTruthy();
      else expect(p.aspca, p.id).toBeNull();
    }
  });

  it("no genus is listed both as wholly non-toxic and as containing a toxic plant", () => {
    const safeGenera = plants.filter((p) => p.genusWide && p.toxicToCats === false).flatMap((p) => p.names.map(genusKey));
    const toxicGenera = new Set(plants.filter((p) => p.toxicToCats === true).flatMap((p) => p.names.map(genusKey)));
    for (const g of safeGenera) expect(toxicGenera.has(g), g).toBe(false);
  });

  it("every toxic plant has ASPCA symptoms; non-toxic ones don't", () => {
    for (const p of plants) {
      if (p.toxicToCats === true) {
        expect(p.effects?.clinicalSigns, p.id).toBeTruthy();
        expect(p.effects?.aspcaUrl, p.id).toMatch(/^https:\/\/www\.aspca\.org\//);
      } else expect(p.effects, p.id).toBeNull();
    }
  });

  it("every plant with care info has a watering interval", () => {
    for (const p of plants) if (p.care) expect(p.care.waterEvery, p.id).toBeTruthy();
  });

  it("lilies are flagged severe", () => {
    expect(plants.find((p) => p.id === "lily")?.severe).toBe(true);
    expect(plants.find((p) => p.id === "day-lily")?.severe).toBe(true);
  });
});

describe("plantEmoji", () => {
  it("picks by family, with genus overrides and a generic fallback", () => {
    expect(plantEmoji("Cactaceae", "Opuntia")).toBe("🌵");
    expect(plantEmoji("Euphorbiaceae", "Euphorbia")).toBe("🪴"); // pencil "cactus" is not a cactus
    expect(plantEmoji("Araceae", "Epipremnum")).toBe("🌿");
    expect(plantEmoji("Liliaceae", "Lilium")).toBe("🌷");
    expect(plantEmoji(undefined, undefined)).toBe("🪴");
  });
});

describe("speciesKey", () => {
  it("normalises cultivars, hybrids and case", () => {
    expect(speciesKey("Epipremnum aureum 'Marble Queen'")).toBe("epipremnum aureum");
    expect(speciesKey("Schlumbergera × buckleyi")).toBe("schlumbergera buckleyi");
    expect(speciesKey("Lilium x hybridum")).toBe("lilium hybridum");
  });
});

describe("verdict: toxic", () => {
  it("pothos sample photo (real Pl@ntNet output): two synonyms add up -> confident toxic", () => {
    const v = evaluate([c("Epipremnum pinnatum", 0.83469), c("Epipremnum aureum", 0.16121)]);
    expect(v.level).toBe("toxic");
    expect(v.reason).toBe("confident-toxic");
    expect(v.plant?.confidence).toBeCloseTo(0.9959, 3);
    expect(v.effects?.toxicPrinciples).toBe("Insoluble calcium oxalates");
  });

  it("possible toxic lookalike -> shows the lookalike's symptoms", () => {
    const v = evaluate([c("Chlorophytum comosum", 0.75), c("Dracaena trifasciata", 0.15)]);
    expect(v.effects?.plantName).toMatch(/Snake plant/);
  });

  it("any lily species triggers the severe warning", () => {
    const v = evaluate([c("Lilium candidum", 0.9)]);
    expect(v.level).toBe("toxic");
    expect(v.severe).toBe(true);
  });

  it("an unlisted Ficus (rubber plant) is toxic because ASPCA lists 'Ficus sp.'", () => {
    expect(evaluate([c("Ficus elastica", 0.8)]).level).toBe("toxic");
  });
});

describe("verdict: never 'safe' when unsure", () => {
  it("non-toxic plant with high confidence -> pending review until a human verified the row", () => {
    const v = evaluate([c("Chlorophytum comosum", 0.9)]);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("pending-review");
  });

  it("verified non-toxic plant with high confidence -> safe", () => {
    const v = evaluate([c("Chlorophytum comosum", 0.9)], verifiedIndex);
    expect(v.level).toBe("safe");
    expect(v.photoTip).toBeNull();
  });

  it("verified non-toxic plant but low confidence -> unknown + photo tip", () => {
    const v = evaluate([c("Chlorophytum comosum", 0.45)], verifiedIndex);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("low-confidence");
    expect(v.photoTip).toBeTruthy();
  });

  it("safe-looking top match but a toxic lookalike among alternatives -> possibly toxic", () => {
    const v = evaluate([c("Chlorophytum comosum", 0.75), c("Dracaena trifasciata", 0.15)], verifiedIndex);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("possible-toxic");
  });

  it("cactus-like Euphorbia (not itself listed) as an alternative -> possibly toxic via relative", () => {
    const v = evaluate([c("Opuntia microdasys", 0.65), c("Euphorbia trigona", 0.2)], verifiedIndex);
    expect(v.reason).toBe("possible-toxic");
  });

  it("Goeppertia (renamed Calathea) is NOT assumed safe", () => {
    const v = evaluate([c("Goeppertia orbifolia", 0.9)], verifiedIndex);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("not-in-dataset");
  });

  it("no plant recognised -> unknown + photo tip", () => {
    const v = evaluate([]);
    expect(v.reason).toBe("no-plant");
    expect(v.photoTip).toBeTruthy();
  });
});

describe("verdict: my real cactus photos (Pl@ntNet output, 2026-11-05)", () => {
  it("golden barrel (60%) -> identified, but not on ASPCA list", () => {
    const v = evaluate([c("Kroenleinia grusonii", 0.602), c("Eriosyce subgibbosa", 0.013), c("Echinocereus coccineus", 0.004)], verifiedIndex);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("not-listed");
    expect(v.care).not.toBeNull();
  });

  it("rat tail cactus (top guess wrong: peanut cactus 42%) -> unknown, never safe", () => {
    const v = evaluate([c("Chamaecereus silvestrii", 0.417), c("Aporocactus flagelliformis", 0.141), c("Cleistocactus winteri", 0.014)], verifiedIndex);
    expect(v.level).toBe("unknown");
    expect(v.photoTip).toBeTruthy();
  });

  it("Opuntia (species unsure, genus clear): scores add up to the genus, still below threshold", () => {
    const v = evaluate([c("Opuntia maxima", 0.244), c("Opuntia tuna", 0.129), c("Cylindropuntia fulgida", 0.063)], verifiedIndex);
    expect(v.plant?.confidence).toBeCloseTo(0.373, 3);
    expect(v.level).toBe("unknown");
    expect(v.reason).toBe("low-confidence");
  });
});

import { describe, expect, it } from "vitest";
import { rankByCare, rankBySafety, safetyLabel, uniquePlants, type ScanRecord } from "./history";

const rec = (name: string, reason: ScanRecord["reason"], difficulty: ScanRecord["difficulty"], at: number, severe = false): ScanRecord => ({
  id: name + at,
  at,
  thumb: null,
  commonName: name,
  scientificName: name,
  family: "",
  genus: "",
  reason,
  level: reason === "confident-safe" ? "safe" : reason === "confident-toxic" ? "toxic" : "unknown",
  severe,
  difficulty,
  confidence: 0.8,
});

const spider = rec("Chlorophytum comosum", "confident-safe", "Easy", 1);
const calathea = rec("Calathea insignis", "pending-review", "Hard", 2);
const barrel = rec("Kroenleinia grusonii", "not-listed", "Easy", 3);
const pothos = rec("Epipremnum aureum", "confident-toxic", "Easy", 4);
const lily = rec("Lilium longiflorum", "confident-toxic", null, 5, true);

describe("recent plants rankings", () => {
  it("safest first: non-toxic, then unsure, then toxic, lilies last", () => {
    const order = rankBySafety([lily, pothos, barrel, calathea, spider]).map((r) => r.scientificName);
    expect(order).toEqual(["Chlorophytum comosum", "Calathea insignis", "Kroenleinia grusonii", "Epipremnum aureum", "Lilium longiflorum"]);
  });

  it("easiest care first, ties broken by safety, unknown care last", () => {
    const order = rankByCare([lily, pothos, barrel, calathea, spider]).map((r) => r.scientificName);
    expect(order).toEqual(["Chlorophytum comosum", "Kroenleinia grusonii", "Epipremnum aureum", "Calathea insignis", "Lilium longiflorum"]);
  });

  it("keeps only the latest scan of each plant", () => {
    const older = rec("Epipremnum aureum", "possible-toxic", "Easy", 0);
    expect(uniquePlants([older, pothos])).toEqual([pothos]);
  });

  it("labels never call an unconfirmed plant non-toxic without saying so", () => {
    expect(safetyLabel(calathea)).toBe("Non-toxic (pending review)");
    expect(safetyLabel(barrel)).toBe("Not on ASPCA list");
    expect(safetyLabel(lily)).toBe("Deadly to cats");
  });
});

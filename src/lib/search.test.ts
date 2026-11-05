import { describe, expect, it } from "vitest";
import { plants } from "./plants";
import { searchPlants, verdictForEntry } from "./search";

const ids = (q: string) => searchPlants(q).map((p) => p.id);

describe("search by name", () => {
  it("finds by common name, ASPCA common name and scientific name, ignoring case and accents", () => {
    expect(ids("monstera")[0]).toBe("monstera");
    expect(ids("Swiss cheese")).toContain("monstera");
    expect(ids("mother-in-law")).toContain("snake-plant"); // ASPCA common name
    expect(ids("sansevieria")).toContain("snake-plant"); // old scientific name
    expect(ids("ÁLOE")[0]).toBe("aloe-vera");
  });

  it("ignores 1-letter queries and returns nothing for unknown plants", () => {
    expect(ids("a")).toEqual([]);
    expect(ids("tomato")).toEqual([]);
  });

  it("a searched plant gets the same verdict as a confident photo ID", () => {
    const byId = (id: string) => verdictForEntry(plants.find((p) => p.id === id)!).verdict;
    expect(byId("golden-pothos").level).toBe("toxic");
    expect(byId("spider-plant").level).toBe("safe");
    expect(byId("lily").severe).toBe(true);
    expect(byId("golden-barrel-cactus").cactusNote).toBeTruthy();
    expect(byId("golden-barrel-cactus").photoTip).toBeNull(); // no photo, no photo tip
    // ASPCA-listed non-toxic cacti get the real "Non-toxic" verdict, not the "probably" note
    expect(byId("old-man-cactus").level).toBe("safe");
    expect(byId("old-man-cactus").cactusNote).toBeNull();
    expect(byId("easter-lily-cactus").cactusNote).toBeNull();
  });
});

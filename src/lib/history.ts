// Recent scans, kept only on this phone (browser localStorage): no account, nothing sent to a server.
// Plus the two rankings shown in the menu: safest for cats, and easiest to care for.
import type { Care, Verdict, VerdictReason } from "./types";

export type ScanRecord = {
  id: string;
  at: number; // timestamp (ms)
  thumb: string | null; // small JPEG data URL of the first photo
  commonName: string;
  scientificName: string;
  family: string;
  genus: string;
  reason: VerdictReason;
  level: Verdict["level"];
  severe: boolean;
  difficulty: Care["difficulty"] | null;
  confidence: number;
};

const KEY = "pawsafe.recent.v1";
const MAX_RECORDS = 30;

export function loadHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private mode, blocked storage, or corrupt data: just show an empty list
  }
}

export function saveScan(verdict: Verdict, thumb: string | null): void {
  if (!verdict.plant) return; // nothing recognised, nothing to remember
  const record: ScanRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    thumb,
    commonName: verdict.genusInfo ? `${verdict.genusInfo.genus} (${verdict.plant.scientificName})` : verdict.plant.commonName,
    scientificName: verdict.plant.scientificName,
    family: verdict.plant.family,
    genus: verdict.plant.genus,
    reason: verdict.reason,
    level: verdict.level,
    severe: verdict.severe,
    difficulty: verdict.care?.difficulty ?? null,
    confidence: verdict.plant.confidence,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([record, ...loadHistory()].slice(0, MAX_RECORDS)));
  } catch {
    // storage full or blocked: the scan still worked, we just can't remember it
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** One entry per plant (its latest scan), newest first. */
export function uniquePlants(records: ScanRecord[]): ScanRecord[] {
  const seen = new Set<string>();
  return [...records]
    .sort((a, b) => b.at - a.at)
    .filter((r) => {
      const k = r.scientificName.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** 0 = safest. Unsure results rank between non-toxic and toxic; lilies rank last. */
const SAFETY_ORDER: Record<VerdictReason, number> = {
  "confident-safe": 0,
  "pending-review": 1, // ASPCA says non-toxic, entry not yet human-checked
  "low-confidence": 2, // probably a non-toxic plant, but unsure
  "not-listed": 3,
  "not-in-dataset": 3,
  "no-plant": 3,
  "toxic-relative": 4,
  "possible-toxic": 4,
  "confident-toxic": 5,
};
export const safetyRank = (r: ScanRecord) => SAFETY_ORDER[r.reason] + (r.severe ? 1 : 0);
export const MAX_SAFETY_RANK = 6; // confident toxic + severe (lilies)

const CARE_ORDER = { Easy: 0, Moderate: 1, Hard: 2 } as const;
export const careRank = (r: ScanRecord) => (r.difficulty ? CARE_ORDER[r.difficulty] : 3); // unknown care last

export const rankBySafety = (rs: ScanRecord[]) =>
  [...rs].sort((a, b) => safetyRank(a) - safetyRank(b) || careRank(a) - careRank(b) || b.at - a.at);

export const rankByCare = (rs: ScanRecord[]) =>
  [...rs].sort((a, b) => careRank(a) - careRank(b) || safetyRank(a) - safetyRank(b) || b.at - a.at);

/** Short badge text for a scan, matching the verdict colours. */
export function safetyLabel(r: Pick<ScanRecord, "reason" | "severe">): string {
  if (r.severe) return "Deadly to cats";
  switch (r.reason) {
    case "confident-safe":
      return "Non-toxic";
    case "pending-review":
      return "Non-toxic (pending review)";
    case "low-confidence":
      return "Not sure";
    case "not-listed":
      return "Not on ASPCA list";
    case "not-in-dataset":
    case "no-plant":
      return "Unknown";
    case "toxic-relative":
    case "possible-toxic":
      return "Possibly toxic";
    case "confident-toxic":
      return "Toxic";
  }
}

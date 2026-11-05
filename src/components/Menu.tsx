"use client";
// Top-left menu: a panel that slides in from the left. "Recent plants" shows the plants scanned on this
// phone, with two rankings: safest for cats, and easiest to care for.

import { useEffect, useRef, useState } from "react";
import {
  clearHistory,
  loadHistory,
  careRank,
  MAX_SAFETY_RANK,
  rankByCare,
  rankBySafety,
  safetyLabel,
  safetyRank,
  uniquePlants,
  type ScanRecord,
} from "@/lib/history";
import { plantEmoji } from "@/lib/plantEmoji";

type View = "menu" | "recent";
type Tab = "recent" | "safest" | "easiest";

const TABS: { id: Tab; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "safest", label: "Safest for cats" },
  { id: "easiest", label: "Easiest care" },
];

// Example plants for the #preview-recent design link (not saved anywhere)
const PREVIEW: ScanRecord[] = [
  ["Golden barrel cactus", "Kroenleinia grusonii", "Cactaceae", "not-listed", "unknown", "Easy", 1],
  ["Golden pothos", "Epipremnum aureum", "Araceae", "confident-toxic", "toxic", "Easy", 2],
  ["Spider plant", "Chlorophytum comosum", "Asparagaceae", "confident-safe", "safe", "Easy", 3],
  ["Calathea", "Calathea insignis", "Marantaceae", "pending-review", "unknown", "Hard", 4],
  ["Monstera (Monstera adansonii)", "Monstera adansonii", "Araceae", "possible-toxic", "unknown", "Easy", 5],
  ["Boston fern", "Nephrolepis exaltata", "Nephrolepidaceae", "low-confidence", "unknown", "Moderate", 6],
].map(([commonName, scientificName, family, reason, level, difficulty, h]) => ({
  id: String(h),
  at: Date.now() - Number(h) * 3_600_000,
  thumb: null,
  commonName: String(commonName),
  scientificName: String(scientificName),
  family: String(family),
  genus: String(scientificName).split(" ")[0],
  reason: reason as ScanRecord["reason"],
  level: level as ScanRecord["level"],
  severe: false,
  difficulty: difficulty as ScanRecord["difficulty"],
  confidence: 0.8,
}));

function timeAgo(at: number): string {
  const min = Math.round((Date.now() - at) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const BADGE = {
  safe: "bg-green-100 text-green-900",
  unknown: "bg-amber-100 text-amber-900",
  toxic: "bg-red-100 text-red-900",
  severe: "bg-red-700 text-white",
} as const;

/** Highlighter colour from the plant's actual rating (not just its position), so a toxic plant is never
 *  marked green even if it happens to be first. Hue 120 = green ... 0 = red; null = neutral grey. */
function highlightHue(r: ScanRecord, tab: Tab): number | null {
  if (tab === "safest") return Math.round(120 - (Math.min(safetyRank(r), MAX_SAFETY_RANK) / MAX_SAFETY_RANK) * 120);
  if (tab === "easiest") return r.difficulty ? [120, 55, 0][careRank(r)] : null;
  return null;
}

function PlantRow({ r, rank, showTime, hue }: { r: ScanRecord; rank?: number; showTime: boolean; hue?: number | null }) {
  return (
    <li className="flex items-center gap-3 py-3">
      {rank !== undefined && (
        <span className="w-6 flex-none text-center text-sm font-bold tabular-nums text-muted">{rank}</span>
      )}
      {r.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.thumb} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
      ) : (
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-leaf-wash text-2xl" aria-hidden="true">
          {plantEmoji(r.family, r.genus)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {hue !== undefined ? (
            <mark
              className={`highlighter ${hue === null ? "is-neutral" : ""}`}
              style={hue === null ? undefined : ({ "--hl-hue": hue } as React.CSSProperties)}
            >
              {r.commonName}
            </mark>
          ) : (
            r.commonName
          )}
        </p>
        <p className="truncate text-xs italic text-muted">{r.scientificName}</p>
        <div className="mt-1 flex flex-wrap gap-1 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${BADGE[r.severe ? "severe" : r.level]}`}>
            {safetyLabel(r)}
          </span>
          <span className="rounded-full bg-leaf-wash px-2 py-0.5 text-moss-deep">
            {r.difficulty ? `${r.difficulty} care` : "Care unknown"}
          </span>
          {showTime && <span className="px-1 py-0.5 text-muted">{timeAgo(r.at)}</span>}
        </div>
      </div>
    </li>
  );
}

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [tab, setTab] = useState<Tab>("recent");
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  function openMenu(start: View = "menu", data?: ScanRecord[]) {
    setRecords(data ?? loadHistory()); // read fresh each time, so new scans show up
    setView(start);
    setConfirmClear(false);
    setOpen(true);
  }

  // #preview-recent (or #preview-safest / #preview-easiest) opens the panel with example plants
  // (design check / demo video only; nothing is saved)
  useEffect(() => {
    const start = { "#preview-recent": "recent", "#preview-safest": "safest", "#preview-easiest": "easiest" }[location.hash];
    if (start) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off, only for the preview link
      setTab(start as Tab);
      openMenu("recent", PREVIEW);
    }
  }, []);

  // Close with Escape, stop the page behind from scrolling, and move focus into the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const plants = uniquePlants(records);
  const list = tab === "safest" ? rankBySafety(plants) : tab === "easiest" ? rankByCare(plants) : plants;

  return (
    <>
      <button type="button" onClick={() => openMenu()} aria-label="Open menu" aria-expanded={open} className="menu-button">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>

      {/* Dimmed page behind the panel; tap to close */}
      <div className={`menu-overlay ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === "menu" ? "Menu" : "Recent plants"}
        tabIndex={-1}
        className={`menu-panel ${open ? "is-open" : ""}`}
        inert={!open}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
          {view === "menu" ? (
            <div className="w-32">
              <div className="logo" role="img" aria-label="PawSafe Plants" />
            </div>
          ) : (
            <button type="button" onClick={() => setView("menu")} className="flex items-center gap-1 font-semibold text-moss">
              <span aria-hidden="true">‹</span> Menu
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="h-9 w-9 rounded-full text-xl text-muted hover:bg-leaf-wash">
            ✕
          </button>
        </div>

        {view === "menu" ? (
          <nav className="flex flex-col gap-1 pt-3">
            <button type="button" onClick={() => setOpen(false)} className="menu-item">
              <span aria-hidden="true">📷</span> Scan a plant
            </button>
            <button type="button" onClick={() => setView("recent")} className="menu-item">
              <span aria-hidden="true">🌿</span> Recent plants
              {plants.length > 0 && (
                <span className="ml-auto rounded-full bg-leaf-wash px-2 text-sm text-moss-deep">{plants.length}</span>
              )}
            </button>
          </nav>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col pt-3">
            <h2 className="text-xl font-bold">Recent plants</h2>
            <p className="text-xs text-muted">Saved on this phone only.</p>

            <div role="tablist" aria-label="Sort plants" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-leaf-wash p-1 text-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-1 py-1.5 font-medium leading-tight ${tab === t.id ? "bg-card text-moss-deep shadow-sm" : "text-muted"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {list.length === 0 ? (
              <p className="mt-6 text-center text-muted">
                No plants yet. Scan a plant and it will show up here, ranked by how safe it is for your cat and how
                easy it is to care for.
              </p>
            ) : (
              <>
                {tab !== "recent" && (
                  <p className="mt-3 text-xs text-muted">
                    {tab === "safest"
                      ? "Non-toxic plants first, then ones we're unsure about, then toxic ones. Ties go to the easier plant."
                      : "Easiest plants first. Ties go to the safer plant. Only “Non-toxic” plants are confirmed safe."}
                  </p>
                )}
                <ul className="mt-1 min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                  {list.map((r, i) => (
                    <PlantRow
                      key={r.id}
                      r={r}
                      rank={tab === "recent" ? undefined : i + 1}
                      showTime={tab === "recent"}
                      hue={tab === "recent" ? undefined : highlightHue(r, tab)}
                    />
                  ))}
                </ul>
                <div className="border-t border-line pt-3 text-sm">
                  {confirmClear ? (
                    <div className="flex items-center gap-3">
                      <span className="text-muted">Remove all {plants.length} plants?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearHistory();
                          setRecords([]);
                          setConfirmClear(false);
                        }}
                        className="font-semibold text-red-700 dark:text-red-400"
                      >
                        Yes, clear
                      </button>
                      <button type="button" onClick={() => setConfirmClear(false)} className="text-muted">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirmClear(true)} className="text-muted underline">
                      Clear recent plants
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

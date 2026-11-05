// Picks an emoji for the kind of plant, from its botanical family (and genus for a few special cases).
// Anything we can't place confidently gets the generic potted plant.

const BY_GENUS: Record<string, string> = {
  lilium: "🌷",
  hemerocallis: "🌷",
  rosa: "🌹",
  helianthus: "🌻",
  hibiscus: "🌺",
  tulipa: "🌷",
};

const BY_FAMILY: Record<string, string> = {
  cactaceae: "🌵", // true cacti only (the pencil "cactus" is a Euphorbia, so it doesn't get one)
  arecaceae: "🌴", // palms
  palmae: "🌴",
  orchidaceae: "🌸",
  gesneriaceae: "🌸", // African violet
  liliaceae: "🌷",
  rosaceae: "🌹",
  asteraceae: "🌼",
  malvaceae: "🌺",
  poaceae: "🌾", // grasses
  moraceae: "🌳", // figs
  araliaceae: "🌳", // umbrella tree, ivy
  // leafy tropicals and ferns
  araceae: "🌿",
  marantaceae: "🌿",
  nephrolepidaceae: "🌿",
  polypodiaceae: "🌿",
  pteridaceae: "🌿",
  aspleniaceae: "🌿",
  dryopteridaceae: "🌿",
  davalliaceae: "🌿",
};

export const GENERIC_PLANT = "🪴";

export function plantEmoji(family?: string, genus?: string): string {
  return BY_GENUS[genus?.toLowerCase() ?? ""] ?? BY_FAMILY[family?.toLowerCase() ?? ""] ?? GENERIC_PLANT;
}

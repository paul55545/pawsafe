# PawSafe Plants: decision log

A running log of decisions and problems, used as the script for the demo video.

## 2026-11-05: Day 1

### Stack: Next.js web app (PWA) on Vercel, not Expo/React Native
- One project for both the phone screen and the server; no app-store builds to wait for.
- The API key lives only on the server (a Vercel environment variable), never in the phone's code.
- Works on Android and iPhone from a single link.

### Setup problems hit (and fixed)
- Node 16 was too old for current Next.js: upgraded to Node 26.
- PowerShell blocked `npx` (script execution policy): used `npx.cmd`.
- Vercel's GitHub import kept failing with "repository not found": deployed with the Vercel CLI instead; deploys take about 1 minute.

### Plant identification: Pl@ntNet API (not an LLM)
- Returns a real per-species confidence score; an LLM's "confidence" is just a number it writes.
- Free (500 identifications/day).
- The first test on a sample pothos photo returned *Epipremnum pinnatum* (83%) and *E. aureum* (16%), the same plant under two botanical names. So the dataset must handle **synonyms**, and scores for the same plant are **added up**.

### Benchmark on my own 3 cacti (6 photos)
| Plant | Top result | Note |
|---|---|---|
| Golden barrel | *Kroenleinia grusonii* 51–60% | correct (newer name for *Echinocactus grusonii*) |
| Rat tail cactus | peanut cactus 36–42% | **wrong**; correct answer was 2nd (14–19%) |
| Opuntia | two *Opuntia* species 22–24% each | right genus, unsure species |

- Sending 2 photos of the same plant at once didn't raise the scores here (the photos were very similar).
- Conclusion: confidence is often low for cacti, and the top answer can be wrong. Never trust the top answer blindly.

### Safety design: the AI identifies, the dataset decides
- Toxicity comes **only** from a curated dataset built from the ASPCA cat plant list, matched by **scientific name**.
- Every toxic/non-toxic row stores the **exact ASPCA entry text** as its source.
- Rules are **asymmetric**, because saying "safe" wrongly is far worse than saying "toxic" wrongly:
  - **Safe** only if: confidence ≥ 60%, exact match to an ASPCA non-toxic entry, the row is human-verified, **and** no toxic plant appears among the likely matches (≥ 10%).
  - Any toxic plant at ≥ 10% triggers a warning, even if it isn't the top guess.
  - A plant in the same genus as a toxic plant (e.g. any *Euphorbia*, which often looks like a cactus) counts as "possibly toxic".
  - A whole genus only counts as non-toxic where ASPCA itself lists the whole genus (e.g. "Opuntia species").
  - Renamed plants (e.g. Calathea → *Goeppertia*) are **not** assumed safe if ASPCA doesn't list the new name. Synonyms are only added in the toxic direction unless ASPCA lists them.
  - Lilies (*Lilium*, *Hemerocallis*) show an extra severe warning.
- Threshold 60%: the confident correct results seen so far scored 83–99%, and the uncertain cacti 22–60%. To be re-tuned with more photos.
- The logic is a pure function with 18 automated tests, some built from my real photo results.

### Photo quality feedback
- **A, from the identification:** if confidence is below 60% or no plant is found, the app suggests a closer photo of a different part of the plant.
- **B, on the phone before uploading, no AI:** brightness check plus a blur check (variance of the Laplacian). Calibrated on my photos: real photos score 475–1522, blurred copies 12–105, threshold 60.

### Out of scope (on purpose)
Accounts, saved plant collections, watering reminders, disease diagnosis, offline mode, app stores.

### Watering intervals + "effects on cats" section
- Care card now shows *when* to water (soil dryness) **and** a typical interval ("about every 7–10 days"). The soil check comes first; the interval is a guide for spring/summer.
- Toxic plants now show **what causes it, the symptoms, and how serious it is**, quoted from each plant's own ASPCA page (19 pages fetched), with a link to the source.
- Deliberately **no "X grams = Y effect" numbers**: ASPCA doesn't publish them, and inventing doses would be unsafe. Seriousness is only shown where ASPCA states it (e.g. lilies: "death is possible"; poinsettia: "generally over-rated in toxicity").
- For a "possibly toxic" result, the app shows the symptoms of the toxic lookalike ("If it is Snake plant…").

### Genus-level "general info" (e.g. an unlisted Monstera)
- Real test: my Monstera adansonii photo came back 48% *Monstera adansonii*, which ASPCA doesn't list, while *Monstera deliciosa* is listed as toxic.
- If the candidates for a genus add up to ≥ 40% and that genus has an ASPCA-listed **toxic** member, the app now says **"Likely toxic: a Monstera"** and shows that member's care info and dangers, clearly labelled as general genus info.
- Only at genus level, and only in the warning direction. Same-genus plants usually share their irritants (all Monstera contain calcium oxalate), but not always (ASPCA lists *Aloe vera* as toxic and *Aloe retusa* as non-toxic), and families are far too broad. So genus info is never used to call a plant safe, and the verdict is never upgraded to a confident "Toxic".

### Recent plants + rankings (menu)
- A menu in the top-left slides in a panel with "Recent plants": every scan is saved **on the phone only** (browser storage, with a small thumbnail), so there are still no accounts and no database.
- Three views: Recent, **Safest for cats** (non-toxic → unsure → toxic, lilies last; ties go to the easier plant) and **Easiest care** (Easy → Moderate → Hard; ties go to the safer plant). Each plant appears once, using its latest scan.
- The labels keep the safety rules: "Non-toxic (pending review)" stays amber, and a plant only ranks as safe when its verdict was "Non-toxic". The ranking logic has its own unit tests.
- Result boxes reordered by importance: verdict → effects on cats → care → photo tip → other matches.

### Dataset verified by a human (2026-11-05)
- I checked all 43 rows of plants.json against the ASPCA website myself: all accurate, no changes needed. All rows are now marked humanVerified, which unlocks the green "Non-toxic" verdict. A test guards that unverified rows still can't say "Safe".

### "Probably low risk" note for spiny cacti
- Cacti ASPCA doesn't list (like my golden barrel and rat tail) now say "Probably low risk: a spiny cactus", with a note: probably safe, not known to be poisonous, and most cats won't bite into spines; the spines can still injure mouth, paws or eyes.
- The verdict stays amber, never green: "probably safe" is a judgement, not an ASPCA record.
- Excluded: spineless cacti (Christmas/mistletoe cactus: the spine argument doesn't apply), mescaline cacti (peyote, San Pedro), cactus lookalikes like Euphorbia (different family), and any result with a toxic plant among the likely matches.

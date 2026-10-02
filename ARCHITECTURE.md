# Architecture

This document explains how Meridian actually works under the hood — written so a human who inherited this (AI-assisted) codebase can understand and defend every part of it, e.g. in an interview. For "what is this app and how do I run it," see [README.md](README.md). For "what's planned next," see [ROADMAP.md](ROADMAP.md).

## The 30-second version

Meridian is a client-only React + TypeScript single-page app — no backend, no accounts, no database. One hook (`useGameLogic`) is the entire state machine: it tracks which of the 8 game modes is active, the current round, and the running list of guesses, and `App.tsx` just renders whichever game component matches that state. All country data (names, capitals, flags, population, etc.) is fetched once ahead of time by standalone Node scripts and committed as static JSON — the app never calls an external API at runtime except for optional map tiles and one Wikipedia lookup in Countryle. It builds with Vite and deploys to GitHub Pages via a single GitHub Actions workflow that lints, tests, and builds on every push to `main`.

---

## App shell & state machine

[`src/App.tsx`](src/App.tsx) is the composition root. There's no router — "routing" is just conditional rendering driven by `gameState`, which is one of `'home' | 'playing' | 'results'`:

- `gameState === 'home'` → `HomeScreen` (mode picker + per-game config screen)
- `gameState === 'playing'` → whichever component matches `gameType` (`flag`, `trivia`, `map`, `flag-grid`, `higher-or-lower`, `silhouette`, `odd-one-out`, `progressive`)
- `gameState === 'results'` → `Results`

Each game component is rendered with `key={currentRound}`, so React fully remounts it every round instead of the component having to reset its own local state (selected answer, revealed hints, etc.) by hand. `MapGame` and `SilhouetteGame` are loaded via `lazy()` and wrapped in `<Suspense>` because they pull in Leaflet, "a sizeable dependency" only those two modes need.

All the actual state lives in [`src/hooks/useGameLogic.ts`](src/hooks/useGameLogic.ts), which `App.tsx` calls once:

- **State:** `gameState`, `gameType`, `difficulty`, `totalRounds`, `currentRound`, `countryIndex`, `guesses: Guess[]`, `factQuestions` (Trivia only), `lastSettings` (for Play Again), `countries` (the shuffled/filtered pool for this run, exposed as `pool`), `endless`.
- **`startGame(rounds, diff, type, region, endlessMode, minPop)`** filters the master country list by region and minimum population, shuffles it, and bails out with a `startError` if fewer than 4 countries match. Round count is special-cased: Countryle is always exactly 1 round, Endless mode uses the entire filtered pool, otherwise it's `min(rounds, pool.length)`. For Trivia specifically, it `await`s `buildFactQuestions(...)` before flipping to `'playing'`, since generating fact questions requires the lazily-loaded enriched dataset.
- **`handleGuess`** / **`handleTriviaGuess`** both append a `Guess` record and call `advance()`, which either bumps `currentRound`/`countryIndex` or (if this was the last round) moves to `'results'`.
- **`playAgain()`** replays `lastSettings` through `startGame` again with a fresh shuffle. **`giveUp()`** goes to results if any guesses exist, otherwise straight home.
- `options` is a memoized 4-country multiple-choice set (via `getAnswerOptions`) recomputed whenever the current country changes — used by FlagCard/SilhouetteGame/ProgressiveGame. Other mini-games (FlagGridGame, HigherOrLowerGame, OddOneOutGame) instead consume `pool` directly and build their own distractor sets, since they need more than 4 options or custom selection logic.

## The `useNextStep` + `NextControls` pattern

[`src/hooks/useNextStep.ts`](src/hooks/useNextStep.ts) is a small shared controller for "what happens after you answer": either auto-advance after a short delay, or wait for the player to click Next. It's used by 7 of the 8 games (all but Countryle, which has its own single-round flow with no "next round"):

- `autoNext: boolean`, persisted to `localStorage['meridian-auto-next']`, defaults to `true`.
- `schedule(delay, cb)` — if auto-next is on, calls `setTimeout(cb, delay)`; if off, stashes `cb` as `nextAction` so the UI can expose an enabled Next button instead.
- `toggle()` flips the setting; if turning auto-next back **on** while an action is pending, it fires that action immediately rather than leaving the player stuck.

Each game component calls `schedule(delayMs, () => onGuess(...))` right after the player answers, so the correct/incorrect reveal has time to show before advancing. The actual UI — a Next button plus an auto-continue switch — used to be copy-pasted into all 7 components as a raw checkbox sitting beside the button. That's now one shared component, [`src/components/NextControls.tsx`](src/components/NextControls.tsx): the Next button on top, and a proper pill-style toggle switch underneath it (an ARIA `role="switch"` button, not a native checkbox), styled in `src/index.css`'s `.auto-switch*` rules.

## Data layer & pipeline

Two JSON files, both statically imported (Vite bundles JSON natively):

- **[`src/data/countries.json`](src/data/countries.json)** — 250 countries, the base dataset bundled into the main chunk. Shape: `name`, `flags.alt` (actual flag images are *not* inlined — only alt text), `cca2`, `region`, `capital`, `population`, `currencies`, `languages`, `tld`, `idd`, `area`, `latlng`, `borders`, `demonyms`, `coatOfArms`, `car` (see `src/types/country.ts`'s `Country` type).
- **[`src/data/countriesEnriched.json`](src/data/countriesEnriched.json)** — same 250 entries plus `majorCities` and a `facts` block (`highestPoint`, `lowestPoint`, `climate`, `coastline`, `nationalSymbols`, `independenceDate`, `terrain`) sourced from the CIA World Factbook. It's ~500KB and only Trivia mode needs it, so it's loaded via a dynamic `import()` inside `questionGenerators.ts`'s `loadEnrichedByCca2()` (cached after the first call) — this keeps it out of the main bundle entirely.

Generation pipeline (run manually, not at app runtime):

1. **`npm run fetch-countries`** → [`scripts/fetch-countries.js`](scripts/fetch-countries.js) — pulls base fields from the REST Countries API and writes `countries.json`. ⚠️ Targets the now-deprecated v3.1 API; needs migrating to v5 before it can be re-run.
2. **`npm run fetch-flags`** → [`scripts/fetch-flags.js`](scripts/fetch-flags.js) — downloads one SVG per country from flagcdn.com into `public/flags/`. Independent of REST Countries, unaffected by its deprecation.
3. **`npm run enrich`** → [`scripts/enrichCountries.ts`](scripts/enrichCountries.ts) (via `tsx`) — merges in city population data and CIA Factbook facts, matching Factbook country names to `cca2` via a normalized lookup table plus a manual `FACTBOOK_ALIASES` dict for mismatches. Writes `countriesEnriched.json`.

All the text-cleaning helpers used by step 3 live in a separate, side-effect-free module, [`scripts/factbookText.ts`](scripts/factbookText.ts) — split out specifically so they can be unit-tested (`scripts/factbookText.test.ts`) without triggering `enrichCountries.ts`'s live network-fetching `main()`, which runs unconditionally at import time. Factbook prose is often messy by nature (parenthetical asides, "note -" run-ons, stray HTML tags/entities), so each raw field gets field-appropriate cleaning before it's stored:

- `firstSentence()` — truncates `climate`/`terrain` to their first sentence (pre-existing).
- `cleanNamedPlace()` — for `highestPoint`/`lowestPoint`: decodes HTML entities, strips HTML tags (treating `<br>` as a clause break, since the source uses it exactly like a semicolon), truncates at the first `;` to drop "note -" asides, strips `(...)` parentheticals, and returns `undefined` for "unnamed elevation ..." entries that have no real place name (so no fact is stored at all, same as missing data).
- `cleanSymbolText()` — for `nationalSymbols`: only strips HTML noise. Semicolons and parentheses are deliberately left alone here, since Factbook genuinely lists multiple symbols separated by `;` (e.g. "five-pointed star...; fennec fox") and uses parentheses for real alternate/scientific names — the aggressive truncation rules that work for a "name + elevation" fact would silently eat real data in this field.

Because this cleanup was added after `countriesEnriched.json` had already been generated and committed, a one-off migration script was run once (`cleanEnrichedFacts.ts`, since deleted) to re-clean the existing file's three affected fields in place, rather than re-running the whole network-dependent pipeline and risking unrelated drift in city/population data.

## Question generation

[`src/helpers/questionGenerators.ts`](src/helpers/questionGenerators.ts) builds every Trivia question. One `build*` function per category, each returning a `FactQuestion | null` (null when the country lacks the data that category needs):

`buildCapital` (with a "classic capital-trap" tier using the country's own major cities as distractors on hard difficulty), `buildRegion`, `buildTld`, `buildDrivingSide` (answer is the subject country's own name — the one category where the flag hint is hidden, since showing it would give the answer away), `buildSuperlative` (population/area/border-count comparisons among same-region countries, rejecting ties), `buildHighestPoint`, `buildIndependence` (extracts just a year via `parseYear()` regex rather than showing raw Factbook text — the precedent this plan's cleanup followed), and `buildNationalSymbol` (rejects a question if any distractor text-duplicates the correct answer). A shared `pickDistractors()` helper draws same-region candidates first, then falls back to global ones. `buildOne()` cycles through all 8 builders starting at a rotating index so consecutive questions vary in category, falling through to the next builder if one returns null, with a synthetic region question as the absolute last resort. `buildFactQuestions()` is the public entry point `useGameLogic.startGame` calls for Trivia mode.

## Per-game component summary

- **FlagCard** — classic "guess the country from its flag," 4-option multiple choice or type-ahead search on hard difficulty.
- **TriviaCard** — renders one `FactQuestion` as 4-option multiple choice with a category badge; shows the subject's flag as a hint on hard difficulty except where that would give away the answer.
- **FlagGridGame** — pick the correct flag out of a 3×3 grid of 9.
- **HigherOrLowerGame** — which of two countries has the larger population.
- **MapGame** — click the right country on a Leaflet world map (own independent Leaflet setup, not shared with `CountryMiniMap`).
- **OddOneOutGame** — spot the country that doesn't share a trait (region, currency, or language) with the other three.
- **ProgressiveGame** (player-facing name: "Countryle") — Wordle-style single-round guesser: each guess compares region/hemisphere/population/area/border-count to the target with directional arrows and closeness coloring, unlocking extra descriptive clues every 3 guesses. On finish it shows a Wikipedia summary, a Leaflet mini-map (`CountryMiniMap`, auto-zoomed to the country's real shape, with its own fullscreen expand), and a Google Maps link.
- **SilhouetteGame** — guess the country from its solid-black GeoJSON outline.

(The former Memory matching mini-game has been removed — it didn't fit the app's geography/trivia-knowledge theme.)

## Build & deploy

[`vite.config.ts`](vite.config.ts) sets `base: '/Meridian/'` so asset URLs resolve correctly under GitHub Pages' project-site path (`username.github.io/Meridian/`); `getFlagUrl()` and the GeoJSON fetches all build their URLs off Vite's `BASE_URL` rather than a hardcoded root for this reason. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`: `npm ci` → `npm run lint` → `npm run test` → `npm run build` → deploy to GitHub Pages via the modern OIDC-based Pages actions. There's no separate CI-only workflow — a failing lint or test blocks deployment outright, since it's the same job.

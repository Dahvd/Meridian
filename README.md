# Meridian

A geography mini-game hub: 8 game modes testing flags, maps, capitals, population, and more. All client-side, no backend, no accounts — built with React, TypeScript, Vite, and Leaflet.

**[Play it](https://dahvd.github.io/Meridian/)**

See [ARCHITECTURE.md](ARCHITECTURE.md) for how it's built under the hood.

## Game modes

- **Flags** — identify the country from its flag (multiple choice or type-to-search)
- **Trivia** — capital, currency, language, and other fact questions
- **Map** — click the country on a world map
- **Flag Grid** — spot the right flag in a 9-flag grid
- **Higher or Lower** — guess which country has the larger population
- **Silhouette** — guess the country from its outline
- **Odd One Out** — find the country that doesn't share a trait with the rest
- **Countryle** — Wordle-style guessing with clues that unlock over time

Most modes support region filters, difficulty levels, round counts, and an endless mode.

## Development

```bash
npm install
npm run dev        # start dev server
npm run lint        # eslint
npm run test        # vitest
npm run build        # typecheck + production build
```

Copy `.env.example` to `.env.local` and set `VITE_GITHUB_REPO` if you want the in-app feedback button to open GitHub issues against your own fork.

### Data pipeline

Country data and flag images are fetched once and committed as static assets rather than called at runtime:

```bash
npm run fetch-countries   # pulls base country data from REST Countries into src/data/countries.json
npm run fetch-flags       # downloads a flag SVG per country (from flagcdn.com) into public/flags/
npm run enrich            # adds major cities + CIA World Factbook facts into src/data/countriesEnriched.json
```

Re-run these only when you want to refresh the underlying data; countries rarely change.

**Note:** `fetch-countries.js` targets the REST Countries v3.1 API, which has been deprecated upstream (it now returns an error payload instead of data). The committed `src/data/countries.json` / `countriesEnriched.json` still work fine as static data, but refreshing them will require migrating `fetch-countries.js` to the v5 API first. `fetch-flags.js` is unaffected — it builds flag URLs directly from flagcdn.com's stable per-country-code scheme and doesn't depend on REST Countries at all.

## Data sources & attribution

- Country data (names, capitals, currencies, languages) — [REST Countries API](https://restcountries.com)
- Flag images — downloaded from [flagcdn.com](https://flagcdn.com) and served locally from `public/flags/`
- Country outlines / map boundaries — [Natural Earth](https://www.naturalearthdata.com) (`ne_110m_admin_0_countries`, public domain)
- Map tiles — [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, via [CARTO](https://carto.com/attributions)
- Major cities — [countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database)
- Country facts (highest point, terrain, etc.) — [CIA World Factbook](https://github.com/factbook/factbook.json)

## License

Code is licensed under [MIT](LICENSE). Country/map data is pulled from the third-party sources above and remains subject to their respective licenses and terms.

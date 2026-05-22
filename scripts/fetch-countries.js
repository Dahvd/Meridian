// Run with: node scripts/fetch-countries.js
// Fetches country data from restcountries.com and saves it as a bundled static asset.
// Re-run whenever you want to refresh country data (countries rarely change).

import { writeFileSync } from 'fs';

// API has a 10-field limit; two fetches lets us keep all trivia fields + add area
const FIELDS = 'name,flags,cca2,region,capital,population,currencies,languages,tld,idd';

console.log('Fetching country data...');
const [res1, res2] = await Promise.all([
  fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS}`),
  fetch(`https://restcountries.com/v3.1/all?fields=cca2,area`),
]);
if (!res1.ok) throw new Error(`API error: ${res1.status}`);
if (!res2.ok) throw new Error(`API error (area): ${res2.status}`);

const [data, areaData] = await Promise.all([res1.json(), res2.json()]);
const areaMap = new Map(areaData.map(c => [c.cca2, c.area ?? null]));

const valid = data
  .filter(c => c.flags?.svg && c.name?.common)
  .map(c => ({ ...c, area: areaMap.get(c.cca2) ?? null }))
  .sort((a, b) => a.name.common.localeCompare(b.name.common));

writeFileSync('src/data/countries.json', JSON.stringify(valid));
console.log(`Saved ${valid.length} countries to src/data/countries.json`);

// Run with: node scripts/fetch-countries.js
// Fetches country data from restcountries.com and saves it as a bundled static asset.
// Re-run whenever you want to refresh country data (countries rarely change).

import { writeFileSync } from 'fs';

// API has a 10-field limit; two fetches lets us keep all trivia fields + add area
const FIELDS = 'name,flags,cca2,region,capital,population,currencies,languages,tld,idd';

console.log('Fetching country data...');
const [res1, res2, res3, res4] = await Promise.all([
  fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS}`),
  fetch(`https://restcountries.com/v3.1/all?fields=cca2,area`),
  fetch(`https://restcountries.com/v3.1/all?fields=cca2,latlng`),
  fetch(`https://restcountries.com/v3.1/all?fields=cca2,borders`),
]);
if (!res1.ok) throw new Error(`API error: ${res1.status}`);
if (!res2.ok) throw new Error(`API error (area): ${res2.status}`);
if (!res3.ok) throw new Error(`API error (latlng): ${res3.status}`);
if (!res4.ok) throw new Error(`API error (borders): ${res4.status}`);

const [data, areaData, latlngData, bordersData] = await Promise.all([res1.json(), res2.json(), res3.json(), res4.json()]);
const areaMap = new Map(areaData.map(c => [c.cca2, c.area ?? null]));
const latlngMap = new Map(latlngData.map(c => [c.cca2, c.latlng ?? null]));
const bordersMap = new Map(bordersData.map(c => [c.cca2, c.borders ?? []]));

const valid = data
  .filter(c => c.flags?.svg && c.name?.common)
  .map(c => ({ ...c, area: areaMap.get(c.cca2) ?? null, latlng: latlngMap.get(c.cca2) ?? null, borders: bordersMap.get(c.cca2) ?? [] }))
  .sort((a, b) => a.name.common.localeCompare(b.name.common));

writeFileSync('src/data/countries.json', JSON.stringify(valid));
console.log(`Saved ${valid.length} countries to src/data/countries.json`);

import { readFileSync, writeFileSync } from 'fs';

const res = await fetch('https://restcountries.com/v3.1/all?fields=cca2,latlng');
if (!res.ok) throw new Error(`API error: ${res.status}`);
const latlngData = await res.json();
const latlngMap = new Map(latlngData.map(c => [c.cca2, c.latlng ?? null]));

const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));
const enriched = countries.map(c => ({ ...c, latlng: latlngMap.get(c.cca2) ?? null }));

writeFileSync('src/data/countries.json', JSON.stringify(enriched));
console.log(`Added latlng to ${enriched.length} countries`);

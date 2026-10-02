// Run with: node scripts/fetch-flags.js
// Downloads a flag SVG for every country in src/data/countries.json from flagcdn.com
// (URL built directly from the cca2 code — flagcdn's scheme is stable and doesn't require
// an API call) and saves it to public/flags/{cca2}.svg. Re-run to refresh flag images.
//
// Note: restcountries.com's v3.1 API (used by fetch-countries.js) was deprecated after this
// project was built, which is why this script no longer sources URLs from that API.

import { writeFileSync, mkdirSync, readFileSync } from 'fs';

const CONCURRENCY = 10;

async function withConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf-8'));

mkdirSync('public/flags', { recursive: true });

console.log(`Downloading ${countries.length} flags (concurrency=${CONCURRENCY})...`);

const tasks = countries.map((country) => async () => {
  const cca2 = country.cca2;
  if (!cca2) return { cca2: '?', ok: false };
  try {
    const res = await fetch(`https://flagcdn.com/${cca2.toLowerCase()}.svg`);
    if (!res.ok) return { cca2, ok: false };
    const bytes = Buffer.from(await res.arrayBuffer());
    writeFileSync(`public/flags/${cca2}.svg`, bytes);
    return { cca2, ok: true };
  } catch {
    return { cca2, ok: false };
  }
});

const results = await withConcurrency(tasks, CONCURRENCY);
const failed = results.filter((r) => !r.ok).map((r) => r.cca2);

console.log(`Saved ${results.length - failed.length}/${results.length} flags to public/flags/`);
if (failed.length > 0) {
  console.warn(`Failed (no flagcdn.com entry for this code): ${failed.join(', ')}`);
}

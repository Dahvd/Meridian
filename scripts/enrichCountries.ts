// Run once with: npm run enrich
// Fetches cities + CIA factbook data and merges into countriesEnriched.json.
// Does NOT overwrite the original countries.json.

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface FactbookFacts {
  highestPoint?: string;
  lowestPoint?: string;
  climate?: string;
  coastline?: string;
  nationalSymbols?: string;
  independenceDate?: string;
  terrain?: string;
}

type Country = Record<string, unknown> & {
  cca2: string;
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, { common: string; official: string }>;
  };
  capital?: string[];
  majorCities?: string[];
  facts?: FactbookFacts;
};

interface CityEntry {
  name: string;
  population: number | null;
  type: string | null;
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

async function safeFetch(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

function getText(obj: unknown): string | undefined {
  if (obj && typeof obj === 'object' && 'text' in (obj as object)) {
    const t = (obj as { text: unknown }).text;
    return typeof t === 'string' ? t : undefined;
  }
  return undefined;
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]*[.!?]/);
  return m ? m[0].trim() : text.split('\n')[0].trim();
}

// Decode the handful of HTML entities that appear in factbook JSON strings
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&ocirc;': 'ô', '&eacute;': 'é', '&egrave;': 'è',
  '&agrave;': 'à', '&iuml;': 'ï', '&uuml;': 'ü', '&ouml;': 'ö',
  '&auml;': 'ä', '&ntilde;': 'ñ', '&ccedil;': 'ç',
};
function decodeHtml(s: string): string {
  return s.replace(/&[a-z]+;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? '');
}

// Lowercase, decode HTML, strip diacritics + punctuation, collapse spaces
function norm(name: string): string {
  return decodeHtml(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// Source 1 — Cities
// ─────────────────────────────────────────────

const CITIES_BASE =
  'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/contributions/cities';

// Only entries whose type represents an actual inhabited place.
// The source dataset sometimes labels administrative regions (departments, counties) as "city",
// so we also deduplicate by name and rely on population for ranking.
const CITY_TYPES = new Set(['city', 'capital', 'municipality', 'town', 'village', 'locality', 'section', 'parish']);

async function buildCitiesMap(countries: Country[]): Promise<Map<string, string[]>> {
  const tasks = countries.map((country) => async (): Promise<{ iso2: string; cities: string[] }> => {
    const iso2 = country.cca2.toUpperCase();
    const data = (await safeFetch(`${CITIES_BASE}/${iso2}.json`)) as CityEntry[] | null;
    if (!Array.isArray(data)) return { iso2, cities: [] };

    const capitalNorm = norm(country.capital?.[0] ?? '');

    // Deduplicate by exact name, keep highest-population copy
    const byName = new Map<string, CityEntry>();
    for (const c of data) {
      if (!c.name || !CITY_TYPES.has(c.type ?? '')) continue;
      const existing = byName.get(c.name);
      if (!existing || (c.population ?? 0) > (existing.population ?? 0)) byName.set(c.name, c);
    }

    const cities = [...byName.values()]
      .filter((c) => (c.population ?? 0) > 0 && norm(c.name) !== capitalNorm)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
      .slice(0, 5)
      .map((c) => c.name);

    return { iso2, cities };
  });

  console.log(`Fetching cities for ${countries.length} countries (concurrency=20)...`);
  const results = await withConcurrency(tasks, 20);

  const map = new Map<string, string[]>();
  for (const { iso2, cities } of results) map.set(iso2, cities);
  return map;
}

// ─────────────────────────────────────────────
// Source 2 — CIA World Factbook
// ─────────────────────────────────────────────

const FACTBOOK_BASE = 'https://raw.githubusercontent.com/factbook/factbook.json/master';

const FACTBOOK_FILES = [
  'africa/ag.json', 'africa/ao.json', 'africa/bc.json', 'africa/bn.json', 'africa/by.json',
  'africa/cd.json', 'africa/cf.json', 'africa/cg.json', 'africa/cm.json', 'africa/cn.json',
  'africa/ct.json', 'africa/cv.json', 'africa/dj.json', 'africa/eg.json', 'africa/ek.json',
  'africa/er.json', 'africa/et.json', 'africa/ga.json', 'africa/gb.json', 'africa/gh.json',
  'africa/gv.json', 'africa/iv.json', 'africa/ke.json', 'africa/li.json', 'africa/lt.json',
  'africa/ly.json', 'africa/ma.json', 'africa/mi.json', 'africa/ml.json', 'africa/mo.json',
  'africa/mp.json', 'africa/mr.json', 'africa/mz.json', 'africa/ng.json', 'africa/ni.json',
  'africa/od.json', 'africa/pu.json', 'africa/rw.json', 'africa/se.json', 'africa/sf.json',
  'africa/sg.json', 'africa/sh.json', 'africa/sl.json', 'africa/so.json', 'africa/su.json',
  'africa/to.json', 'africa/tp.json', 'africa/ts.json', 'africa/tz.json', 'africa/ug.json',
  'africa/uv.json', 'africa/wa.json', 'africa/wi.json', 'africa/wz.json', 'africa/za.json',
  'africa/zi.json',
  'australia-oceania/aq.json', 'australia-oceania/as.json', 'australia-oceania/at.json',
  'australia-oceania/bp.json', 'australia-oceania/ck.json', 'australia-oceania/cq.json',
  'australia-oceania/cr.json', 'australia-oceania/cw.json', 'australia-oceania/fj.json',
  'australia-oceania/fm.json', 'australia-oceania/fp.json', 'australia-oceania/gq.json',
  'australia-oceania/kr.json', 'australia-oceania/kt.json', 'australia-oceania/nc.json',
  'australia-oceania/ne.json', 'australia-oceania/nf.json', 'australia-oceania/nh.json',
  'australia-oceania/nr.json', 'australia-oceania/nz.json', 'australia-oceania/pc.json',
  'australia-oceania/ps.json', 'australia-oceania/rm.json', 'australia-oceania/tl.json',
  'australia-oceania/tn.json', 'australia-oceania/tv.json', 'australia-oceania/um.json',
  'australia-oceania/wf.json', 'australia-oceania/wq.json', 'australia-oceania/ws.json',
  'central-america-n-caribbean/aa.json', 'central-america-n-caribbean/ac.json',
  'central-america-n-caribbean/av.json', 'central-america-n-caribbean/bb.json',
  'central-america-n-caribbean/bf.json', 'central-america-n-caribbean/bh.json',
  'central-america-n-caribbean/bq.json', 'central-america-n-caribbean/cj.json',
  'central-america-n-caribbean/cs.json', 'central-america-n-caribbean/cu.json',
  'central-america-n-caribbean/do.json', 'central-america-n-caribbean/dr.json',
  'central-america-n-caribbean/es.json', 'central-america-n-caribbean/gj.json',
  'central-america-n-caribbean/gt.json', 'central-america-n-caribbean/ha.json',
  'central-america-n-caribbean/ho.json', 'central-america-n-caribbean/jm.json',
  'central-america-n-caribbean/mh.json', 'central-america-n-caribbean/nn.json',
  'central-america-n-caribbean/nu.json', 'central-america-n-caribbean/pm.json',
  'central-america-n-caribbean/rn.json', 'central-america-n-caribbean/rq.json',
  'central-america-n-caribbean/sc.json', 'central-america-n-caribbean/st.json',
  'central-america-n-caribbean/tb.json', 'central-america-n-caribbean/td.json',
  'central-america-n-caribbean/tk.json', 'central-america-n-caribbean/uc.json',
  'central-america-n-caribbean/vc.json', 'central-america-n-caribbean/vi.json',
  'central-america-n-caribbean/vq.json',
  'central-asia/aj.json', 'central-asia/am.json', 'central-asia/gg.json',
  'central-asia/kg.json', 'central-asia/kz.json', 'central-asia/rs.json',
  'central-asia/ti.json', 'central-asia/tx.json', 'central-asia/uz.json',
  'east-n-southeast-asia/bm.json', 'east-n-southeast-asia/bx.json',
  'east-n-southeast-asia/cb.json', 'east-n-southeast-asia/ch.json',
  'east-n-southeast-asia/hk.json', 'east-n-southeast-asia/id.json',
  'east-n-southeast-asia/ja.json', 'east-n-southeast-asia/kn.json',
  'east-n-southeast-asia/ks.json', 'east-n-southeast-asia/la.json',
  'east-n-southeast-asia/mc.json', 'east-n-southeast-asia/mg.json',
  'east-n-southeast-asia/my.json', 'east-n-southeast-asia/pf.json',
  'east-n-southeast-asia/pg.json', 'east-n-southeast-asia/pp.json',
  'east-n-southeast-asia/rp.json', 'east-n-southeast-asia/sn.json',
  'east-n-southeast-asia/th.json', 'east-n-southeast-asia/tt.json',
  'east-n-southeast-asia/tw.json', 'east-n-southeast-asia/vm.json',
  'europe/al.json', 'europe/an.json', 'europe/au.json', 'europe/ax.json',
  'europe/be.json', 'europe/bk.json', 'europe/bo.json', 'europe/bu.json',
  'europe/cy.json', 'europe/da.json', 'europe/dx.json', 'europe/ee.json',
  'europe/ei.json', 'europe/en.json', 'europe/ez.json', 'europe/fi.json',
  'europe/fo.json', 'europe/fr.json', 'europe/gi.json', 'europe/gk.json',
  'europe/gm.json', 'europe/gr.json', 'europe/hr.json', 'europe/hu.json',
  'europe/ic.json', 'europe/im.json', 'europe/it.json', 'europe/je.json',
  'europe/jn.json', 'europe/kv.json', 'europe/lg.json', 'europe/lh.json',
  'europe/lo.json', 'europe/ls.json', 'europe/lu.json', 'europe/md.json',
  'europe/mj.json', 'europe/mk.json', 'europe/mn.json', 'europe/mt.json',
  'europe/nl.json', 'europe/no.json', 'europe/pl.json', 'europe/po.json',
  'europe/ri.json', 'europe/ro.json', 'europe/si.json', 'europe/sm.json',
  'europe/sp.json', 'europe/sv.json', 'europe/sw.json', 'europe/sz.json',
  'europe/uk.json', 'europe/up.json', 'europe/vt.json',
  'middle-east/ae.json', 'middle-east/ba.json', 'middle-east/gz.json',
  'middle-east/ir.json', 'middle-east/is.json', 'middle-east/iz.json',
  'middle-east/jo.json', 'middle-east/ku.json', 'middle-east/le.json',
  'middle-east/mu.json', 'middle-east/qa.json', 'middle-east/sa.json',
  'middle-east/sy.json', 'middle-east/tu.json', 'middle-east/we.json',
  'middle-east/ym.json',
  'north-america/bd.json', 'north-america/ca.json', 'north-america/gl.json',
  'north-america/ip.json', 'north-america/mx.json', 'north-america/sb.json',
  'north-america/us.json',
  'south-america/ar.json', 'south-america/bl.json', 'south-america/br.json',
  'south-america/ci.json', 'south-america/co.json', 'south-america/ec.json',
  'south-america/fk.json', 'south-america/gy.json', 'south-america/ns.json',
  'south-america/pa.json', 'south-america/pe.json', 'south-america/sx.json',
  'south-america/uy.json', 'south-america/ve.json',
  'south-asia/af.json', 'south-asia/bg.json', 'south-asia/bt.json',
  'south-asia/ce.json', 'south-asia/in.json', 'south-asia/io.json',
  'south-asia/mv.json', 'south-asia/np.json', 'south-asia/pk.json',
];

// Factbook "conventional short form" (normalized) → countries.json name.common
// Only needed when the factbook name differs from the restcountries common name.
const FACTBOOK_ALIASES: Record<string, string> = {
  'drc': 'DR Congo',
  'congo brazzaville': 'Republic of the Congo',
  'gaza gaza strip': 'Palestine',
  'west bank': 'Palestine',
  'viet nam': 'Vietnam',
  'timor leste': 'Timor-Leste',
  'cape verde': 'Cabo Verde',
  'swaziland': 'Eswatini',
  'burma': 'Myanmar',
  'saint helena ascension and tristan da cunha': 'Saint Helena, Ascension and Tristan da Cunha',
  'micronesia': 'Micronesia',
  'falkland islands islas malvinas': 'Falkland Islands',
  'holy see vatican city': 'Vatican City',
  'the bahamas': 'Bahamas',
  'the gambia': 'Gambia',
  'the dominican': 'Dominican Republic',
  // Svalbard factbook entry has a very long name with explanatory text
  'svalbard sometimes referred to as spitsbergen the largest island in the archipelago': 'Svalbard and Jan Mayen',
  // "the" mismatch: factbook omits "the" in official name
  'south georgia and south sandwich islands': 'South Georgia',
  // Jan Mayen is a standalone factbook entry but my data merges it with Svalbard
  'jan mayen': 'Svalbard and Jan Mayen',
  // Gaza and West Bank both map to Palestine; second one encountered wins (fine either way)
};

type FactbookEntry = FactbookFacts & { _name: string };

async function buildFactbookMap(): Promise<Map<string, FactbookEntry>> {
  const tasks = FACTBOOK_FILES.map((path) => async () => {
    const data = await safeFetch(`${FACTBOOK_BASE}/${path}`);
    return data;
  });

  console.log(`Fetching ${FACTBOOK_FILES.length} factbook files (concurrency=20)...`);
  const results = await withConcurrency(tasks, 20);

  const map = new Map<string, FactbookEntry>();

  for (const data of results) {
    if (!data || typeof data !== 'object') continue;
    const d = data as Record<string, unknown>;

    const gov = (d.Government ?? {}) as Record<string, unknown>;
    const cnObj = (gov['Country name'] ?? {}) as Record<string, unknown>;
    const shortName = getText(cnObj['conventional short form']);
    if (!shortName || shortName.toLowerCase() === 'none') continue;

    const geo = (d.Geography ?? {}) as Record<string, unknown>;
    const elev = (geo['Elevation'] ?? {}) as Record<string, unknown>;

    const facts: FactbookFacts = {};

    const hp = getText(elev['highest point']);
    if (hp) facts.highestPoint = hp;
    const lp = getText(elev['lowest point']);
    if (lp) facts.lowestPoint = lp;

    const climate = getText(geo['Climate']);
    if (climate) facts.climate = firstSentence(climate);
    const coastline = getText(geo['Coastline']);
    if (coastline) facts.coastline = coastline;
    const terrain = getText(geo['Terrain']);
    if (terrain) facts.terrain = firstSentence(terrain);

    const natSym = getText(gov['National symbol(s)']);
    if (natSym) facts.nationalSymbols = natSym;
    const indep = getText(gov['Independence']);
    if (indep) facts.independenceDate = indep;

    map.set(norm(shortName), { ...facts, _name: shortName });
  }

  return map;
}

// ─────────────────────────────────────────────
// Name matching
// ─────────────────────────────────────────────

function buildNameLookup(countries: Country[]): Map<string, string> {
  const lookup = new Map<string, string>(); // normalized name → cca2

  for (const c of countries) {
    lookup.set(norm(c.name.common), c.cca2);
    lookup.set(norm(c.name.official), c.cca2);
    for (const native of Object.values(c.name.nativeName ?? {})) {
      if (native.common) lookup.set(norm(native.common), c.cca2);
    }
  }

  // Wire up factbook aliases: normalized alias → cca2 via common name
  for (const [aliasNorm, targetCommon] of Object.entries(FACTBOOK_ALIASES)) {
    const cca2 = lookup.get(norm(targetCommon));
    if (cca2) lookup.set(aliasNorm, cca2);
  }

  return lookup;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const countriesPath = join(__dirname, '../src/data/countries.json');
  const countries = JSON.parse(readFileSync(countriesPath, 'utf-8')) as Country[];
  console.log(`Loaded ${countries.length} countries from countries.json`);

  // Fetch both sources in parallel; a full failure of one source doesn't kill the other
  const [citiesResult, factbookResult] = await Promise.allSettled([
    buildCitiesMap(countries),
    buildFactbookMap(),
  ]);

  const citiesMap: Map<string, string[]> =
    citiesResult.status === 'fulfilled'
      ? citiesResult.value
      : (console.error('Cities source failed entirely:', citiesResult.reason), new Map());

  const factbookRaw: Map<string, FactbookEntry> =
    factbookResult.status === 'fulfilled'
      ? factbookResult.value
      : (console.error('Factbook source failed entirely:', factbookResult.reason), new Map());

  // Match factbook entries → cca2
  const nameLookup = buildNameLookup(countries);
  const cca2ToFacts = new Map<string, FactbookFacts>();
  const unmatched: string[] = [];

  for (const [normalizedName, entry] of factbookRaw) {
    const cca2 = nameLookup.get(normalizedName);
    if (cca2) {
      const { _name: _discarded, ...facts } = entry;
      if (Object.keys(facts).length > 0) cca2ToFacts.set(cca2, facts);
    } else {
      unmatched.push(entry._name);
    }
  }

  // Merge: preserve all existing fields, add majorCities + facts
  const enriched: Country[] = countries.map((country) => {
    const result: Country = { ...country, majorCities: citiesMap.get(country.cca2) ?? [] };
    const facts = cca2ToFacts.get(country.cca2);
    if (facts) result.facts = facts;
    return result;
  });

  const outputPath = join(__dirname, '../src/data/countriesEnriched.json');
  writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
  console.log(`\nWritten → src/data/countriesEnriched.json`);

  // ── Report ──────────────────────────────────
  const FACT_FIELDS = [
    'highestPoint', 'lowestPoint', 'climate', 'coastline',
    'nationalSymbols', 'independenceDate', 'terrain',
  ] as const;

  console.log('\n═══════════════════════════════');
  console.log('       ENRICHMENT REPORT       ');
  console.log('═══════════════════════════════');
  console.log(`Total countries:                 ${countries.length}`);
  console.log(`With majorCities (≥1 city):      ${enriched.filter((c) => (c.majorCities?.length ?? 0) > 0).length}`);
  console.log(`With any facts block:            ${enriched.filter((c) => c.facts).length}`);
  console.log('Facts field coverage:');
  for (const field of FACT_FIELDS) {
    const count = enriched.filter((c) => c.facts?.[field]).length;
    console.log(`  ${field.padEnd(20)} ${count}`);
  }

  if (unmatched.length > 0) {
    console.log(`\nFactbook entries NOT matched (${unmatched.length}) — add to FACTBOOK_ALIASES if needed:`);
    for (const name of [...unmatched].sort()) console.log(`  - "${name}"`);
  } else {
    console.log('\nAll factbook entries matched successfully.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

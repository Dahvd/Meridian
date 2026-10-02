import type { Country, EnrichedCountry } from '../types/country';
import { shuffle } from './countryHelpers';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FactQuestion = {
  prompt: string;
  category: string;
  options: string[];      // exactly 4, already shuffled
  correctAnswer: string;  // one of options
  country: EnrichedCountry;
};

// ── Module-level data ─────────────────────────────────────────────────────────

// countriesEnriched.json (~544KB) is only needed for Trivia, so it's loaded on
// demand instead of bundled into the main chunk. Cached after the first call.
let enrichedByCca2Promise: Promise<Map<string, EnrichedCountry>> | null = null;

function loadEnrichedByCca2(): Promise<Map<string, EnrichedCountry>> {
  if (!enrichedByCca2Promise) {
    enrichedByCca2Promise = import('../data/countriesEnriched.json').then(
      mod => new Map((mod.default as unknown as EnrichedCountry[]).map(c => [c.cca2, c]))
    );
  }
  return enrichedByCca2Promise;
}

// ── Shared distractor helper ──────────────────────────────────────────────────

/**
 * Pick `count` distinct distractors, never including `correct`.
 * Draws first from `preferred` (same-region), then `fallback` (global).
 */
function pickDistractors(
  correct: string,
  count: number,
  preferred: string[],
  fallback: string[],
): string[] {
  const seen = new Set([correct]);
  const result: string[] = [];
  for (const item of shuffle([...new Set(preferred)])) {
    if (!seen.has(item)) { seen.add(item); result.push(item); }
    if (result.length === count) return result;
  }
  for (const item of shuffle([...new Set(fallback)])) {
    if (!seen.has(item)) { seen.add(item); result.push(item); }
    if (result.length === count) return result;
  }
  return result;
}

// ── 1. Capital ────────────────────────────────────────────────────────────────

export function buildCapital(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
): FactQuestion | null {
  const capital = country.capital?.[0];
  if (!capital) return null;

  const majorCities = (country.majorCities ?? []).filter(c => c !== capital);

  let distractors: string[];

  if (difficulty !== 'normal' && majorCities.length >= 3) {
    // Tier 1 (hard): own major cities as classic capital-trap distractors
    distractors = shuffle(majorCities).slice(0, 3);
  } else {
    // Tier 2: real capitals of other countries (same-region preferred on hard)
    const sameRegionCapitals = pool
      .filter(c => c.region === country.region && c.cca2 !== country.cca2)
      .flatMap(c => c.capital ?? []);
    const globalCapitals = pool
      .filter(c => c.cca2 !== country.cca2)
      .flatMap(c => c.capital ?? []);
    distractors = pickDistractors(
      capital, 3,
      difficulty === 'hard' ? sameRegionCapitals : [],
      globalCapitals,
    );
  }

  if (distractors.length < 3) return null;
  return {
    prompt: `What is the capital of ${country.name.common}?`,
    category: 'Capital',
    options: shuffle([capital, ...distractors]),
    correctAnswer: capital,
    country,
  };
}

// ── 2. Region ─────────────────────────────────────────────────────────────────

export function buildRegion(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
): FactQuestion | null {
  const correct = country.region;
  if (!correct) return null;
  const allRegions = [...new Set(pool.map(c => c.region).filter(Boolean))];
  const others = shuffle(allRegions.filter(r => r !== correct)).slice(0, 3);
  if (others.length < 3) return null;
  return {
    prompt: `Which region is ${country.name.common} in?`,
    category: 'Region',
    options: shuffle([correct, ...others]),
    correctAnswer: correct,
    country,
  };
}

// ── 3. TLD ────────────────────────────────────────────────────────────────────

export function buildTld(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
): FactQuestion | null {
  const tld = country.tld?.find(t => /^\.[a-z]{2,3}$/.test(t));
  if (!tld) return null;

  const sameRegionTlds = pool
    .filter(c => c.region === country.region && c.cca2 !== country.cca2)
    .flatMap(c => c.tld?.filter(t => /^\.[a-z]{2,3}$/.test(t)) ?? []);
  const globalTlds = pool
    .filter(c => c.cca2 !== country.cca2)
    .flatMap(c => c.tld?.filter(t => /^\.[a-z]{2,3}$/.test(t)) ?? []);

  const distractors = pickDistractors(
    tld, 3,
    difficulty === 'hard' ? sameRegionTlds : [],
    globalTlds,
  );
  if (distractors.length < 3) return null;
  return {
    prompt: `What is the internet domain extension of ${country.name.common}?`,
    category: 'Domain',
    options: shuffle([tld, ...distractors]),
    correctAnswer: tld,
    country,
  };
}

// ── 4. Driving Side ───────────────────────────────────────────────────────────

export function buildDrivingSide(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
): FactQuestion | null {
  const side = country.car?.side;
  if (!side) return null;

  const opposite = pool.filter(c => c.car?.side && c.car.side !== side && c.cca2 !== country.cca2);
  if (opposite.length < 3) return null;

  const distractors = shuffle(opposite).slice(0, 3).map(c => c.name.common);
  return {
    prompt: `Which of these countries drives on the ${side}?`,
    category: 'Driving Side',
    options: shuffle([country.name.common, ...distractors]),
    correctAnswer: country.name.common,
    country,
  };
}

// ── 5. Superlative ────────────────────────────────────────────────────────────

type SuperlativeVariant = 'population' | 'area' | 'borders';
const SUPERLATIVE_VARIANTS: SuperlativeVariant[] = ['population', 'area', 'borders'];

function superlativeValue(c: EnrichedCountry, variant: SuperlativeVariant): number {
  if (variant === 'population') return c.population ?? 0;
  if (variant === 'area') return c.area ?? 0;
  return c.borders?.length ?? 0;
}

export function buildSuperlative(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  variant: SuperlativeVariant,
): FactQuestion | null {
  const regional = pool.filter(c => c.region === country.region);
  if (regional.length < 4) return null;

  const others = shuffle(regional.filter(c => c.cca2 !== country.cca2)).slice(0, 3);
  const group = [country, ...others];
  const winner = group.reduce((best, c) =>
    superlativeValue(c, variant) > superlativeValue(best, variant) ? c : best
  );

  // Skip ties (answer would be ambiguous)
  const winValue = superlativeValue(winner, variant);
  if (group.filter(c => superlativeValue(c, variant) === winValue).length > 1) return null;

  const label =
    variant === 'population' ? 'largest population' :
    variant === 'area' ? 'largest area' :
    'most land borders';

  return {
    prompt: `Which of these ${country.region} countries has the ${label}?`,
    category: 'Superlative',
    options: shuffle(group.map(c => c.name.common)),
    correctAnswer: winner.name.common,
    country: winner,
  };
}

// ── 6. Highest Point ──────────────────────────────────────────────────────────

export function buildHighestPoint(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
): FactQuestion | null {
  const hp = country.facts?.highestPoint;
  if (!hp) return null;

  const withHp = pool.filter(c => c.cca2 !== country.cca2 && c.facts?.highestPoint);
  const sameRegion = withHp
    .filter(c => c.region === country.region)
    .map(c => c.facts!.highestPoint!);
  const global = withHp.map(c => c.facts!.highestPoint!);

  const distractors = pickDistractors(
    hp, 3,
    difficulty === 'hard' ? sameRegion : [],
    global,
  );
  if (distractors.length < 3) return null;
  return {
    prompt: `What is the highest point in ${country.name.common}?`,
    category: 'Geography',
    options: shuffle([hp, ...distractors]),
    correctAnswer: hp,
    country,
  };
}

// ── 7. Independence Year ──────────────────────────────────────────────────────

function parseYear(text: string): string | null {
  const m = text.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? m[1] : null;
}

export function buildIndependence(
  country: EnrichedCountry,
): FactQuestion | null {
  const text = country.facts?.independenceDate;
  if (!text) return null;
  const year = parseYear(text);
  if (!year) return null;

  const yearNum = parseInt(year);
  // Synthetic offsets keep distractors tight (always within ±10 years).
  const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const candidates = [
    ...new Set(
      offsets
        .flatMap(d => [yearNum - d, yearNum + d])
        .filter(n => n >= 1500 && n <= 2025)
        .map(String)
        .filter(y => y !== year)
    ),
  ];
  const distractors = shuffle(candidates).slice(0, 3);
  if (distractors.length < 3) return null;

  return {
    prompt: `In what year did ${country.name.common} gain independence?`,
    category: 'History',
    options: shuffle([year, ...distractors]),
    correctAnswer: year,
    country,
  };
}

// ── 8. National Symbol ────────────────────────────────────────────────────────

export function buildNationalSymbol(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
): FactQuestion | null {
  const sym = country.facts?.nationalSymbols;
  if (!sym) return null;

  const withSym = pool.filter(c => c.cca2 !== country.cca2 && c.facts?.nationalSymbols);
  const sameRegion = withSym
    .filter(c => c.region === country.region)
    .map(c => c.facts!.nationalSymbols!);
  const global = withSym.map(c => c.facts!.nationalSymbols!);

  const distractors = pickDistractors(
    sym, 3,
    difficulty === 'hard' ? sameRegion : [],
    global,
  );
  if (distractors.length < 3) return null;
  // Reject if any distractor duplicates the correct answer (factbook reuse)
  if (new Set([sym, ...distractors]).size < 4) return null;

  return {
    prompt: `What is a national symbol of ${country.name.common}?`,
    category: 'Culture',
    options: shuffle([sym, ...distractors]),
    correctAnswer: sym,
    country,
  };
}

// ── Builder cycle ─────────────────────────────────────────────────────────────

// 8-slot cycle keeps consecutive questions varied; a failed slot falls through.
type Builder = (
  c: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
) => FactQuestion | null;

const BUILDERS: Builder[] = [
  buildCapital,
  (c, p) => buildRegion(c, p),
  buildTld,
  (c, p) => buildDrivingSide(c, p),
  (c, p) => buildSuperlative(c, p, SUPERLATIVE_VARIANTS[Math.floor(Math.random() * 3)]),
  buildHighestPoint,
  (c) => buildIndependence(c),
  buildNationalSymbol,
];

export function buildOne(
  country: EnrichedCountry,
  pool: EnrichedCountry[],
  difficulty: 'normal' | 'hard',
  preferredIdx: number,
): FactQuestion {
  for (let i = 0; i < BUILDERS.length; i++) {
    const q = BUILDERS[(preferredIdx + i) % BUILDERS.length](country, pool, difficulty);
    if (q) return q;
  }
  // Absolute fallback: region always succeeds on a non-trivial pool
  return buildRegion(country, pool) ?? {
    prompt: `Which region is ${country.name.common} in?`,
    category: 'Region',
    options: [country.region, 'Africa', 'Asia', 'Europe'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4),
    correctAnswer: country.region,
    country,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Build one fact question per country, cycling through all 8 types. */
export async function buildFactQuestions(
  countries: Country[],
  difficulty: 'normal' | 'hard' = 'normal',
): Promise<FactQuestion[]> {
  const enrichedByCca2 = await loadEnrichedByCca2();
  const enriched = countries
    .map(c => enrichedByCca2.get(c.cca2))
    .filter((c): c is EnrichedCountry => c !== undefined);

  return enriched.map((country, i) =>
    buildOne(country, enriched, difficulty, i % BUILDERS.length)
  );
}

/** Count how many countries in a pool satisfy each question type. */
export async function eligibleCounts(countries: Country[]): Promise<Record<string, number>> {
  const enrichedByCca2 = await loadEnrichedByCca2();
  const pool = countries
    .map(c => enrichedByCca2.get(c.cca2))
    .filter((c): c is EnrichedCountry => c !== undefined);

  return {
    capital: pool.filter(c => !!c.capital?.[0]).length,
    region: pool.filter(c => !!c.region).length,
    tld: pool.filter(c => c.tld?.some(t => /^\.[a-z]{2,3}$/.test(t))).length,
    drivingSide: pool.filter(c => !!c.car?.side).length,
    superlative: pool.filter(c => pool.filter(x => x.region === c.region).length >= 4).length,
    highestPoint: pool.filter(c => !!c.facts?.highestPoint).length,
    independence: pool.filter(c => {
      const t = c.facts?.independenceDate;
      return !!t && parseYear(t) !== null;
    }).length,
    nationalSymbol: pool.filter(c => !!c.facts?.nationalSymbols).length,
  };
}

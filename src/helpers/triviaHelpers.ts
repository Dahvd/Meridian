import type { Country } from '../types/country';
import countriesData from '../data/countries.json';
import nationalAnimalsRaw from '../data/national-animals.json';

export type TriviaQuestion = {
  prompt: string;
  category: string;
};

export type TriviaPool = 'capital' | 'animal' | 'language' | 'domain' | 'calling';

const ALL_COUNTRIES = countriesData as unknown as Country[];
const NATIONAL_ANIMALS = nationalAnimalsRaw as Record<string, string>;

// ── Pre-computed uniqueness maps (built once at module load) ──────────────────

/** Language codes spoken in 3 or fewer countries (distinctive enough for trivia) */
const UNIQUE_LANGUAGE_CODES = (() => {
  const counts = new Map<string, number>();
  for (const c of ALL_COUNTRIES) {
    for (const code of Object.keys(c.languages ?? {})) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, n]) => n <= 3).map(([k]) => k));
})();

/** Animal names that belong to exactly one country in our dataset */
const UNIQUE_ANIMAL_CCA2S = (() => {
  const counts = new Map<string, number>();
  for (const animal of Object.values(NATIONAL_ANIMALS)) {
    counts.set(animal, (counts.get(animal) ?? 0) + 1);
  }
  return new Set(
    Object.entries(NATIONAL_ANIMALS)
      .filter(([, animal]) => counts.get(animal) === 1)
      .map(([cca2]) => cca2)
  );
})();

// ── Helpers to extract TLD and calling code ───────────────────────────────────

/** Returns the standard latin ccTLD (e.g. ".jp"), or null if none */
function getLatinTLD(country: Country): string | null {
  return country.tld?.find(t => /^\.[a-z]{2,3}$/.test(t)) ?? null;
}

/** Returns the full dialing code (e.g. "+81"), or null for multi-suffix countries like the US */
function getCallingCode(country: Country): string | null {
  const { root, suffixes } = country.idd ?? {};
  if (!root || !suffixes || suffixes.length !== 1) return null;
  return root + suffixes[0];
}

function sharesStem(a: string, b: string, minLen = 5): boolean {
  return a.length >= minLen && b.length >= minLen && a.slice(0, minLen) === b.slice(0, minLen);
}

function isGiveaway(text: string, country: Country): boolean {
  const lower = text.toLowerCase();
  const name = country.name.common.toLowerCase();
  const demonym = country.demonyms?.eng?.m?.toLowerCase() ?? '';
  const nameWords = name.split(/[\s\-]+/);
  const textWords = lower.split(/\s+/);
  return lower.includes(name)
    || (demonym.length > 3 && lower.includes(demonym))
    || (lower.length > 3 && name.includes(lower))
    || textWords.some(w => w.length >= 3 && name.includes(w))
    || textWords.some(tw => nameWords.some(nw => sharesStem(tw, nw)));
}

// ── Question factories ────────────────────────────────────────────────────────

type QuestionFactory = {
  pool: TriviaPool;
  build: (country: Country) => TriviaQuestion | null;
};

const ALL_FACTORIES: QuestionFactory[] = [
  {
    pool: 'capital',
    build: country => {
      const capital = country.capital?.[0];
      if (!capital) return null;
      return { prompt: `What country has ${capital} as its capital city?`, category: 'Capital' };
    },
  },
  {
    pool: 'animal',
    build: country => {
      if (!UNIQUE_ANIMAL_CCA2S.has(country.cca2)) return null;
      const animal = NATIONAL_ANIMALS[country.cca2];
      return { prompt: `What country's national animal is the ${animal}?`, category: 'National Animal' };
    },
  },
  {
    pool: 'language',
    build: country => {
      const entries = Object.entries(country.languages ?? {});
      const unique = entries.find(([code]) => UNIQUE_LANGUAGE_CODES.has(code));
      if (!unique) return null;
      const [, langName] = unique;
      if (isGiveaway(langName, country)) return null;
      return { prompt: `What country has ${langName} as an official language?`, category: 'Language' };
    },
  },
  {
    pool: 'domain',
    build: country => {
      const tld = getLatinTLD(country);
      if (!tld) return null;
      return { prompt: `What country's internet domain extension is "${tld}"?`, category: 'Domain' };
    },
  },
  {
    pool: 'calling',
    build: country => {
      const code = getCallingCode(country);
      if (!code) return null;
      return { prompt: `What country has the international dialling code ${code}?`, category: 'Calling Code' };
    },
  },
];

// ── Public API ────────────────────────────────────────────────────────────────

export function generateTriviaQuestion(country: Country, enabledPools?: TriviaPool[]): TriviaQuestion {
  const active = enabledPools
    ? ALL_FACTORIES.filter(f => enabledPools.includes(f.pool))
    : ALL_FACTORIES;
  const shuffled = [...active].sort(() => Math.random() - 0.5);
  for (const { build } of shuffled) {
    const q = build(country);
    if (q) return q;
  }
  const capital = country.capital?.[0] ?? country.name.common;
  return { prompt: `What country has ${capital} as its capital city?`, category: 'Capital' };
}

/** Returns only countries that have at least one valid question in the given pools. */
export function filterForPools(countries: Country[], enabledPools: TriviaPool[]): Country[] {
  const active = ALL_FACTORIES.filter(f => enabledPools.includes(f.pool));
  return countries.filter(c => active.some(({ build }) => build(c) !== null));
}

export function buildTriviaQuestions(countries: Country[], enabledPools?: TriviaPool[]): TriviaQuestion[] {
  return countries.map(c => generateTriviaQuestion(c, enabledPools));
}

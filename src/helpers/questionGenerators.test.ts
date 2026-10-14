import { describe, it, expect } from 'vitest';
import type { EnrichedCountry } from '../types/country';
import {
  buildCapital,
  buildRegion,
  buildTld,
  buildDrivingSide,
  buildSuperlative,
  buildHighestPoint,
  buildIndependence,
  buildNationalSymbol,
  buildCurrency,
  buildOne,
} from './questionGenerators';

function makeCountry(overrides: Partial<EnrichedCountry> & { cca2: string }): EnrichedCountry {
  return {
    name: { common: overrides.cca2, official: overrides.cca2 },
    flags: {},
    region: 'Test',
    capital: [`${overrides.cca2} City`],
    population: 1_000_000,
    currencies: {},
    languages: {},
    tld: [`.${overrides.cca2.toLowerCase()}`],
    idd: { root: '+1', suffixes: ['0'] },
    area: 1000,
    latlng: [0, 0],
    borders: [],
    ...overrides,
  };
}

describe('buildCapital', () => {
  it('returns null with no capital', () => {
    const c = makeCountry({ cca2: 'AA', capital: [] });
    expect(buildCapital(c, [c], 'normal')).toBeNull();
  });

  it('prefers major-city distractors on hard mode when available', () => {
    const c = makeCountry({ cca2: 'AA', capital: ['Capital City'], majorCities: ['City1', 'City2', 'City3'] });
    const q = buildCapital(c, [c], 'hard');
    expect(q).not.toBeNull();
    expect(q!.options).toHaveLength(4);
    expect(q!.options).toEqual(expect.arrayContaining(['City1', 'City2', 'City3', 'Capital City']));
  });

  it('falls back to other countries capitals when major cities are insufficient', () => {
    const c = makeCountry({ cca2: 'AA', capital: ['Alpha'] });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', capital: ['Beta'] }),
      makeCountry({ cca2: 'CC', capital: ['Gamma'] }),
      makeCountry({ cca2: 'DD', capital: ['Delta'] }),
    ];
    const q = buildCapital(c, pool, 'normal');
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('Alpha');
    expect(q!.options).toHaveLength(4);
    expect(new Set(q!.options).size).toBe(4);
  });

  it('returns null when fewer than 3 distractor capitals exist', () => {
    const c = makeCountry({ cca2: 'AA', capital: ['Alpha'] });
    const pool = [c, makeCountry({ cca2: 'BB', capital: ['Beta'] })];
    expect(buildCapital(c, pool, 'normal')).toBeNull();
  });
});

describe('buildRegion', () => {
  it('returns null when fewer than 3 other regions exist', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe' });
    const pool = [c, makeCountry({ cca2: 'BB', region: 'Asia' })];
    expect(buildRegion(c, pool)).toBeNull();
  });

  it('builds a question when 3+ other regions exist', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe' });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Asia' }),
      makeCountry({ cca2: 'CC', region: 'Africa' }),
      makeCountry({ cca2: 'DD', region: 'Oceania' }),
    ];
    const q = buildRegion(c, pool);
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('Europe');
    expect(q!.options).toContain('Europe');
    expect(q!.options).toHaveLength(4);
  });
});

describe('buildTld', () => {
  it('returns null when the distractor pool is exhausted', () => {
    const c = makeCountry({ cca2: 'AA', tld: ['.aa'] });
    expect(buildTld(c, [c], 'normal')).toBeNull();
  });

  it('prefers same-region distractors on hard mode', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', tld: ['.aa'] });
    const sameRegion = [
      makeCountry({ cca2: 'BB', region: 'Europe', tld: ['.bb'] }),
      makeCountry({ cca2: 'CC', region: 'Europe', tld: ['.cc'] }),
      makeCountry({ cca2: 'DD', region: 'Europe', tld: ['.dd'] }),
    ];
    const global = [makeCountry({ cca2: 'EE', region: 'Asia', tld: ['.ee'] })];
    const q = buildTld(c, [c, ...sameRegion, ...global], 'hard');
    expect(q).not.toBeNull();
    expect(q!.options).toEqual(expect.arrayContaining(['.aa', '.bb', '.cc', '.dd']));
    expect(q!.options).not.toContain('.ee');
  });
});

describe('buildHighestPoint', () => {
  it('returns null when fewer than 3 other countries have highest-point facts', () => {
    const c = makeCountry({ cca2: 'AA', facts: { highestPoint: 'Peak A' } });
    expect(buildHighestPoint(c, [c], 'normal')).toBeNull();
  });

  it('prefers same-region distractors on hard mode', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', facts: { highestPoint: 'Peak A' } });
    const sameRegion = [
      makeCountry({ cca2: 'BB', region: 'Europe', facts: { highestPoint: 'Peak B' } }),
      makeCountry({ cca2: 'CC', region: 'Europe', facts: { highestPoint: 'Peak C' } }),
      makeCountry({ cca2: 'DD', region: 'Europe', facts: { highestPoint: 'Peak D' } }),
    ];
    const global = [makeCountry({ cca2: 'EE', region: 'Asia', facts: { highestPoint: 'Peak E' } })];
    const q = buildHighestPoint(c, [c, ...sameRegion, ...global], 'hard');
    expect(q).not.toBeNull();
    expect(q!.options).toEqual(expect.arrayContaining(['Peak A', 'Peak B', 'Peak C', 'Peak D']));
    expect(q!.options).not.toContain('Peak E');
  });
});

describe('buildNationalSymbol', () => {
  it('returns null when the distractor pool is exhausted', () => {
    const c = makeCountry({ cca2: 'AA', facts: { nationalSymbols: 'Eagle' } });
    expect(buildNationalSymbol(c, [c], 'normal')).toBeNull();
  });

  it('rejects when a distractor duplicates the correct answer', () => {
    const c = makeCountry({ cca2: 'AA', facts: { nationalSymbols: 'Eagle' } });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', facts: { nationalSymbols: 'Eagle' } }), // duplicate
      makeCountry({ cca2: 'CC', facts: { nationalSymbols: 'Lion' } }),
      makeCountry({ cca2: 'DD', facts: { nationalSymbols: 'Tiger' } }),
    ];
    expect(buildNationalSymbol(c, pool, 'normal')).toBeNull();
  });

  it('builds a question with 4 distinct symbols', () => {
    const c = makeCountry({ cca2: 'AA', facts: { nationalSymbols: 'Eagle' } });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', facts: { nationalSymbols: 'Lion' } }),
      makeCountry({ cca2: 'CC', facts: { nationalSymbols: 'Tiger' } }),
      makeCountry({ cca2: 'DD', facts: { nationalSymbols: 'Bear' } }),
    ];
    const q = buildNationalSymbol(c, pool, 'normal');
    expect(q).not.toBeNull();
    expect(new Set(q!.options).size).toBe(4);
  });
});

describe('buildCurrency', () => {
  it('returns null when the only currency is a giveaway', () => {
    const c = makeCountry({
      cca2: 'AA',
      name: { common: 'Switzerland', official: 'Switzerland' },
      demonyms: { eng: { f: 'Swiss', m: 'Swiss' } },
      currencies: { CHF: { name: 'Swiss franc', symbol: 'Fr' } },
    });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', currencies: { EUR: { name: 'Euro', symbol: '€' } } }),
      makeCountry({ cca2: 'CC', currencies: { USD: { name: 'US dollar', symbol: '$' } } }),
      makeCountry({ cca2: 'DD', currencies: { JPY: { name: 'Yen', symbol: '¥' } } }),
    ];
    expect(buildCurrency(c, pool, 'normal')).toBeNull();
  });

  it('returns null when fewer than 3 distractor currencies exist', () => {
    const c = makeCountry({ cca2: 'AA', currencies: { THB: { name: 'Baht', symbol: '฿' } } });
    expect(buildCurrency(c, [c], 'normal')).toBeNull();
  });

  it('excludes the country\'s own currencies from distractor options', () => {
    const c = makeCountry({ cca2: 'AA', currencies: { THB: { name: 'Baht', symbol: '฿' } } });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', currencies: { THB: { name: 'Baht', symbol: '฿' } } }), // shares currency
      makeCountry({ cca2: 'CC', currencies: { MYR: { name: 'Ringgit', symbol: 'RM' } } }),
      makeCountry({ cca2: 'DD', currencies: { IDR: { name: 'Rupiah', symbol: 'Rp' } } }),
      makeCountry({ cca2: 'EE', currencies: { VND: { name: 'Dong', symbol: '₫' } } }),
    ];
    const q = buildCurrency(c, pool, 'normal');
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('Baht');
    expect(q!.options).not.toContain(undefined);
    expect(new Set(q!.options).size).toBe(4);
  });

  it('prefers same-region distractors on hard mode', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', currencies: { AAA: { name: 'Currency A', symbol: 'a' } } });
    const sameRegion = [
      makeCountry({ cca2: 'BB', region: 'Europe', currencies: { BBB: { name: 'Currency B', symbol: 'b' } } }),
      makeCountry({ cca2: 'CC', region: 'Europe', currencies: { CCC: { name: 'Currency C', symbol: 'c' } } }),
      makeCountry({ cca2: 'DD', region: 'Europe', currencies: { DDD: { name: 'Currency D', symbol: 'd' } } }),
    ];
    const global = [makeCountry({ cca2: 'EE', region: 'Asia', currencies: { EEE: { name: 'Currency E', symbol: 'e' } } })];
    const q = buildCurrency(c, [c, ...sameRegion, ...global], 'hard');
    expect(q).not.toBeNull();
    expect(q!.options).toEqual(expect.arrayContaining(['Currency A', 'Currency B', 'Currency C', 'Currency D']));
    expect(q!.options).not.toContain('Currency E');
  });
});

describe('buildDrivingSide', () => {
  it('returns null when fewer than 3 opposite-side countries exist', () => {
    const c = makeCountry({ cca2: 'AA', car: { side: 'right', signs: [] } });
    const pool = [c, makeCountry({ cca2: 'BB', car: { side: 'left', signs: [] } })];
    expect(buildDrivingSide(c, pool)).toBeNull();
  });

  it('builds a question when 3+ opposite-side countries exist', () => {
    const c = makeCountry({ cca2: 'AA', car: { side: 'right', signs: [] } });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', car: { side: 'left', signs: [] } }),
      makeCountry({ cca2: 'CC', car: { side: 'left', signs: [] } }),
      makeCountry({ cca2: 'DD', car: { side: 'left', signs: [] } }),
    ];
    const q = buildDrivingSide(c, pool);
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('AA');
  });
});

describe('buildSuperlative', () => {
  it('skips ties (ambiguous answer returns null)', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', population: 100 });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Europe', population: 100 }), // tie
      makeCountry({ cca2: 'CC', region: 'Europe', population: 50 }),
      makeCountry({ cca2: 'DD', region: 'Europe', population: 10 }),
    ];
    expect(buildSuperlative(c, pool, 'population')).toBeNull();
  });

  it('picks the correct winner for population', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', population: 100 });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Europe', population: 50 }),
      makeCountry({ cca2: 'CC', region: 'Europe', population: 999 }),
      makeCountry({ cca2: 'DD', region: 'Europe', population: 10 }),
    ];
    const q = buildSuperlative(c, pool, 'population');
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('CC');
  });

  it('picks the correct winner for area', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', area: 100 });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Europe', area: 50 }),
      makeCountry({ cca2: 'CC', region: 'Europe', area: 10 }),
      makeCountry({ cca2: 'DD', region: 'Europe', area: 999 }),
    ];
    const q = buildSuperlative(c, pool, 'area');
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('DD');
  });

  it('picks the correct winner for borders', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', borders: ['X', 'Y'] });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Europe', borders: [] }),
      makeCountry({ cca2: 'CC', region: 'Europe', borders: ['X'] }),
      makeCountry({ cca2: 'DD', region: 'Europe', borders: ['X', 'Y', 'Z', 'W'] }),
    ];
    const q = buildSuperlative(c, pool, 'borders');
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('DD');
  });

  it('returns null with fewer than 4 countries in the region', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe' });
    const pool = [c, makeCountry({ cca2: 'BB', region: 'Europe' })];
    expect(buildSuperlative(c, pool, 'population')).toBeNull();
  });
});

describe('buildIndependence', () => {
  it('parses a year out of free-text independenceDate', () => {
    const c = makeCountry({ cca2: 'AA', facts: { independenceDate: '4 July 1776' } });
    const q = buildIndependence(c);
    expect(q).not.toBeNull();
    expect(q!.correctAnswer).toBe('1776');
  });

  it('returns null when no year can be parsed', () => {
    const c = makeCountry({ cca2: 'AA', facts: { independenceDate: 'unknown' } });
    expect(buildIndependence(c)).toBeNull();
  });

  it('keeps distractor years within the +/-10 offset and the 1500-2025 bound', () => {
    const c = makeCountry({ cca2: 'AA', facts: { independenceDate: '1 January 1520' } });
    const q = buildIndependence(c);
    expect(q).not.toBeNull();
    for (const opt of q!.options) {
      const year = parseInt(opt);
      expect(year).toBeGreaterThanOrEqual(1500);
      expect(year).toBeLessThanOrEqual(2025);
      expect(Math.abs(year - 1520)).toBeLessThanOrEqual(10);
    }
  });
});

describe('buildOne (cycling + fallback)', () => {
  it('always produces a non-null question, even when every preferred type fails', () => {
    // A country with no capital, no TLD, no car side, no facts — only region survives.
    const c = makeCountry({
      cca2: 'AA',
      region: 'Europe',
      capital: [],
      tld: [],
      car: undefined,
    });
    const pool = [
      c,
      makeCountry({ cca2: 'BB', region: 'Asia' }),
      makeCountry({ cca2: 'CC', region: 'Africa' }),
      makeCountry({ cca2: 'DD', region: 'Oceania' }),
    ];
    for (let startIdx = 0; startIdx < 8; startIdx++) {
      const q = buildOne(c, pool, 'normal', startIdx);
      expect(q).not.toBeNull();
      expect(q.category).toBe('Region');
    }
  });

  it('falls all the way back to a synthetic region question when the pool is tiny', () => {
    const c = makeCountry({ cca2: 'AA', region: 'Europe', capital: [], tld: [], car: undefined });
    const q = buildOne(c, [c], 'normal', 0);
    expect(q).not.toBeNull();
    expect(q.correctAnswer).toBe('Europe');
    expect(q.options).toContain('Europe');
  });
});

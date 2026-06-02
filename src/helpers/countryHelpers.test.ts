import { describe, it, expect } from 'vitest';
import { shuffle, getAnswerOptions } from './countryHelpers';
import type { Country } from '../types/country';

function makeCountry(cca2: string): Country {
  return {
    cca2,
    name: { common: cca2, official: cca2 },
    flags: { png: '', svg: '' },
    region: 'Test',
    capital: [`${cca2} City`],
    population: 1_000_000,
    currencies: { XTS: { name: 'Test Dollar', symbol: '$' } },
    languages: { tst: 'Testish' },
    tld: [`.${cca2.toLowerCase()}`],
    idd: { root: '+1', suffixes: ['23'] },
    area: 1000,
    latlng: [0, 0],
    borders: [],
  };
}

const COUNTRIES = ['AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'GG', 'HH'].map(makeCountry);

describe('shuffle', () => {
  it('returns an array with the same elements', () => {
    const result = shuffle(COUNTRIES);
    expect(result).toHaveLength(COUNTRIES.length);
    expect(result).toEqual(expect.arrayContaining(COUNTRIES));
  });

  it('does not mutate the original array', () => {
    const original = [...COUNTRIES];
    shuffle(COUNTRIES);
    expect(COUNTRIES).toEqual(original);
  });
});

describe('getAnswerOptions', () => {
  it('always includes the correct country', () => {
    for (let i = 0; i < COUNTRIES.length; i++) {
      const options = getAnswerOptions(COUNTRIES, i);
      expect(options.some(c => c.cca2 === COUNTRIES[i].cca2)).toBe(true);
    }
  });

  it('returns exactly 4 options', () => {
    const options = getAnswerOptions(COUNTRIES, 0);
    expect(options).toHaveLength(4);
  });

  it('contains no duplicates', () => {
    const options = getAnswerOptions(COUNTRIES, 0);
    const ids = options.map(c => c.cca2);
    expect(new Set(ids).size).toBe(4);
  });
});

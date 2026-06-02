import { describe, it, expect } from 'vitest';
import { generateTriviaQuestion, filterForPools, buildTriviaQuestions } from './triviaHelpers';
import type { Country } from '../types/country';
import countriesData from '../data/countries.json';

const ALL = countriesData as unknown as Country[];
const byCode = new Map(ALL.map(c => [c.cca2, c]));

describe('generateTriviaQuestion', () => {
  it('returns an object with prompt and category', () => {
    const japan = byCode.get('JP')!;
    const q = generateTriviaQuestion(japan);
    expect(q).toHaveProperty('prompt');
    expect(q).toHaveProperty('category');
    expect(q.prompt.length).toBeGreaterThan(0);
  });
});

describe('filterForPools', () => {
  it('keeps countries that have a valid question in the given pools', () => {
    const japan = byCode.get('JP')!;
    const result = filterForPools([japan], ['capital']);
    expect(result).toContain(japan);
  });

  it('excludes countries with no valid question for the pool', () => {
    const antarctica = ALL.find(c => !c.capital?.length);
    if (!antarctica) return;
    const result = filterForPools([antarctica], ['capital']);
    expect(result).not.toContain(antarctica);
  });
});

describe('buildTriviaQuestions', () => {
  it('returns one question per country', () => {
    const sample = ALL.slice(0, 5);
    const questions = buildTriviaQuestions(sample);
    expect(questions).toHaveLength(5);
  });
});

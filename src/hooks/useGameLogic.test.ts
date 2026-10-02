// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLogic } from './useGameLogic';
import type { Country } from '../types/country';

// buildFactQuestions (used by the 'trivia' game type) dynamically imports this file —
// mock it with entries matching the synthetic COUNTRIES below so the trivia path is testable
// without depending on the real, much larger committed dataset.
vi.mock('../data/countriesEnriched.json', () => ({
  default: [
    { cca2: 'AA', name: { common: 'AA', official: 'AA' }, flags: {}, region: 'Europe', capital: ['AA City'], population: 1_000_000, currencies: {}, languages: {}, tld: ['.aa'], idd: { root: '+1', suffixes: ['0'] }, area: 100, latlng: [0, 0], borders: [], majorCities: [], facts: {} },
    { cca2: 'BB', name: { common: 'BB', official: 'BB' }, flags: {}, region: 'Asia', capital: ['BB City'], population: 2_000_000, currencies: {}, languages: {}, tld: ['.bb'], idd: { root: '+1', suffixes: ['0'] }, area: 200, latlng: [0, 0], borders: [], majorCities: [], facts: {} },
    { cca2: 'CC', name: { common: 'CC', official: 'CC' }, flags: {}, region: 'Africa', capital: ['CC City'], population: 3_000_000, currencies: {}, languages: {}, tld: ['.cc'], idd: { root: '+1', suffixes: ['0'] }, area: 300, latlng: [0, 0], borders: [], majorCities: [], facts: {} },
    { cca2: 'DD', name: { common: 'DD', official: 'DD' }, flags: {}, region: 'Oceania', capital: ['DD City'], population: 4_000_000, currencies: {}, languages: {}, tld: ['.dd'], idd: { root: '+1', suffixes: ['0'] }, area: 400, latlng: [0, 0], borders: [], majorCities: [], facts: {} },
  ],
}));

function makeCountry(cca2: string, region: string): Country {
  return {
    name: { common: cca2, official: cca2 },
    flags: {},
    cca2,
    region,
    capital: [`${cca2} City`],
    population: 1_000_000,
    currencies: {},
    languages: {},
    tld: [`.${cca2.toLowerCase()}`],
    idd: { root: '+1', suffixes: ['0'] },
    area: 1000,
    latlng: [0, 0],
    borders: [],
  };
}

const COUNTRIES: Country[] = [
  makeCountry('AA', 'Europe'),
  makeCountry('BB', 'Asia'),
  makeCountry('CC', 'Africa'),
  makeCountry('DD', 'Oceania'),
  makeCountry('EE', 'Europe'),
];

describe('useGameLogic', () => {
  it('options is empty before any game starts', () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    expect(result.current.options).toEqual([]);
  });

  it('sets startError when the region-filtered pool has fewer than 4 countries', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(10, 'normal', 'flag', 'Africa');
    });
    expect(result.current.startError).toMatch(/not enough countries/i);
    expect(result.current.gameState).toBe('home');
  });

  it('starts a game and populates state correctly', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(3, 'normal', 'flag', 'all');
    });
    expect(result.current.gameState).toBe('playing');
    expect(result.current.totalRounds).toBe(3);
    expect(result.current.currentRound).toBe(0);
    expect(result.current.currentCountry).not.toBeNull();
    expect(result.current.options.length).toBeGreaterThan(0);
    expect(result.current.options.some(c => c.cca2 === result.current.currentCountry!.cca2)).toBe(true);
  });

  it('handleGuess records a correct guess, advances the round, and reaches results at the end', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(2, 'normal', 'flag', 'all');
    });

    const first = result.current.currentCountry!;
    act(() => {
      result.current.handleGuess(first);
    });
    expect(result.current.guesses).toHaveLength(1);
    expect(result.current.guesses[0].correct).toBe(true);
    expect(result.current.currentRound).toBe(1);
    expect(result.current.gameState).toBe('playing');

    const second = result.current.currentCountry!;
    act(() => {
      result.current.handleGuess(second);
    });
    expect(result.current.guesses).toHaveLength(2);
    expect(result.current.gameState).toBe('results');
  });

  it('handleGuess records an incorrect guess when the wrong country is selected', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(1, 'normal', 'flag', 'all');
    });
    const wrong = COUNTRIES.find(c => c.cca2 !== result.current.currentCountry!.cca2)!;
    act(() => {
      result.current.handleGuess(wrong);
    });
    expect(result.current.guesses[0].correct).toBe(false);
  });

  it('handleTriviaGuess records trivia metadata and advances', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(2, 'normal', 'trivia', 'all');
    });
    expect(result.current.currentFactQuestion).not.toBeNull();

    act(() => {
      result.current.handleTriviaGuess(true, 'some answer');
    });
    expect(result.current.guesses).toHaveLength(1);
    expect(result.current.guesses[0].correct).toBe(true);
    expect(result.current.guesses[0].triviaQuestion).toBeDefined();
    expect(result.current.currentRound).toBe(1);
  });

  it('playAgain replays with the last-used settings', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(2, 'hard', 'flag', 'all');
    });
    act(() => {
      result.current.goHome();
    });
    expect(result.current.gameState).toBe('home');

    await act(async () => {
      await result.current.playAgain();
    });
    expect(result.current.gameState).toBe('playing');
    expect(result.current.difficulty).toBe('hard');
  });

  it('playAgain goes home if no game has been started yet', () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    act(() => {
      result.current.playAgain();
    });
    expect(result.current.gameState).toBe('home');
  });

  it('giveUp goes to results when guesses exist', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(5, 'normal', 'flag', 'all');
    });
    act(() => {
      result.current.handleGuess(result.current.currentCountry!);
    });
    act(() => {
      result.current.giveUp();
    });
    expect(result.current.gameState).toBe('results');
  });

  it('giveUp goes home when no guesses exist yet', async () => {
    const { result } = renderHook(() => useGameLogic(COUNTRIES));
    await act(async () => {
      await result.current.startGame(5, 'normal', 'flag', 'all');
    });
    act(() => {
      result.current.giveUp();
    });
    expect(result.current.gameState).toBe('home');
  });
});

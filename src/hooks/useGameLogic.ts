import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import { getAnswerOptions, shuffle } from '../helpers/countryHelpers';
import { buildFactQuestions, type FactQuestion } from '../helpers/questionGenerators';

export type Guess = {
  correct: boolean;
  selected: Country;
  answer: Country;
  triviaQuestion?: { prompt: string; category: string };
  selectedText?: string;
  hintUsed?: boolean;
};

export type Difficulty = 'normal' | 'hard';
export type GameType = 'flag' | 'trivia' | 'map' | 'flag-grid' | 'higher-or-lower' | 'silhouette' | 'odd-one-out' | 'progressive' | 'memory';

type GameState = 'home' | 'playing' | 'results';

export type Region = 'all' | 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';

type LastSettings = {
  rounds: number;
  diff: Difficulty;
  type: GameType;
  region: Region;
  endless: boolean;
  minPop: number;
};

export function useGameLogic(allCountries: Country[]) {
  const [gameState, setGameState] = useState<GameState>('home');
  const [gameType, setGameType] = useState<GameType>('flag');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [totalRounds, setTotalRounds] = useState(10);
  const [currentRound, setCurrentRound] = useState(0);
  const [countryIndex, setCountryIndex] = useState(0);
  const [options, setOptions] = useState<Country[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [factQuestions, setFactQuestions] = useState<FactQuestion[]>([]);
  const [lastSettings, setLastSettings] = useState<LastSettings | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [endless, setEndless] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (gameState === 'playing' && countries.length > 0) {
      setOptions(getAnswerOptions(countries, countryIndex));
    }
  }, [gameState, countryIndex, countries]);

  function startGame(
    rounds: number,
    diff: Difficulty,
    type: GameType,
    region: Region = 'all',
    endlessMode = false,
    minPop = 0,
  ) {
    const regionFiltered = region === 'all'
      ? allCountries
      : allCountries.filter(c => c.region === region);
    const popFiltered = minPop > 0 ? regionFiltered.filter(c => c.population >= minPop) : regionFiltered;
    const pool = shuffle([...popFiltered]);

    if (pool.length < 4) {
      setStartError('Not enough countries match these settings. Try a different region or question type.');
      return;
    }
    setStartError(null);

    const gameRounds = type === 'progressive' ? 1 : endlessMode ? pool.length : Math.min(rounds, pool.length);
    const slice = pool.slice(0, gameRounds);

    const factQs = type === 'trivia' ? buildFactQuestions(slice, diff) : [];

    setLastSettings({ rounds, diff, type, region, endless: endlessMode, minPop });
    setTotalRounds(gameRounds);
    setDifficulty(diff);
    setGameType(type);
    setCurrentRound(0);
    setCountryIndex(0);
    setGuesses([]);
    setFactQuestions(factQs);
    setCountries(pool);
    setEndless(endlessMode);
    setGameState('playing');
  }

  function playAgain() {
    if (!lastSettings) { setGameState('home'); return; }
    const { rounds, diff, type, region, endless: e, minPop } = lastSettings;
    startGame(rounds, diff, type, region, e, minPop);
  }

  function handleGuess(selected: Country, hintUsed?: boolean) {
    const answer = countries[countryIndex];
    const correct = selected.cca2 === answer.cca2;
    const newGuesses = [...guesses, { correct, selected, answer, hintUsed }];
    setGuesses(newGuesses);
    advance(newGuesses.length);
  }

  function handleTriviaGuess(correct: boolean, selectedText: string) {
    const factQ = factQuestions[currentRound];
    const answer = factQ.country as Country;
    const newGuesses: Guess[] = [
      ...guesses,
      {
        correct,
        selected: answer,
        answer,
        triviaQuestion: { prompt: factQ.prompt, category: factQ.category },
        selectedText: correct ? undefined : selectedText,
      },
    ];
    setGuesses(newGuesses);
    advance(newGuesses.length);
  }

  function advance(roundsPlayed: number) {
    if (roundsPlayed === totalRounds) {
      setGameState('results');
    } else {
      setCurrentRound(r => r + 1);
      setCountryIndex(i => i + 1);
    }
  }

  function goHome() {
    setGameState('home');
  }

  function giveUp() {
    if (guesses.length > 0) {
      setGameState('results');
    } else {
      setGameState('home');
    }
  }

  return {
    gameState,
    gameType,
    difficulty,
    totalRounds,
    currentRound,
    options,
    guesses,
    endless,
    startError,
    pool: countries,
    currentCountry: countries[countryIndex] ?? null,
    currentFactQuestion: factQuestions[currentRound] ?? null,
    startGame,
    handleGuess: handleGuess as (selected: Country, hintUsed?: boolean) => void,
    handleTriviaGuess,
    playAgain,
    goHome,
    giveUp,
  };
}

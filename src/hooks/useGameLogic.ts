import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import { getAnswerOptions, shuffle } from '../helpers/countryHelpers';
import { buildTriviaQuestions, filterForPools, type TriviaQuestion, type TriviaPool } from '../helpers/triviaHelpers';

export type Guess = {
  correct: boolean;
  selected: Country;
  answer: Country;
  triviaQuestion?: TriviaQuestion;
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
  pools?: TriviaPool[];
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
  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestion[]>([]);
  const [lastSettings, setLastSettings] = useState<LastSettings | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [endless, setEndless] = useState(false);

  useEffect(() => {
    if (gameState === 'playing' && countries.length > 0) {
      setOptions(getAnswerOptions(countries, countryIndex));
    }
  }, [gameState, countryIndex, countries]);

  function startGame(
    rounds: number,
    diff: Difficulty,
    type: GameType,
    pools?: TriviaPool[],
    region: Region = 'all',
    endlessMode = false,
    minPop = 0,
  ) {
    const regionFiltered = region === 'all'
      ? allCountries
      : allCountries.filter(c => c.region === region);
    const popFiltered = minPop > 0 ? regionFiltered.filter(c => c.population >= minPop) : regionFiltered;
    const eligible = type === 'trivia' && pools?.length
      ? filterForPools(popFiltered, pools)
      : popFiltered;
    const pool = shuffle([...eligible]);
    const gameRounds = type === 'progressive' ? 1 : endlessMode ? pool.length : Math.min(rounds, pool.length);
    const questions = type === 'trivia' ? buildTriviaQuestions(pool.slice(0, gameRounds), pools) : [];

    setLastSettings({ rounds, diff, type, pools, region, endless: endlessMode, minPop });
    setTotalRounds(gameRounds);
    setDifficulty(diff);
    setGameType(type);
    setCurrentRound(0);
    setCountryIndex(0);
    setGuesses([]);
    setTriviaQuestions(questions);
    setCountries(pool);
    setEndless(endlessMode);
    setGameState('playing');
  }

  function playAgain() {
    if (!lastSettings) { setGameState('home'); return; }
    const { rounds, diff, type, pools, region, endless: e, minPop } = lastSettings;
    startGame(rounds, diff, type, pools, region, e, minPop);
  }

  function handleGuess(selected: Country, hintUsed?: boolean) {
    const answer = countries[countryIndex];
    const correct = selected.cca2 === answer.cca2;
    const triviaQuestion = gameType === 'trivia' ? triviaQuestions[currentRound] : undefined;
    const newGuesses = [...guesses, { correct, selected, answer, triviaQuestion, hintUsed }];
    setGuesses(newGuesses);

    const isLastRound = currentRound + 1 === totalRounds;

    if (isLastRound) {
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
    pool: countries,
    currentCountry: countries[countryIndex] ?? null,
    currentTriviaQuestion: triviaQuestions[currentRound] ?? null,
    startGame,
    handleGuess: handleGuess as (selected: Country, hintUsed?: boolean) => void,
    playAgain,
    goHome,
    giveUp,
  };
}

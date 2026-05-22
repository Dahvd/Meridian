import type { Country } from '../types/country';

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getAnswerOptions(countries: Country[], correctIndex: number): Country[] {
  const correct = countries[correctIndex];
  const pool = countries.filter((_, i) => i !== correctIndex);
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

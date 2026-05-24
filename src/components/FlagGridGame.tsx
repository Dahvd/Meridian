import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import { shuffle } from '../helpers/countryHelpers';
import { useNextStep } from '../hooks/useNextStep';
import countriesData from '../data/countries.json';

const FALLBACK = countriesData as unknown as Country[];

interface Props {
  country: Country;
  pool: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function FlagGridGame({ country, pool, currentRound, totalRounds, onGuess, onGiveUp }: Props) {
  const [selected, setSelected] = useState<Country | null>(null);
  const [grid, setGrid] = useState<Country[]>([]);
  const { autoNext, toggle, nextAction, schedule, reset } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  useEffect(() => {
    setSelected(null);
    reset();
    const source = pool.length >= 9 ? pool : FALLBACK;
    const distractors = shuffle(source.filter(c => c.cca2 !== country.cca2)).slice(0, 8);
    setGrid(shuffle([country, ...distractors]));
  }, [country, pool]);

  function handleClick(opt: Country) {
    if (selected) return;
    setSelected(opt);
    schedule(1000, () => onGuess(opt));
  }

  function cellClass(opt: Country) {
    if (!selected) return 'grid-flag-cell';
    if (opt.cca2 === country.cca2) return 'grid-flag-cell reveal-correct';
    if (opt.cca2 === selected.cca2) return 'grid-flag-cell reveal-incorrect';
    return 'grid-flag-cell dimmed';
  }

  return (
    <div className="card flag-grid-card">
      <div className="progress-header">
        <span className="round-label">Round {currentRound + 1} of {totalRounds}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="map-question">
        Find the flag of <strong>{country.name.common}</strong>
      </p>
      <div className="flag-grid-9">
        {grid.map(opt => (
          <button key={opt.cca2} className={cellClass(opt)} onClick={() => handleClick(opt)} disabled={!!selected}>
            <img src={opt.flags.svg} alt="" className="grid-flag-img" />
          </button>
        ))}
      </div>
      <div className="game-footer">
        <label className="auto-label">
          <input type="checkbox" checked={autoNext} onChange={toggle} />
          Auto continue
        </label>
        <button className="next-btn" onClick={nextAction ?? undefined} disabled={!nextAction || autoNext}>Next →</button>
      </div>
    </div>
  );
}

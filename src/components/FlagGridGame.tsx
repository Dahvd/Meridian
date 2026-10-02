import { useState, useMemo } from 'react';
import type { Country } from '../types/country';
import { shuffle, getFlagUrl } from '../helpers/countryHelpers';
import { useNextStep } from '../hooks/useNextStep';
import countriesData from '../data/countries.json';
import NextControls from './NextControls';

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
  const { autoNext, toggle, nextAction, schedule } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  const grid = useMemo(() => {
    const source = pool.length >= 9 ? pool : FALLBACK;
    const distractors = shuffle(source.filter(c => c.cca2 !== country.cca2)).slice(0, 8);
    return shuffle([country, ...distractors]);
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

  // Positional label, not the country name — naming it would give the answer away.
  function cellLabel(opt: Country, i: number): string {
    const base = `Option ${i + 1}`;
    if (!selected) return base;
    if (opt.cca2 === country.cca2) return `${base}, correct answer`;
    if (opt.cca2 === selected.cca2) return `${base}, your incorrect guess`;
    return base;
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
        {grid.map((opt, i) => (
          <button
            key={opt.cca2}
            className={cellClass(opt)}
            onClick={() => handleClick(opt)}
            disabled={!!selected}
            aria-label={cellLabel(opt, i)}
          >
            <img src={getFlagUrl(opt.cca2)} alt="" className="grid-flag-img" />
          </button>
        ))}
      </div>
      <NextControls nextAction={nextAction} autoNext={autoNext} toggle={toggle} />
    </div>
  );
}

import { useState, useMemo } from 'react';
import type { Country } from '../types/country';
import { shuffle, getFlagUrl } from '../helpers/countryHelpers';
import { useNextStep } from '../hooks/useNextStep';
import countriesData from '../data/countries.json';
import NextControls from './NextControls';

const FALLBACK = (countriesData as unknown as Country[]).filter(c => c.population > 0);

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

interface Props {
  country: Country;
  pool: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function HigherOrLowerGame({ country, pool, currentRound, totalRounds, onGuess, onGiveUp }: Props) {
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { autoNext, toggle, nextAction, schedule } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  const other = useMemo(() => {
    const source = pool.filter(c => c.population > 0 && c.cca2 !== country.cca2);
    const candidates = source.length >= 3 ? source : FALLBACK.filter(c => c.cca2 !== country.cca2);
    return shuffle(candidates)[0] ?? null;
  }, [country, pool]);

  function pick(chosen: 'left' | 'right') {
    if (!other || result) return;
    const leftCountry = country;
    const rightCountry = other;
    const correct = chosen === 'left' ? leftCountry.population >= rightCountry.population : rightCountry.population >= leftCountry.population;
    setResult(correct ? 'correct' : 'incorrect');
    setRevealed(true);
    schedule(1400, () => onGuess(correct ? leftCountry : rightCountry));
  }

  if (!other) return null;

  return (
    <div className="card hol-card">
      <div className="progress-header">
        <span className="round-label">Round {currentRound + 1} of {totalRounds}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="map-question" style={{ marginBottom: 20 }}>Which country has a <strong>larger population</strong>?</p>

      <div className="hol-grid">
        <button
          className={`hol-card-btn${result ? (country.population >= other.population ? ' hol-correct' : ' hol-incorrect') : ''}`}
          onClick={() => pick('left')}
          disabled={!!result}
        >
          <img src={getFlagUrl(country.cca2)} alt="" className="hol-flag" />
          <span className="hol-name">{country.name.common}</span>
          {revealed && <span className="hol-pop">{fmt(country.population)}</span>}
        </button>

        <div className="hol-vs">VS</div>

        <button
          className={`hol-card-btn${result ? (other.population >= country.population ? ' hol-correct' : ' hol-incorrect') : ''}`}
          onClick={() => pick('right')}
          disabled={!!result}
        >
          <img src={getFlagUrl(other.cca2)} alt="" className="hol-flag" />
          <span className="hol-name">{other.name.common}</span>
          {revealed && <span className="hol-pop">{fmt(other.population)}</span>}
        </button>
      </div>
      <NextControls nextAction={nextAction} autoNext={autoNext} toggle={toggle} />
    </div>
  );
}

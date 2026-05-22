import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import { shuffle } from '../helpers/countryHelpers';
import countriesData from '../data/countries.json';

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
  const [other, setOther] = useState<Country | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const progress = ((currentRound + 1) / totalRounds) * 100;

  useEffect(() => {
    setResult(null);
    setRevealed(false);
    const source = pool.filter(c => c.population > 0 && c.cca2 !== country.cca2);
    const candidates = source.length >= 3 ? source : FALLBACK.filter(c => c.cca2 !== country.cca2);
    setOther(shuffle(candidates)[0]);
  }, [country, pool]);

  function pick(chosen: 'left' | 'right') {
    if (!other || result) return;
    const leftCountry = country;
    const rightCountry = other;
    const leftPop = leftCountry.population;
    const rightPop = rightCountry.population;
    const correct = chosen === 'left' ? leftPop >= rightPop : rightPop >= leftPop;
    setResult(correct ? 'correct' : 'incorrect');
    setRevealed(true);
    // Pass the "correct" country as selected; the hook compares cca2
    setTimeout(() => onGuess(correct ? leftCountry : rightCountry), 1400);
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
          <img src={country.flags.svg} alt="" className="hol-flag" />
          <span className="hol-name">{country.name.common}</span>
          {revealed && <span className="hol-pop">{fmt(country.population)}</span>}
        </button>

        <div className="hol-vs">VS</div>

        <button
          className={`hol-card-btn${result ? (other.population >= country.population ? ' hol-correct' : ' hol-incorrect') : ''}`}
          onClick={() => pick('right')}
          disabled={!!result}
        >
          <img src={other.flags.svg} alt="" className="hol-flag" />
          <span className="hol-name">{other.name.common}</span>
          {revealed && <span className="hol-pop">{fmt(other.population)}</span>}
        </button>
      </div>
    </div>
  );
}

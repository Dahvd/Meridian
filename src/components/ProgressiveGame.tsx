import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import SearchInput from './SearchInput';

function popRange(pop: number): string {
  if (pop > 1_000_000_000) return 'over 1 billion';
  if (pop > 100_000_000) return '100M–1B';
  if (pop > 10_000_000) return '10M–100M';
  if (pop > 1_000_000) return '1M–10M';
  if (pop > 100_000) return '100K–1M';
  return 'under 100K';
}

interface Clue { label: string; value: string }

function cluesFor(country: Country): Clue[] {
  const list: Clue[] = [];
  if (country.region) list.push({ label: 'Region', value: country.region });
  list.push({ label: 'Population', value: popRange(country.population) });
  const capital = country.capital?.[0];
  if (capital) list.push({ label: 'Capital starts with', value: capital[0] + '…' });
  const lang = Object.values(country.languages ?? {})[0];
  if (lang) list.push({ label: 'Official language', value: lang });
  if (capital) list.push({ label: 'Capital city', value: capital });
  return list;
}

interface Props {
  country: Country;
  options: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function ProgressiveGame({ country, options, currentRound, totalRounds, onGuess, onGiveUp }: Props) {
  const [revealedCount, setRevealedCount] = useState(1);
  const [selected, setSelected] = useState<Country | null>(null);
  const [committed, setCommitted] = useState(false);
  const progress = ((currentRound + 1) / totalRounds) * 100;

  const clues = cluesFor(country);

  useEffect(() => {
    setRevealedCount(1);
    setSelected(null);
    setCommitted(false);
  }, [country.cca2]);

  function handlePick(opt: Country) {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onGuess(opt), 1000);
  }

  function getButtonClass(opt: Country) {
    if (!selected) return 'option-btn';
    if (opt.cca2 === country.cca2) return 'option-btn reveal-correct';
    if (opt.cca2 === selected.cca2) return 'option-btn reveal-incorrect';
    return 'option-btn dimmed';
  }

  return (
    <div className="card">
      <div className="progress-header">
        <span className="round-label">Round {currentRound + 1} of {totalRounds}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="map-question" style={{ marginBottom: 20 }}>Guess the country from the clues</p>

      <div className="clues-list">
        {clues.slice(0, revealedCount).map((clue, i) => (
          <div key={i} className="clue-row">
            <span className="clue-label">{clue.label}</span>
            <span className="clue-value">{clue.value}</span>
          </div>
        ))}
      </div>

      {!selected && revealedCount < clues.length && (
        <button className="hint-btn" style={{ marginBottom: 16 }} onClick={() => setRevealedCount(n => n + 1)}>
          Reveal next clue ({clues.length - revealedCount} remaining)
        </button>
      )}

      {!committed && (
        <div style={{ marginBottom: 12 }}>
          <SearchInput
            correctCountry={country}
            onGuess={c => { setCommitted(true); handlePick(c); }}
          />
        </div>
      )}

      <div className="options-grid">
        {options.map(opt => (
          <button
            key={opt.cca2}
            className={getButtonClass(opt)}
            onClick={() => handlePick(opt)}
            disabled={!!selected}
          >
            {opt.name.common}
          </button>
        ))}
      </div>
    </div>
  );
}

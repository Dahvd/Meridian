import { useState, useRef, useEffect } from 'react';
import type { Country } from '../types/country';
import countriesData from '../data/countries.json';

const ALL_COUNTRIES = (countriesData as unknown as Country[]).sort((a, b) =>
  a.name.common.localeCompare(b.name.common)
);

function getMatches(query: string): Country[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const starts = ALL_COUNTRIES.filter(c => c.name.common.toLowerCase().startsWith(q));
  const contains = ALL_COUNTRIES.filter(
    c => !c.name.common.toLowerCase().startsWith(q) && c.name.common.toLowerCase().includes(q)
  );
  return [...starts, ...contains].slice(0, 8);
}

interface Props {
  correctCountry: Country;
  onGuess: (country: Country) => void;
  showReveal?: boolean;
}

export default function SearchInput({ correctCountry, onGuess, showReveal = true }: Props) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Country[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [guessed, setGuessed] = useState<Country | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery('');
    setMatches([]);
    setGuessed(null);
    setHighlighted(0);
    inputRef.current?.focus();
  }, [correctCountry]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setMatches(getMatches(val));
    setHighlighted(0);
  }

  function commit(country: Country) {
    if (guessed) return;
    setGuessed(country);
    setMatches([]);
    setQuery(country.name.common);
    setTimeout(() => onGuess(country), 900);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (guessed) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && matches.length > 0) {
      commit(matches[highlighted]);
    } else if (e.key === 'Escape') {
      setMatches([]);
    }
  }

  const isCorrect = guessed?.cca2 === correctCountry.cca2;

  return (
    <div className="search-wrap">
      <div className={`search-input-wrap${guessed ? (isCorrect ? ' guessed-correct' : ' guessed-incorrect') : ''}`}>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Type a country name…"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={!!guessed}
          autoComplete="off"
          spellCheck={false}
        />
        {guessed && (
          <span className="search-icon">{isCorrect ? '✓' : '✗'}</span>
        )}
      </div>

      {!guessed && matches.length > 0 && (
        <ul className="search-dropdown">
          {matches.map((c, i) => (
            <li
              key={c.cca2}
              className={`search-option${i === highlighted ? ' highlighted' : ''}`}
              onMouseDown={() => commit(c)}
              onMouseEnter={() => setHighlighted(i)}
            >
              {c.name.common}
            </li>
          ))}
        </ul>
      )}

      {showReveal && guessed && !isCorrect && (
        <p className="search-reveal">
          Answer: <strong>{correctCountry.name.common}</strong>
        </p>
      )}
    </div>
  );
}

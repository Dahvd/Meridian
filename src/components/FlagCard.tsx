import { useState } from 'react';
import type { Country } from '../types/country';
import type { Difficulty } from '../hooks/useGameLogic';
import { useNextStep } from '../hooks/useNextStep';
import { getFlagUrl } from '../helpers/countryHelpers';
import SearchInput from './SearchInput';
import NextControls from './NextControls';

interface Props {
  country: Country;
  options: Country[];
  currentRound: number;
  totalRounds: number;
  difficulty: Difficulty;
  endless: boolean;
  onGuess: (country: Country, hintUsed?: boolean) => void;
  onGiveUp: () => void;
}

export default function FlagCard({ country, options, currentRound, totalRounds, difficulty, endless, onGuess, onGiveUp }: Props) {
  const [selected, setSelected] = useState<Country | null>(null);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [searchCommitted, setSearchCommitted] = useState(false);
  const { autoNext, toggle, nextAction, schedule } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  function handleClick(opt: Country) {
    if (selected) return;
    setSelected(opt);
    schedule(900, () => onGuess(opt, hintRevealed));
  }

  function getButtonClass(opt: Country) {
    if (!selected) return 'option-btn';
    if (opt.cca2 === country.cca2) return 'option-btn reveal-correct';
    if (opt.cca2 === selected.cca2) return 'option-btn reveal-incorrect';
    return 'option-btn dimmed';
  }

  const showButtons = difficulty === 'normal' || hintRevealed;
  const showHint = !showButtons && !searchCommitted;

  return (
    <div className="card">
      <div className="progress-header">
        <span className="round-label">{endless ? `Round ${currentRound + 1}` : `Round ${currentRound + 1} of ${totalRounds}`}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="flag-container">
        <img
          className="flag-img"
          src={getFlagUrl(country.cca2)}
          alt={selected ? (country.flags.alt ?? `Flag of ${country.name.common}`) : 'Flag'}
        />
      </div>
      <p className="question-label">Which country is this?</p>

      {showHint && (
        <SearchInput
          correctCountry={country}
          onGuess={c => { setSearchCommitted(true); onGuess(c, false); }}
        />
      )}

      {showHint && (
        <button className="hint-btn" onClick={() => setHintRevealed(true)}>
          Show options
        </button>
      )}

      {showButtons && (
        <div className="options-grid">
          {options.map(opt => (
            <button
              key={opt.cca2}
              className={getButtonClass(opt)}
              onClick={() => handleClick(opt)}
              disabled={!!selected}
            >
              {opt.name.common}
            </button>
          ))}
        </div>
      )}
      <NextControls nextAction={nextAction} autoNext={autoNext} toggle={toggle} />
    </div>
  );
}

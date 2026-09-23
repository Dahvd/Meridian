import { useState, useEffect } from 'react';
import type { FactQuestion } from '../helpers/questionGenerators';
import type { Difficulty } from '../hooks/useGameLogic';
import { useNextStep } from '../hooks/useNextStep';

interface Props {
  question: FactQuestion;
  currentRound: number;
  totalRounds: number;
  difficulty: Difficulty;
  endless: boolean;
  onGuess: (correct: boolean, selectedText: string) => void;
  onGiveUp: () => void;
}

// Category badge colour tokens — warm palette consistent with existing badges
const CATEGORY_CLASSES: Record<string, string> = {
  Capital: 'trivia-badge-green',
  Region: 'trivia-badge-blue',
  Domain: 'trivia-badge-orange',
  'Driving Side': 'trivia-badge-purple',
  Superlative: 'trivia-badge-teal',
  Geography: 'trivia-badge-green',
  History: 'trivia-badge-amber',
  Culture: 'trivia-badge-orange',
};

// Use 1-column layout when options are long strings (mountains, symbols, etc.)
function needsWideLayout(options: string[]): boolean {
  return options.some(o => o.length > 22);
}

export default function TriviaCard({
  question, currentRound, totalRounds, difficulty, endless, onGuess, onGiveUp,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { autoNext, toggle, nextAction, schedule, reset } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;
  const badgeClass = CATEGORY_CLASSES[question.category] ?? 'trivia-badge-green';
  const wide = needsWideLayout(question.options);

  useEffect(() => {
    setSelected(null);
    reset();
  }, [question]);

  function handleClick(opt: string) {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt === question.correctAnswer;
    schedule(900, () => onGuess(correct, opt));
  }

  function getButtonClass(opt: string): string {
    if (selected === null) return 'option-btn';
    if (opt === question.correctAnswer) return 'option-btn reveal-correct';
    if (opt === selected) return 'option-btn reveal-incorrect';
    return 'option-btn dimmed';
  }

  // Hard difficulty: show subject country flag as a visual hint.
  // Skip for Driving Side and Superlative — question.country is the correct answer there,
  // so showing its flag would give the answer away.
  const showFlag = difficulty === 'hard'
    && question.category !== 'Driving Side'
    && question.category !== 'Superlative';

  return (
    <div className="card">
      <div className="progress-header">
        <span className="round-label">
          {endless ? `Round ${currentRound + 1}` : `Round ${currentRound + 1} of ${totalRounds}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`player-badge trivia-badge ${badgeClass}`}>{question.category}</span>
          <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
        </div>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {showFlag && (
        <div className="trivia-flag-hint">
          <img
            src={question.country.flags.svg}
            alt={`Flag of ${question.country.name.common}`}
            className="trivia-flag-hint-img"
          />
        </div>
      )}

      <div className="trivia-prompt-wrap">
        <p className="trivia-prompt">{question.prompt}</p>
      </div>

      <div className={`trivia-options${wide ? ' trivia-options-wide' : ''}`}>
        {question.options.map(opt => (
          <button
            key={opt}
            className={getButtonClass(opt)}
            onClick={() => handleClick(opt)}
            disabled={selected !== null}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="game-footer">
        <label className="auto-label">
          <input type="checkbox" checked={autoNext} onChange={toggle} />
          Auto continue
        </label>
        <button
          className="next-btn"
          onClick={nextAction ?? undefined}
          disabled={!nextAction || autoNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

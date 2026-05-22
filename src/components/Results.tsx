import type { Guess, GameType } from '../hooks/useGameLogic';

interface Props {
  guesses: Guess[];
  totalRounds?: number;
  gameType: GameType;
  streak: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

function scoreColor(pct: number): string {
  if (pct >= 90) return '#d97706';
  if (pct >= 70) return '#166534';
  if (pct >= 50) return '#c2410c';
  return '#991b1b';
}

const GAME_LABELS: Record<GameType, string> = {
  'flag': 'Flags',
  'trivia': 'Trivia',
  'map': 'Map',
  'flag-grid': 'Flag Grid',
  'higher-or-lower': 'Higher or Lower',
  'silhouette': 'Silhouette',
  'odd-one-out': 'Odd One Out',
  'progressive': 'Progressive Clues',
  'memory': 'Memory',
};

export default function Results({ guesses, gameType, streak, onPlayAgain, onGoHome }: Props) {
  const correctCount = guesses.filter(g => g.correct).length;
  const played = guesses.length;
  const pct = played > 0 ? Math.round((correctCount / played) * 100) : 0;

  return (
    <div className="card">
      <div className="results-header">
        <h2 className="results-title">{GAME_LABELS[gameType]}{streak ? ' · Streak' : ''}</h2>
        <div className="results-score" style={{ color: scoreColor(pct) }}>
          {correctCount}<span className="results-total">/{played}</span>
        </div>
        <p className="results-pct">{pct}% correct</p>
        {streak && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Streak ended on round {played}
          </p>
        )}
      </div>

      <div className="results-list">
        {guesses.map((g, i) => (
          <div key={i} className={`result-item ${g.correct ? 'correct' : 'incorrect'}`}>
            <img
              className="result-flag"
              src={g.answer.flags.svg}
              alt={`Flag of ${g.answer.name.common}`}
            />
            <div className="result-info">
              <span className="result-country">{g.answer.name.common}</span>
              {gameType === 'trivia' && g.triviaQuestion && (
                <span className="result-question">{g.triviaQuestion.prompt}</span>
              )}
              {!g.correct && (
                <span className="result-wrong-guess">You guessed: {g.selected.name.common}</span>
              )}
            </div>
            <span className="result-status">
              {g.correct ? '✓' : '✗'}
              {g.hintUsed && <span className="hint-marker" title="Hint used">💡</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="results-actions">
        <button className="play-again-btn" onClick={onPlayAgain}>Play Again</button>
        <button className="home-btn" onClick={onGoHome}>Main Menu</button>
      </div>
    </div>
  );
}

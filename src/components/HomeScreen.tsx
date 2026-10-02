import { useState } from 'react';
import type { Difficulty, GameType, Region } from '../hooks/useGameLogic';

const REGIONS: { id: Region; label: string }[] = [
  { id: 'all',      label: 'World' },
  { id: 'Africa',   label: 'Africa' },
  { id: 'Americas', label: 'Americas' },
  { id: 'Asia',     label: 'Asia' },
  { id: 'Europe',   label: 'Europe' },
  { id: 'Oceania',  label: 'Oceania' },
];

const ROUND_OPTIONS = [5, 10, 15, 20];

const GAMES: { id: GameType; label: string; icon: string; desc: string }[] = [
  { id: 'flag',           icon: '🏳',  label: 'Flags',            desc: 'Identify countries by their flag' },
  { id: 'trivia',         icon: '🌍', label: 'Trivia',           desc: 'Capitals, currencies, languages & more' },
  { id: 'map',            icon: '🗺',  label: 'Map',              desc: 'Click the country on the map' },
  { id: 'flag-grid',      icon: '🔲', label: 'Flag Grid',        desc: 'Find the flag in a 9-flag grid' },
  { id: 'higher-or-lower',icon: '📊', label: 'Higher or Lower',  desc: 'Which country has more population?' },
  { id: 'silhouette',     icon: '🌑', label: 'Silhouette',       desc: 'Guess from the country outline' },
  { id: 'odd-one-out',    icon: '🔍', label: 'Odd One Out',      desc: 'Which country doesn\'t belong?' },
  { id: 'progressive',    icon: '💡', label: 'Countryle',        desc: 'Wordle-style country guesser' },
];

interface Props {
  onStart: (rounds: number, difficulty: Difficulty, gameType: GameType, region?: Region, endless?: boolean, minPop?: number) => void;
  onFeedback: () => void;
  startError?: string | null;
}

type Screen = 'home' | 'config';

export default function HomeScreen({ onStart, onFeedback, startError }: Props) {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedGame, setSelectedGame] = useState<GameType>('flag');
  const [rounds, setRounds] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [region, setRegion] = useState<Region>('all');
  const [endless, setEndless] = useState(false);
  const [minPop, setMinPop] = useState(0);

  function selectGame(id: GameType) {
    setSelectedGame(id);
    setScreen('config');
  }

  function handleStart() {
    onStart(
      rounds,
      difficulty,
      selectedGame,
      region,
      endless,
      selectedGame === 'progressive' ? minPop : 0,
    );
  }

  const gameDef = GAMES.find(g => g.id === selectedGame);

  const showDifficulty = selectedGame !== 'map' && selectedGame !== 'flag-grid' && selectedGame !== 'higher-or-lower' && selectedGame !== 'odd-one-out' && selectedGame !== 'progressive';
  const showRounds = selectedGame !== 'progressive';
  const showEndless = selectedGame === 'flag' || selectedGame === 'trivia';
  const showRegion = selectedGame !== 'silhouette';

  if (screen === 'config') {
    return (
      <div className="card">
        <button className="back-btn" onClick={() => setScreen('home')}>←</button>
        <div className="config-game-label">
          <span className="config-game-icon">{gameDef?.icon}</span>
          <h2 className="config-game-title">{gameDef?.label}</h2>
          <p className="config-game-desc">{gameDef?.desc}</p>
        </div>

        {showRegion && (
          <>
            <p className="round-label-sm">Region</p>
            <div className="region-grid">
              {REGIONS.map(r => (
                <button
                  key={r.id}
                  className={`region-btn${region === r.id ? ' active' : ''}`}
                  onClick={() => setRegion(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}

        {showRounds && (
          <>
            <p className="round-label-sm">Rounds</p>
            <div className="round-options">
              {ROUND_OPTIONS.map(n => (
                <button
                  key={n}
                  className={`round-btn${rounds === n ? ' selected' : ''}`}
                  onClick={() => setRounds(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        {showDifficulty && (
          <>
            <p className="round-label-sm">Difficulty</p>
            <div className="mode-toggle" style={{ marginBottom: 24 }}>
              <button className={`mode-btn${difficulty === 'normal' ? ' active' : ''}`} onClick={() => setDifficulty('normal')}>Normal — 4 choices</button>
              <button className={`mode-btn${difficulty === 'hard'   ? ' active' : ''}`} onClick={() => setDifficulty('hard')}>{(selectedGame === 'silhouette' || selectedGame === 'flag') ? 'Hard — type it out' : 'Hard — same-region distractors'}</button>
            </div>
          </>
        )}

        {selectedGame === 'progressive' && (
          <>
            <p className="round-label-sm">Country pool</p>
            <div className="round-options">
              {([0, 500_000, 1_000_000] as const).map(n => (
                <button
                  key={n}
                  className={`round-btn${minPop === n ? ' selected' : ''}`}
                  onClick={() => setMinPop(n)}
                >
                  {n === 0 ? 'All' : n === 500_000 ? '500K+' : '1M+'}
                </button>
              ))}
            </div>
          </>
        )}

        {showEndless && (
          <div className="streak-toggle-row">
            <label className="streak-label">
              <input
                type="checkbox"
                checked={endless}
                onChange={e => setEndless(e.target.checked)}
                className="streak-checkbox"
              />
              <span className="streak-label-text">Endless — play through all countries, give up whenever</span>
            </label>
          </div>
        )}

        {startError && <p className="start-error">{startError}</p>}
        <button className="start-btn" style={{ marginTop: 24 }} onClick={handleStart}>
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="card home-card">
      <h1 className="home-title">Meridian</h1>
      <p className="home-subtitle">Test your world knowledge</p>

      <p className="round-label-sm">Game Modes</p>
      <div className="game-grid">
        {GAMES.map(g => (
          <button key={g.id} className="game-tile" onClick={() => selectGame(g.id)}>
            <span className="game-tile-icon">{g.icon}</span>
            <span className="game-tile-label">{g.label}</span>
            <span className="game-tile-desc">{g.desc}</span>
          </button>
        ))}
      </div>

      <button className="home-feedback-nudge" onClick={onFeedback}>
        💬 Have feedback or found a bug? Let me know
      </button>
    </div>
  );
}

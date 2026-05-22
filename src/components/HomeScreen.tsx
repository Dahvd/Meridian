import { useState } from 'react';
import type { Difficulty, GameType, Region } from '../hooks/useGameLogic';
import type { TriviaPool } from '../helpers/triviaHelpers';

const TRIVIA_POOLS: { id: TriviaPool; label: string }[] = [
  { id: 'capital',  label: 'Capitals' },
  { id: 'animal',   label: 'Animals' },
  { id: 'currency', label: 'Currency' },
  { id: 'language', label: 'Language' },
  { id: 'domain',   label: 'Domain' },
  { id: 'calling',  label: 'Dialling' },
];

const REGIONS: { id: Region; label: string }[] = [
  { id: 'all',      label: 'World' },
  { id: 'Africa',   label: 'Africa' },
  { id: 'Americas', label: 'Americas' },
  { id: 'Asia',     label: 'Asia' },
  { id: 'Europe',   label: 'Europe' },
  { id: 'Oceania',  label: 'Oceania' },
];

const ROUND_OPTIONS = [5, 10, 15, 20];

type ClassicGame = Extract<GameType, 'flag' | 'trivia' | 'map'>;
type MiniGame = Exclude<GameType, ClassicGame>;

const CLASSIC_GAMES: { id: ClassicGame; label: string; icon: string; desc: string }[] = [
  { id: 'flag',   icon: '🏳',  label: 'Flags',  desc: 'Identify countries by their flag' },
  { id: 'trivia', icon: '🌍', label: 'Trivia', desc: 'Capitals, currencies, languages & more' },
  { id: 'map',    icon: '🗺',  label: 'Map',    desc: 'Click the country on the map' },
];

const MINI_GAMES: { id: MiniGame; label: string; icon: string; desc: string; hasRounds: boolean; hasDifficulty: boolean }[] = [
  { id: 'flag-grid',      icon: '🔲', label: 'Flag Grid',        desc: 'Find the flag in a 9-flag grid',         hasRounds: true,  hasDifficulty: false },
  { id: 'higher-or-lower',icon: '📊', label: 'Higher or Lower',  desc: 'Which country has more population?',     hasRounds: true,  hasDifficulty: false },
  { id: 'silhouette',     icon: '🌑', label: 'Silhouette',       desc: 'Guess from the country outline',         hasRounds: true,  hasDifficulty: true  },
  { id: 'odd-one-out',    icon: '🔍', label: 'Odd One Out',      desc: 'Which country doesn\'t belong?',         hasRounds: true,  hasDifficulty: false },
  { id: 'progressive',    icon: '💡', label: 'Progressive Clues',desc: 'Guess with fewer clues for more points', hasRounds: true,  hasDifficulty: false },
  { id: 'memory',         icon: '🃏', label: 'Memory',           desc: 'Match flags to country names',           hasRounds: false, hasDifficulty: false },
];

interface Props {
  onStart: (rounds: number, difficulty: Difficulty, gameType: GameType, triviaPools?: TriviaPool[], region?: Region, streak?: boolean) => void;
  onFeedback: () => void;
}

type Screen = 'home' | 'config';

export default function HomeScreen({ onStart, onFeedback }: Props) {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedGame, setSelectedGame] = useState<GameType>('flag');
  const [rounds, setRounds] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [region, setRegion] = useState<Region>('all');
  const [streak, setStreak] = useState(false);
  const [triviaPools, setTriviaPools] = useState<Set<TriviaPool>>(
    new Set(TRIVIA_POOLS.map(p => p.id))
  );

  function selectGame(id: GameType) {
    setSelectedGame(id);
    setScreen('config');
  }

  function togglePool(id: TriviaPool) {
    setTriviaPools(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleStart() {
    onStart(
      rounds,
      difficulty,
      selectedGame,
      selectedGame === 'trivia' ? [...triviaPools] : undefined,
      region,
      streak,
    );
  }

  const miniDef = MINI_GAMES.find(g => g.id === selectedGame);
  const classicDef = CLASSIC_GAMES.find(g => g.id === selectedGame);
  const gameDef = miniDef ?? classicDef;

  const showDifficulty = selectedGame !== 'map' && selectedGame !== 'flag-grid' && selectedGame !== 'higher-or-lower' && selectedGame !== 'odd-one-out' && selectedGame !== 'progressive' && selectedGame !== 'memory';
  const showRounds = selectedGame !== 'memory';
  const showStreak = selectedGame === 'flag' || selectedGame === 'trivia';
  const showRegion = selectedGame !== 'silhouette' && selectedGame !== 'memory';

  if (screen === 'config') {
    return (
      <div className="card">
        <button className="back-btn" onClick={() => setScreen('home')}>← Back</button>
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

        {selectedGame === 'trivia' && (
          <>
            <p className="round-label-sm">Question pools</p>
            <div className="pool-grid">
              {TRIVIA_POOLS.map(p => (
                <button
                  key={p.id}
                  className={`pool-btn${triviaPools.has(p.id) ? ' active' : ''}`}
                  onClick={() => togglePool(p.id)}
                >
                  {p.label}
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
              <button className={`mode-btn${difficulty === 'hard'   ? ' active' : ''}`} onClick={() => setDifficulty('hard')}>Hard — type it out</button>
            </div>
          </>
        )}

        {showStreak && (
          <div className="streak-toggle-row">
            <label className="streak-label">
              <input
                type="checkbox"
                checked={streak}
                onChange={e => setStreak(e.target.checked)}
                className="streak-checkbox"
              />
              <span className="streak-label-text">Streak mode — one wrong ends the run</span>
            </label>
          </div>
        )}

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

      <p className="round-label-sm">Classic</p>
      <div className="game-grid classic-grid">
        {CLASSIC_GAMES.map(g => (
          <button key={g.id} className="game-tile" onClick={() => selectGame(g.id)}>
            <span className="game-tile-icon">{g.icon}</span>
            <span className="game-tile-label">{g.label}</span>
            <span className="game-tile-desc">{g.desc}</span>
          </button>
        ))}
      </div>

      <p className="round-label-sm" style={{ marginTop: 20 }}>Mini Games</p>
      <div className="game-grid mini-grid">
        {MINI_GAMES.map(g => (
          <button key={g.id} className="game-tile" onClick={() => selectGame(g.id)}>
            <span className="game-tile-icon">{g.icon}</span>
            <span className="game-tile-label">{g.label}</span>
            <span className="game-tile-desc">{g.desc}</span>
          </button>
        ))}
      </div>

      <button className="home-feedback-nudge" onClick={onFeedback}>
        💬 Have feedback or found a bug? Let us know
      </button>
    </div>
  );
}

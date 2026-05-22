import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import { shuffle } from '../helpers/countryHelpers';
import countriesData from '../data/countries.json';

const ALL = countriesData as unknown as Country[];
const PAIR_COUNT = 8;

type CardSide = 'flag' | 'name';
type CardState = 'hidden' | 'flipped' | 'matched';

type Card = {
  id: string;
  country: Country;
  side: CardSide;
  state: CardState;
};

function buildDeck(): Card[] {
  const pool = shuffle(ALL).slice(0, PAIR_COUNT);
  const cards: Card[] = [];
  for (const country of pool) {
    cards.push({ id: `${country.cca2}-flag`, country, side: 'flag', state: 'hidden' });
    cards.push({ id: `${country.cca2}-name`, country, side: 'name', state: 'hidden' });
  }
  return shuffle(cards);
}

interface Props {
  onFinish: () => void;
  onGiveUp: () => void;
}

export default function MemoryGame({ onGiveUp }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [locked, setLocked] = useState(false);

  const matched = deck.filter(c => c.state === 'matched').length / 2;
  const total = PAIR_COUNT;

  useEffect(() => {
    if (flipped.length !== 2) return;
    setLocked(true);
    const [a, b] = flipped.map(id => deck.find(c => c.id === id)!);
    const isMatch = a.country.cca2 === b.country.cca2 && a.side !== b.side;

    setTimeout(() => {
      setDeck(prev => prev.map(c =>
        flipped.includes(c.id)
          ? { ...c, state: isMatch ? 'matched' : 'hidden' }
          : c
      ));
      setFlipped([]);
      setLocked(false);
      if (isMatch) {
        const newMatched = matched + 1;
        if (newMatched === total) setDone(true);
      }
    }, 900);
  }, [flipped]);

  function flip(id: string) {
    if (locked) return;
    const card = deck.find(c => c.id === id);
    if (!card || card.state !== 'hidden' || flipped.includes(id) || flipped.length >= 2) return;
    setFlipped(prev => [...prev, id]);
    setDeck(prev => prev.map(c => c.id === id ? { ...c, state: 'flipped' } : c));
    setMoves(m => m + 1);
  }

  if (done) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Completed!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          Matched all {total} pairs in {moves} moves
        </p>
        <div className="results-actions">
          <button className="play-again-btn" onClick={() => {
            setDeck(buildDeck());
            setFlipped([]);
            setMoves(0);
            setDone(false);
          }}>Play Again</button>
          <button className="home-btn" onClick={onGiveUp}>Main Menu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card memory-card">
      <div className="progress-header">
        <span className="round-label">{matched}/{total} matched · {moves} moves</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <p className="map-question" style={{ marginBottom: 16 }}>Match each flag to its country name</p>
      <div className="memory-grid">
        {deck.map(card => (
          <button
            key={card.id}
            className={`memory-cell ${card.state}`}
            onClick={() => flip(card.id)}
            disabled={card.state !== 'hidden' || locked}
          >
            {card.state !== 'hidden' ? (
              card.side === 'flag'
                ? <img src={card.country.flags.svg} alt="" className="memory-flag" />
                : <span className="memory-name">{card.country.name.common}</span>
            ) : (
              <span className="memory-back">?</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

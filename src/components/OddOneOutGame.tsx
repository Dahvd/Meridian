import { useState, useEffect, useMemo } from 'react';
import { useNextStep } from '../hooks/useNextStep';
import type { Country } from '../types/country';
import { shuffle } from '../helpers/countryHelpers';
import countriesData from '../data/countries.json';

const ALL_FALLBACK = countriesData as unknown as Country[];

type Group = { countries: Country[]; oddOne: Country; sharedLabel: string };

function buildGroup(seed: Country, pool: Country[]): Group | null {
  // Always use ALL countries so there's always a valid "odd one out" from a different region/currency/language
  // but the seed and "same" countries can be drawn from the filtered pool for region consistency
  const ALL = pool.length >= 10 ? pool : ALL_FALLBACK;

  // Try region grouping
  const sameRegion = shuffle(ALL.filter(c => c.region === seed.region && c.cca2 !== seed.cca2));
  if (sameRegion.length >= 2) {
    const three = [seed, ...sameRegion.slice(0, 2)];
    const oddPool = shuffle(ALL_FALLBACK.filter(c => c.region !== seed.region && c.region));
    if (oddPool.length) {
      return {
        countries: shuffle([...three, oddPool[0]]),
        oddOne: oddPool[0],
        sharedLabel: `All in ${seed.region} except one`,
      };
    }
  }

  // Try currency grouping
  const seedCurrencies = Object.keys(seed.currencies ?? {});
  for (const code of seedCurrencies) {
    const same = shuffle(ALL_FALLBACK.filter(c => c.cca2 !== seed.cca2 && Object.keys(c.currencies ?? {}).includes(code)));
    if (same.length >= 2) {
      const three = [seed, ...same.slice(0, 2)];
      const oddPool = shuffle(ALL_FALLBACK.filter(c =>
        !Object.keys(c.currencies ?? {}).includes(code) &&
        !three.find(t => t.cca2 === c.cca2)
      ));
      if (oddPool.length) {
        return {
          countries: shuffle([...three, oddPool[0]]),
          oddOne: oddPool[0],
          sharedLabel: `3 share a currency`,
        };
      }
    }
  }

  // Try language grouping
  const seedLangs = Object.keys(seed.languages ?? {});
  for (const code of seedLangs) {
    const same = shuffle(ALL_FALLBACK.filter(c => c.cca2 !== seed.cca2 && Object.keys(c.languages ?? {}).includes(code)));
    if (same.length >= 2) {
      const three = [seed, ...same.slice(0, 2)];
      const oddPool = shuffle(ALL_FALLBACK.filter(c =>
        !Object.keys(c.languages ?? {}).includes(code) &&
        !three.find(t => t.cca2 === c.cca2)
      ));
      if (oddPool.length) {
        return {
          countries: shuffle([...three, oddPool[0]]),
          oddOne: oddPool[0],
          sharedLabel: `3 share an official language`,
        };
      }
    }
  }

  return null;
}

interface Props {
  country: Country;
  pool: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function OddOneOutGame({ country, pool, currentRound, totalRounds, onGuess, onGiveUp }: Props) {
  const [selected, setSelected] = useState<Country | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const { autoNext, toggle, nextAction, schedule, reset } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  const group = useMemo(() => buildGroup(country, pool), [country.cca2]);

  useEffect(() => { setSelected(null); setHintShown(false); reset(); }, [country.cca2]);

  function handlePick(opt: Country) {
    if (selected || !group) return;
    setSelected(opt);
    const toPass = opt.cca2 === group.oddOne.cca2 ? country : opt;
    schedule(1100, () => onGuess(toPass));
  }

  function cellClass(opt: Country) {
    if (!selected || !group) return 'odd-cell';
    const isOdd = opt.cca2 === group.oddOne.cca2;
    if (opt.cca2 === selected.cca2) return isOdd ? 'odd-cell reveal-correct' : 'odd-cell reveal-incorrect';
    if (isOdd && selected.cca2 !== group.oddOne.cca2) return 'odd-cell reveal-correct';
    return 'odd-cell dimmed';
  }

  if (!group) {
    return (
      <div className="card">
        <p className="map-question">Couldn't build a group for this country. Skipping…</p>
        <button className="start-btn" onClick={() => onGuess(country)}>Next</button>
      </div>
    );
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
      <p className="map-question" style={{ marginBottom: 20 }}>Which country doesn't belong?</p>
      <div className="odd-grid">
        {group.countries.map(opt => (
          <button key={opt.cca2} className={cellClass(opt)} onClick={() => handlePick(opt)} disabled={!!selected}>
            <img src={opt.flags.svg} alt="" className="odd-flag" />
            <span className="odd-name">{opt.name.common}</span>
          </button>
        ))}
      </div>
      {(selected || hintShown) && (
        <p className="map-question" style={{ marginTop: 16, fontSize: '0.85rem' }}>{group.sharedLabel}</p>
      )}
      {!selected && !hintShown && (
        <button className="hint-btn" onClick={() => setHintShown(true)}>Show hint</button>
      )}
      <div className="game-footer">
        <label className="auto-label">
          <input type="checkbox" checked={autoNext} onChange={toggle} />
          Auto continue
        </label>
        <button className="next-btn" onClick={nextAction ?? undefined} disabled={!nextAction || autoNext}>Next →</button>
      </div>
    </div>
  );
}

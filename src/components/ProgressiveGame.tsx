import { useState, useEffect } from 'react';
import type { Country } from '../types/country';
import SearchInput from './SearchInput';

const CLUES_EVERY = 3;

type Dir = 'higher' | 'lower' | 'match';
type Closeness = 'exact' | 'close' | 'far';

interface GuessRow {
  country: Country;
  regionMatch: boolean;
  hemisphere: 'N' | 'S' | null;
  hemisphereMatch: boolean;
  popDir: Dir;
  popClose: Closeness;
  areaDir: Dir;
  areaClose: Closeness;
}

interface Clue { label: string; value: string }

function formatPop(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(1)}B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(0)}K`;
  return `${pop}`;
}

function formatArea(area: number): string {
  if (area >= 1_000_000) return `${(area / 1_000_000).toFixed(1)}M km²`;
  if (area >= 1_000) return `${Math.round(area / 1_000)}K km²`;
  return `${Math.round(area)} km²`;
}

function cluesFor(country: Country): Clue[] {
  const list: Clue[] = [];
  if (country.region) list.push({ label: 'Region', value: country.region });
  list.push({ label: 'Population', value: formatPop(country.population) });
  const capital = country.capital?.[0];
  if (capital) list.push({ label: 'Capital starts with', value: capital[0] + '…' });
  const lang = Object.values(country.languages ?? {})[0];
  if (lang) list.push({ label: 'Official language', value: lang });
  if (capital) list.push({ label: 'Capital city', value: capital });
  return list;
}

function compareNum(guessed: number, target: number): { dir: Dir; close: Closeness } {
  if (guessed === target) return { dir: 'match', close: 'exact' };
  const ratio = Math.max(guessed, target) / Math.min(guessed, target);
  return { dir: target > guessed ? 'higher' : 'lower', close: ratio < 2 ? 'close' : 'far' };
}

function getHemisphere(country: Country): 'N' | 'S' | null {
  if (!country.latlng) return null;
  return country.latlng[0] >= 0 ? 'N' : 'S';
}

function buildRow(guessed: Country, target: Country): GuessRow {
  const pop = compareNum(guessed.population, target.population);
  const area = guessed.area && target.area
    ? compareNum(guessed.area, target.area)
    : { dir: 'match' as Dir, close: 'far' as Closeness };
  const hemisphere = getHemisphere(guessed);
  return {
    country: guessed,
    regionMatch: guessed.region === target.region,
    hemisphere,
    hemisphereMatch: hemisphere !== null && hemisphere === getHemisphere(target),
    popDir: pop.dir,
    popClose: pop.close,
    areaDir: area.dir,
    areaClose: area.close,
  };
}

function tileColor(close: Closeness, isMatch: boolean): string {
  if (isMatch) return 'var(--correct)';
  if (close === 'close') return '#b45309';
  return '#991b1b';
}

function Arrow({ dir }: { dir: Dir }) {
  if (dir === 'match') return null;
  return <span className="prog-arrow">{dir === 'higher' ? '↑' : '↓'}</span>;
}

interface Props {
  country: Country;
  options: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function ProgressiveGame({ country, onGuess, onGiveUp }: Props) {
  const [rows, setRows] = useState<GuessRow[]>([]);
  const [done, setDone] = useState(false);
  const allClues = cluesFor(country);

  useEffect(() => {
    setRows([]);
    setDone(false);
  }, [country.cca2]);

  const unlockedClues = allClues.slice(0, Math.floor(rows.length / CLUES_EVERY));
  const nextClueIn = rows.length === 0 ? CLUES_EVERY : CLUES_EVERY - (rows.length % CLUES_EVERY);
  const moreCluesAvailable = unlockedClues.length < allClues.length;

  function handleSearch(picked: Country) {
    if (done) return;
    const row = buildRow(picked, country);
    setRows(prev => [...prev, row]);
    if (picked.cca2 === country.cca2) {
      setDone(true);
      setTimeout(() => onGuess(picked), 900);
    }
  }

  return (
    <div className="card">
      <div className="progress-header">
        <span className="round-label">Progressive Clues</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>

      <div className="prog-header-row">
        <span className="prog-col-name" />
        <span className="prog-col-label">Region</span>
        <span className="prog-col-label">Hemi</span>
        <span className="prog-col-label">Pop</span>
        <span className="prog-col-label">Area</span>
      </div>

      <div className="prog-guesses">
        {rows.map((row, i) => {
          const regionBg = tileColor('exact', row.regionMatch);
          const hemiBg = tileColor('exact', row.hemisphereMatch);
          const popBg = tileColor(row.popClose, row.popDir === 'match');
          const areaBg = tileColor(row.areaClose, row.areaDir === 'match');
          return (
            <div key={i} className="prog-row">
              <span className="prog-country-name">
                <img src={row.country.flags.svg} alt="" className="prog-flag" />
                {row.country.name.common}
              </span>
              <div className="prog-tile" style={{ background: regionBg }}>
                {row.regionMatch ? '✓' : <span className="prog-tile-text">{row.country.region}</span>}
              </div>
              <div className="prog-tile" style={{ background: hemiBg }}>
                {row.hemisphere ?? '?'}
              </div>
              <div className="prog-tile" style={{ background: popBg }}>
                {row.popDir === 'match'
                  ? '✓'
                  : <><Arrow dir={row.popDir} /><span className="prog-tile-text">{formatPop(row.country.population)}</span></>}
              </div>
              <div className="prog-tile" style={{ background: areaBg }}>
                {row.areaDir === 'match'
                  ? '✓'
                  : <><Arrow dir={row.areaDir} />{row.country.area ? <span className="prog-tile-text">{formatArea(row.country.area)}</span> : null}</>}
              </div>
            </div>
          );
        })}
      </div>

      {unlockedClues.length > 0 && (
        <div className="clues-unlocked">
          {unlockedClues.map((clue, i) => (
            <div key={i} className="clue-row">
              <span className="clue-label">{clue.label}</span>
              <span className="clue-value">{clue.value}</span>
            </div>
          ))}
        </div>
      )}

      {!done && (
        <>
          <SearchInput key={rows.length} correctCountry={country} onGuess={handleSearch} showReveal={false} />
          <p className="prog-guesses-left">
            {moreCluesAvailable
              ? `Next clue in ${nextClueIn} guess${nextClueIn !== 1 ? 'es' : ''}`
              : `${rows.length} guess${rows.length !== 1 ? 'es' : ''} so far`}
          </p>
        </>
      )}
    </div>
  );
}

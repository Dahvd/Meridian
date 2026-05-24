import { useState, useEffect, useRef } from 'react';
import type { Country } from '../types/country';
import SearchInput from './SearchInput';
import CountryMiniMap from './CountryMiniMap';

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
  bordersDir: Dir;
  bordersClose: Closeness;
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
  const borders = compareNum(guessed.borders.length, target.borders.length);
  return {
    country: guessed,
    regionMatch: guessed.region === target.region,
    hemisphere,
    hemisphereMatch: hemisphere !== null && hemisphere === getHemisphere(target),
    popDir: pop.dir,
    popClose: pop.close,
    areaDir: area.dir,
    areaClose: area.close,
    bordersDir: borders.dir,
    bordersClose: borders.close,
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
  pool: Country[];
  currentRound: number;
  totalRounds: number;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

interface WikiSummary {
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

export default function ProgressiveGame({ country, pool, onGuess, onGiveUp }: Props) {
  const [rows, setRows] = useState<GuessRow[]>([]);
  const [done, setDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [winner, setWinner] = useState<Country | null>(null);
  const [guessedCodes, setGuessedCodes] = useState<Set<string>>(new Set());
  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const guessesRef = useRef<HTMLDivElement>(null);
  const allClues = cluesFor(country);

  useEffect(() => {
    if (guessesRef.current) {
      guessesRef.current.scrollTop = guessesRef.current.scrollHeight;
    }
  }, [rows]);

  useEffect(() => {
    setRows([]);
    setDone(false);
    setRevealed(false);
    setWinner(null);
    setGuessedCodes(new Set());
    setWiki(null);
  }, [country.cca2]);

  useEffect(() => {
    if (!done && !revealed) return;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(country.name.common)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: WikiSummary | null) => { if (data) setWiki(data); })
      .catch(() => {});
  }, [done, revealed, country.name.common]);

  const unlockedClues = allClues.slice(0, Math.floor(rows.length / CLUES_EVERY));
  const nextClueIn = rows.length === 0 ? CLUES_EVERY : CLUES_EVERY - (rows.length % CLUES_EVERY);
  const moreCluesAvailable = unlockedClues.length < allClues.length;

  function handleSearch(picked: Country) {
    if (done) return;
    const row = buildRow(picked, country);
    setRows(prev => [...prev, row]);
    setGuessedCodes(prev => new Set(prev).add(picked.cca2));
    if (picked.cca2 === country.cca2) {
      setDone(true);
      setWinner(picked);
    }
  }

  const hemi = getHemisphere(country);
  const hemiLabel = hemi === 'N' ? 'Northern' : hemi === 'S' ? 'Southern' : '?';
  const langs = Object.values(country.languages ?? {});
  const currencies = Object.values(country.currencies ?? {});
  const callingCode = country.idd?.root
    ? country.idd.suffixes?.length === 1
      ? country.idd.root + country.idd.suffixes[0]
      : country.idd.root
    : null;
  const tld = country.tld?.[0] ?? null;
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(country.name.common)}`;
  const mapsUrl = country.latlng
    ? `https://www.google.com/maps/@${country.latlng[0]},${country.latlng[1]},6z`
    : `https://www.google.com/maps/search/${encodeURIComponent(country.name.common)}`;

  return (
    <div className="card">
      <div className="progress-header">
        <span className="round-label">Progressive Clues</span>
        {!done && !revealed && (
          <button className="give-up-btn" onClick={() => setRevealed(true)}>Give up</button>
        )}
      </div>

      <div className="prog-header-row">
        <span className="prog-col-name" />
        <span className="prog-col-label">Region</span>
        <span className="prog-col-label">Hemi</span>
        <span className="prog-col-label">Pop</span>
        <span className="prog-col-label">Area</span>
        <span className="prog-col-label">Borders</span>
      </div>

      <div className="prog-guesses" ref={guessesRef}>
        {rows.map((row, i) => {
          const regionBg = tileColor('exact', row.regionMatch);
          const hemiBg = tileColor('exact', row.hemisphereMatch);
          const popBg = tileColor(row.popClose, row.popDir === 'match');
          const areaBg = tileColor(row.areaClose, row.areaDir === 'match');
          const bordersBg = tileColor(row.bordersClose, row.bordersDir === 'match');
          return (
            <div key={i} className="prog-row">
              <span className="prog-country-name">
                <img src={row.country.flags.svg} alt="" className="prog-flag" />
                <span>{row.country.name.common}</span>
              </span>
              <div className="prog-tile" style={{ background: regionBg }}>
                <span className="prog-tile-text">{row.country.region}</span>
              </div>
              <div className="prog-tile" style={{ background: hemiBg }}>
                <span className="prog-tile-text">{row.hemisphere === 'N' ? 'Northern' : row.hemisphere === 'S' ? 'Southern' : '?'}</span>
              </div>
              <div className="prog-tile" style={{ background: popBg }}>
                <Arrow dir={row.popDir} />
                <span className="prog-tile-text">{formatPop(row.country.population)}</span>
              </div>
              <div className="prog-tile" style={{ background: areaBg }}>
                <Arrow dir={row.areaDir} />
                {row.country.area ? <span className="prog-tile-text">{formatArea(row.country.area)}</span> : null}
              </div>
              <div className="prog-tile" style={{ background: bordersBg }}>
                <Arrow dir={row.bordersDir} />
                <span className="prog-tile-text">{row.country.borders.length}</span>
              </div>
            </div>
          );
        })}
      </div>

      {(done || revealed) && (
        <>
          <div className="prog-divider" />
          <div className="prog-row">
            <span className="prog-country-name">
              <img src={country.flags.svg} alt="" className="prog-flag" />
              <span>{country.name.common}</span>
            </span>
            <div className="prog-tile" style={{ background: 'var(--correct)' }}>
              <span className="prog-tile-text">{country.region}</span>
            </div>
            <div className="prog-tile" style={{ background: 'var(--correct)' }}>
              <span className="prog-tile-text">{hemiLabel}</span>
            </div>
            <div className="prog-tile" style={{ background: 'var(--correct)' }}>
              <span className="prog-tile-text">{formatPop(country.population)}</span>
            </div>
            <div className="prog-tile" style={{ background: 'var(--correct)' }}>
              <span className="prog-tile-text">{country.area ? formatArea(country.area) : '?'}</span>
            </div>
            <div className="prog-tile" style={{ background: 'var(--correct)' }}>
              <span className="prog-tile-text">{country.borders.length}</span>
            </div>
          </div>

          <div className="prog-about">
            <div className="prog-about-header">
              <img src={country.flags.svg} alt={`Flag of ${country.name.common}`} className="prog-about-flag" />
              <div className="prog-about-names">
                <p className="prog-about-country">{country.name.common}</p>
                {country.name.official !== country.name.common && (
                  <p className="prog-about-official">{country.name.official}</p>
                )}
              </div>
            </div>

            {wiki ? (
              <a href={wiki.content_urls?.desktop.page ?? wikiUrl} target="_blank" rel="noopener noreferrer" className="prog-wiki-card">
                {wiki.thumbnail && (
                  <img src={wiki.thumbnail.source} alt="" className="prog-wiki-thumb" />
                )}
                <div className="prog-wiki-body">
                  {wiki.description && <p className="prog-wiki-desc">{wiki.description}</p>}
                  {wiki.extract && <p className="prog-wiki-extract">{wiki.extract}</p>}
                  <span className="prog-wiki-read">Read more on Wikipedia ↗</span>
                </div>
              </a>
            ) : (
              <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className="prog-link-btn">
                Wikipedia ↗
              </a>
            )}
            <CountryMiniMap country={country} />
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="prog-link-btn">
              Google Maps ↗
            </a>


            {country.capital?.[0] && (
              <div className="clue-row">
                <span className="clue-label">Capital</span>
                <span className="clue-value">{country.capital[0]}</span>
              </div>
            )}
            {langs.length > 0 && (
              <div className="clue-row">
                <span className="clue-label">{langs.length > 1 ? 'Languages' : 'Language'}</span>
                <span className="clue-value">{langs.join(', ')}</span>
              </div>
            )}
            {currencies.length > 0 && (
              <div className="clue-row">
                <span className="clue-label">{currencies.length > 1 ? 'Currencies' : 'Currency'}</span>
                <span className="clue-value">{currencies.map(c => c.name).join(', ')}</span>
              </div>
            )}
            {callingCode && (
              <div className="clue-row">
                <span className="clue-label">Calling Code</span>
                <span className="clue-value">{callingCode}</span>
              </div>
            )}
            {tld && (
              <div className="clue-row">
                <span className="clue-label">Internet TLD</span>
                <span className="clue-value">{tld}</span>
              </div>
            )}
            {country.area && (
              <div className="clue-row">
                <span className="clue-label">Area</span>
                <span className="clue-value">{formatArea(country.area)}</span>
              </div>
            )}
            <div className="clue-row">
              <span className="clue-label">Borders</span>
              <span className="clue-value">{country.borders.length === 0 ? 'None' : country.borders.join(', ')}</span>
            </div>
          </div>

          <button className="start-btn" style={{ marginTop: 16 }} onClick={() => done ? onGuess(winner!) : onGiveUp()}>
            Continue
          </button>
        </>
      )}

      {!done && !revealed && unlockedClues.length > 0 && (
        <div className="clues-unlocked">
          {unlockedClues.map((clue, i) => (
            <div key={i} className="clue-row">
              <span className="clue-label">{clue.label}</span>
              <span className="clue-value">{clue.value}</span>
            </div>
          ))}
        </div>
      )}

      {!done && !revealed && (
        <>
          <SearchInput key={rows.length} correctCountry={country} onGuess={handleSearch} showReveal={false} delay={0} exclude={guessedCodes} pool={pool} />
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

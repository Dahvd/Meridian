import { useEffect, useRef, useState } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Country } from '../types/country';
import type { Difficulty } from '../hooks/useGameLogic';
import SearchInput from './SearchInput';

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, { ISO_A2: string; ISO_A2_EH: string }>;

function getISO(f: GeoFeature) {
  const iso = f.properties?.ISO_A2;
  return (!iso || iso === '-99') ? (f.properties?.ISO_A2_EH ?? '') : iso;
}

interface Props {
  country: Country;
  options: Country[];
  currentRound: number;
  totalRounds: number;
  difficulty: Difficulty;
  onGuess: (selected: Country, hintUsed?: boolean) => void;
  onGiveUp: () => void;
}

const STYLE_SILHOUETTE: L.PathOptions = { fillColor: '#1c1917', fillOpacity: 1, color: '#1c1917', weight: 1 };
const STYLE_CORRECT: L.PathOptions = { fillColor: '#166534', fillOpacity: 0.8, color: '#14532d', weight: 2 };
const STYLE_INCORRECT: L.PathOptions = { fillColor: '#991b1b', fillOpacity: 0.7, color: '#7f1d1d', weight: 2 };

export default function SilhouetteGame({ country, options, currentRound, totalRounds, difficulty, onGuess, onGiveUp }: Props) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selected, setSelected] = useState<Country | null>(null);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [searchCommitted, setSearchCommitted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const progress = ((currentRound + 1) / totalRounds) * 100;

  useEffect(() => {
    fetch('/countries.geojson').then(r => r.json()).then(setGeoData);
  }, []);

  useEffect(() => {
    setSelected(null);
    setHintRevealed(false);
    setSearchCommitted(false);
  }, [country.cca2]);

  // Fit map to target country when data or country changes
  useEffect(() => {
    if (!geoData || !mapRef.current) return;
    const feature = geoData.features.find(f => getISO(f as GeoFeature) === country.cca2);
    if (!feature) return;
    const layer = L.geoJSON(feature as GeoJSON.GeoJsonObject);
    mapRef.current.fitBounds(layer.getBounds().pad(0.3));
  }, [geoData, country.cca2]);

  function handlePick(opt: Country, hintUsed?: boolean) {
    if (selected) return;
    setSelected(opt);
    if (layerRef.current) {
      layerRef.current.setStyle(f => {
        const iso = getISO(f as GeoFeature);
        if (iso === country.cca2) return STYLE_CORRECT;
        if (iso === opt.cca2) return STYLE_INCORRECT;
        return { fillOpacity: 0, opacity: 0 };
      });
    }
    setTimeout(() => onGuess(opt, hintUsed), 1200);
  }

  function getButtonClass(opt: Country) {
    if (!selected) return 'option-btn';
    if (opt.cca2 === country.cca2) return 'option-btn reveal-correct';
    if (opt.cca2 === selected.cca2) return 'option-btn reveal-incorrect';
    return 'option-btn dimmed';
  }

  // Only render the target country's feature
  const targetData = geoData
    ? { ...geoData, features: geoData.features.filter(f => getISO(f as GeoFeature) === country.cca2) }
    : null;

  const showButtons = difficulty === 'normal' || hintRevealed;
  const showSearch = difficulty === 'hard' && !hintRevealed && !searchCommitted;

  return (
    <div className="card map-card">
      <div className="progress-header">
        <span className="round-label">Round {currentRound + 1} of {totalRounds}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="map-question">Which country is this?</p>

      <div className="map-wrap" style={{ marginBottom: 20 }}>
        <MapContainer
          ref={mapRef}
          center={[20, 10]}
          zoom={2}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: '100%', width: '100%', background: '#e8e0d0' }}
        >
          {targetData && (
            <GeoJSON
              ref={layerRef}
              key={country.cca2}
              data={targetData}
              style={() => STYLE_SILHOUETTE}
            />
          )}
        </MapContainer>
      </div>

      {showSearch && (
        <SearchInput
          correctCountry={country}
          onGuess={c => { setSearchCommitted(true); handlePick(c, false); }}
        />
      )}
      {showSearch && (
        <button className="hint-btn" onClick={() => setHintRevealed(true)}>Show options</button>
      )}
      {showButtons && (
        <div className="options-grid">
          {options.map(opt => (
            <button
              key={opt.cca2}
              className={getButtonClass(opt)}
              onClick={() => handlePick(opt, hintRevealed)}
              disabled={!!selected}
            >
              {opt.name.common}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

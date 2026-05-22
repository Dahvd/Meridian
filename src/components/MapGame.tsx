import { useEffect, useRef, useState } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Country } from '../types/country';
import type { Difficulty } from '../hooks/useGameLogic';
import countriesData from '../data/countries.json';

// Fix Leaflet's broken default icon paths under Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ALL_COUNTRIES = countriesData as unknown as Country[];
const BY_CCA2 = new Map(ALL_COUNTRIES.map(c => [c.cca2, c]));

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, {
  ISO_A2: string;
  ISO_A2_EH: string;
  NAME: string;
}>;

function getISO(feature: GeoFeature): string {
  const iso = feature.properties?.ISO_A2;
  return (!iso || iso === '-99') ? (feature.properties?.ISO_A2_EH ?? '') : iso;
}

const STYLE_DEFAULT: L.PathOptions = {
  fillColor: '#c9b48a', fillOpacity: 0.55, color: '#9e8060', weight: 1,
};
const STYLE_HOVER: L.PathOptions = {
  fillColor: '#b89a6a', fillOpacity: 0.75, color: '#7a5c3a', weight: 1.5,
};
const STYLE_CORRECT: L.PathOptions = {
  fillColor: '#166534', fillOpacity: 0.6, color: '#14532d', weight: 2,
};
const STYLE_INCORRECT: L.PathOptions = {
  fillColor: '#991b1b', fillOpacity: 0.55, color: '#7f1d1d', weight: 2,
};
const STYLE_DIMMED: L.PathOptions = {
  fillColor: '#d4c5a9', fillOpacity: 0.2, color: '#9e8060', weight: 0.5,
};

function featureStyle(iso: string, targetCCA2: string, guessedISO: string | null): L.PathOptions {
  if (!guessedISO) return STYLE_DEFAULT;
  if (iso === targetCCA2) return STYLE_CORRECT;
  if (iso === guessedISO) return STYLE_INCORRECT;
  return STYLE_DIMMED;
}

interface Props {
  country: Country;
  currentRound: number;
  totalRounds: number;
  difficulty: Difficulty;
  onGuess: (selected: Country) => void;
  onGiveUp: () => void;
}

export default function MapGame({ country, currentRound, totalRounds, onGuess, onGiveUp }: Props) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const guessedRef = useRef<string | null>(null);
  const progress = ((currentRound + 1) / totalRounds) * 100;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries.geojson`).then(r => r.json()).then(setGeoData);
  }, []);

  // Reset per round
  useEffect(() => {
    guessedRef.current = null;
    if (geoLayerRef.current) {
      geoLayerRef.current.setStyle(() => STYLE_DEFAULT);
    }
  }, [country.cca2]);

  function handleFeatureClick(feature: GeoFeature) {
    if (guessedRef.current) return;
    const iso = getISO(feature);
    if (!iso || iso === '-99') return;

    guessedRef.current = iso;

    // Update styles immediately via Leaflet (no React re-render needed)
    if (geoLayerRef.current) {
      geoLayerRef.current.setStyle(f =>
        featureStyle(getISO(f as GeoFeature), country.cca2, iso)
      );
    }

    const selected = BY_CCA2.get(iso) ?? { ...country, cca2: iso, name: { common: feature.properties.NAME, official: feature.properties.NAME } };
    setTimeout(() => onGuess(selected as Country), 1400);
  }

  function onEachFeature(feature: GeoFeature, layer: L.Layer) {
    const path = layer as L.Path;
    path.on({
      click: () => handleFeatureClick(feature),
      mouseover: () => {
        if (!guessedRef.current) path.setStyle(STYLE_HOVER);
      },
      mouseout: () => {
        if (!guessedRef.current) path.setStyle(STYLE_DEFAULT);
      },
    });
    // No country name tooltips — part of the challenge
  }

  return (
    <div className="card map-card">
      <div className="progress-header">
        <span className="round-label">Round {currentRound + 1} of {totalRounds}</span>
        <button className="give-up-btn" onClick={onGiveUp}>Give up</button>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="map-question">
        Find <strong>{country.name.common}</strong> on the map
      </p>
      <div className="map-wrap">
        <MapContainer
          center={[20, 10]}
          zoom={2}
          minZoom={1}
          maxZoom={6}
          style={{ height: '100%', width: '100%', background: '#b8d4e8' }}
          zoomControl={true}
          scrollWheelZoom={true}
          worldCopyJump={false}
        >
          {geoData && (
            <GeoJSON
              ref={geoLayerRef}
              key={country.cca2}
              data={geoData}
              style={feature => featureStyle(
                getISO(feature as GeoFeature),
                country.cca2,
                guessedRef.current
              )}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

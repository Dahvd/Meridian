import { useEffect, useRef, useState } from 'react';
import { useNextStep } from '../hooks/useNextStep';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
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

const EXPAND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1 1h5v1.5H2.5V5H1V1zm9 0h5v4h-1.5V2.5H10V1zM1 11h1.5v2.5H5V15H1v-4zm12.5 0V15h-4v-1.5h2.5V11H14z"/></svg>`;
const COLLAPSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5 1v4H1V3.5h2.5V1H5zm6 0h1.5v2.5H15V5h-4V1zM1 11h4v4H3.5v-2.5H1V11zm9 0h4v1.5h-2.5V15H10v-4z"/></svg>`;

function FullscreenControl() {
  const map = useMap();
  useEffect(() => {
    let onFsChange: (() => void) | null = null;
    const Ctrl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', 'leaflet-fullscreen-btn', container);
        btn.href = '#';
        btn.title = 'Toggle fullscreen';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Toggle fullscreen');
        btn.innerHTML = EXPAND_ICON;
        onFsChange = () => {
          btn.innerHTML = document.fullscreenElement ? COLLAPSE_ICON : EXPAND_ICON;
          map.invalidateSize();
        };
        document.addEventListener('fullscreenchange', onFsChange);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          L.DomEvent.stopPropagation(e);
          if (!document.fullscreenElement) {
            map.getContainer().requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        });
        return container;
      },
    });
    const ctrl = new Ctrl();
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
      if (onFsChange) document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [map]);
  return null;
}

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
  const layersRef = useRef<Map<string, L.Layer>>(new Map());
  const { autoNext, toggle, nextAction, schedule, reset } = useNextStep();
  const progress = ((currentRound + 1) / totalRounds) * 100;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries.geojson`).then(r => r.json()).then(setGeoData);
  }, []);

  // Reset per round
  useEffect(() => {
    guessedRef.current = null;
    reset();
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

    // Show name label on the wrong-guessed country
    if (iso !== country.cca2) {
      const guessedLayer = layersRef.current.get(iso);
      if (guessedLayer) {
        (guessedLayer as L.Path).bindTooltip(selected.name.common, {
          permanent: true,
          className: 'map-tooltip',
          direction: 'center',
        }).openTooltip();
      }
    }

    schedule(1400, () => onGuess(selected as Country));
  }

  function onEachFeature(feature: GeoFeature, layer: L.Layer) {
    const iso = getISO(feature);
    if (iso) layersRef.current.set(iso, layer);
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
          maxBounds={[[-90, -180], [90, 180]]}
          maxBoundsViscosity={1.0}
        >
          <FullscreenControl />
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

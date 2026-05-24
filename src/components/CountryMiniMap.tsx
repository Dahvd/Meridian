import { useEffect, useRef, useState } from 'react';
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Country } from '../types/country';

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, { ISO_A2: string; ISO_A2_EH: string }>;

function getISO(f: GeoFeature) {
  const iso = f.properties?.ISO_A2;
  return (!iso || iso === '-99') ? (f.properties?.ISO_A2_EH ?? '') : iso;
}

const STYLE_DEFAULT: L.PathOptions = {
  fillColor: '#000', fillOpacity: 0, color: '#9e8060', weight: 0.5,
};
const STYLE_HIGHLIGHT: L.PathOptions = {
  fillColor: '#166534', fillOpacity: 0.45, color: '#14532d', weight: 2.5,
};

function ExpandControl({ onExpand }: { onExpand: () => void }) {
  const map = useMap();
  const cbRef = useRef(onExpand);
  cbRef.current = onExpand;

  useEffect(() => {
    const Ctrl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const btn = L.DomUtil.create('a', '', container);
        btn.innerHTML = '&#x2922;';
        btn.href = '#';
        btn.title = 'Expand map';
        btn.style.fontSize = '16px';
        btn.style.fontWeight = 'bold';
        L.DomEvent.on(btn, 'click', e => { L.DomEvent.preventDefault(e); cbRef.current(); });
        return container;
      },
    });
    const ctrl = new Ctrl();
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map]);

  return null;
}

function MapInner({ country, geoData, onExpand }: { country: Country; geoData: GeoJSON.FeatureCollection | null; onExpand?: () => void }) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!geoData || !mapRef.current) return;
    const feature = geoData.features.find(f => getISO(f as GeoFeature) === country.cca2);
    if (!feature) return;
    const bounds = L.geoJSON(feature as GeoJSON.GeoJsonObject).getBounds();
    const size = Math.max(
      bounds.getNorthEast().lat - bounds.getSouthWest().lat,
      bounds.getNorthEast().lng - bounds.getSouthWest().lng,
    );
    mapRef.current.fitBounds(bounds.pad(size < 5 ? 2 : 0.6));
  }, [geoData, country.cca2]);

  return (
    <MapContainer
      ref={mapRef}
      center={country.latlng ?? [20, 10]}
      zoom={3}
      zoomControl={true}
      scrollWheelZoom={true}
      dragging={true}
      doubleClickZoom={true}
      maxBounds={[[-90, -180], [90, 180]]}
      maxBoundsViscosity={1.0}
      attributionControl={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
      />
      {geoData && (
        <GeoJSON
          key={country.cca2}
          data={geoData}
          style={f => getISO(f as GeoFeature) === country.cca2 ? STYLE_HIGHLIGHT : STYLE_DEFAULT}
        />
      )}
      {onExpand && <ExpandControl onExpand={onExpand} />}
    </MapContainer>
  );
}

export default function CountryMiniMap({ country }: { country: Country }) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}countries.geojson`).then(r => r.json()).then(setGeoData);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded]);

  return (
    <>
      <div className="mini-map-wrap">
        <MapInner country={country} geoData={geoData} onExpand={() => setExpanded(true)} />
      </div>

      {expanded && (
        <div className="mini-map-overlay" onClick={() => setExpanded(false)}>
          <div className="mini-map-fullscreen" onClick={e => e.stopPropagation()}>
            <MapInner country={country} geoData={geoData} />
            <button className="mini-map-close" onClick={() => setExpanded(false)}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

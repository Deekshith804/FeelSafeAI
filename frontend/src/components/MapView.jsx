// components/MapView.jsx
// Enhanced: dynamic route color, pulsing unsafe zones, animated marker, riskLevel prop
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (Vite/webpack asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom SVG icons ──────────────────────────────────────────────────────────
const makeIcon = (color, size = 32, pulse = false) => L.divIcon({
  className: "",
  html: `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:3px solid white;
    box-shadow:0 0 12px ${color},0 0 24px ${color}44;
    ${pulse ? 'animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;' : ''}
  "></div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
});

const makeIconWithSymbol = (color, symbol, size = 32) => L.divIcon({
  className: "",
  html: `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2px solid white;
    box-shadow:0 0 10px ${color};
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
  ">${symbol}</div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
});

const SOURCE_ICON   = makeIcon('#00FF9D', 24); // Green Start
const DEST_ICON     = makeIcon('#FF3B5C', 24); // Red Destination
const USER_ICON_LOW  = makeIcon('#00FF9D', 28, true);
const USER_ICON_MED  = makeIcon('#FFC857', 28, true);
const USER_ICON_HIGH = makeIcon('#FF3B5C', 28, true);

const HOSPITAL_ICON  = makeIconWithSymbol('#00E5FF', '🏥');
const MEDICAL_ICON   = makeIconWithSymbol('#00FF9D', '💊');
const MALL_ICON      = makeIconWithSymbol('#FFC857', '🛍️');
const POLICE_ICON    = makeIconWithSymbol('#0055FF', '🛡️');
const CROWDED_ICON   = makeIconWithSymbol('#FFC857', '👥');

const getUserIcon = (riskLevel) => {
  if (riskLevel === 'HIGH')   return USER_ICON_HIGH;
  if (riskLevel === 'MEDIUM') return USER_ICON_MED;
  return USER_ICON_LOW;
};

// ── Unsafe zone markers (static Delhi data) ───────────────────────────────────
const UNSAFE_ZONES = [
  { lat: 28.6492, lon: 77.2050, name: "Caution Zone" },
  { lat: 28.5680, lon: 77.2700, name: "Low Lighting Area" },
  { lat: 28.6200, lon: 77.1900, name: "Isolated Stretch" },
];

// ── Auto-fit map bounds ───────────────────────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      const valid = positions.filter(p => p && p[0] != null && p[1] != null);
      if (valid.length >= 2) {
        try { map.fitBounds(valid, { padding: [40, 40], maxZoom: 14 }); } catch {}
      }
    }
  }, [positions, map]);
  return null;
}

// ── Smooth camera follow ──────────────────────────────────────────────────────
function CameraFollow({ position }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (position && position[0] != null) {
      if (!prev.current) {
        map.setView(position, map.getZoom(), { animate: true });
      } else {
        map.panTo(position, { animate: true, duration: 1.2 });
      }
      prev.current = position;
    }
  }, [position, map]);
  return null;
}

export default function MapView({
  source           = null,
  destination      = null,
  routeCoordinates = [],
  currentPosition  = null,
  markers          = [],
  routeColor       = '#00E5FF',
  riskLevel        = 'LOW',
  showUnsafeZones  = false,
}) {
  const defaultCenter = source || [28.6315, 77.2167]; // Delhi CP fallback
  const validRoute    = routeCoordinates.filter(c => c && c[0] != null && c[1] != null);

  // Route dash pattern changes by risk
  const dashArray = riskLevel === 'HIGH' ? '6 8' : riskLevel === 'MEDIUM' ? '10 6' : null;

  // All positions for bounds fitting
  const allPositions = [
    source, destination,
    ...(validRoute.length > 0 ? [validRoute[0], validRoute[validRoute.length - 1]] : []),
  ].filter(Boolean);

  // Unsafe zone pulse color
  const zoneColor = riskLevel === 'HIGH' ? '#FF3B5C' : riskLevel === 'MEDIUM' ? '#FFC857' : '#FFC857';

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", borderRadius: "1.5rem", background: "#0B1020" }}
      zoomControl={false}
    >
      {/* Realistic Normal Map */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />

      {/* Auto-fit */}
      {!currentPosition && allPositions.length >= 2 && (
        <FitBounds positions={allPositions} />
      )}

      {/* Camera follow during trip */}
      {currentPosition && <CameraFollow position={currentPosition} />}

      {/* Glowing route polyline */}
      {validRoute.length >= 2 && (
        <>
          {/* Outer glow layer */}
          <Polyline
            positions={validRoute}
            pathOptions={{ color: routeColor, weight: 12, opacity: 0.3, dashArray }}
          />
          {/* Inner solid line */}
          <Polyline
            positions={validRoute}
            pathOptions={{ color: routeColor, weight: 5, opacity: 1, dashArray }}
          />
        </>
      )}

      {/* Source marker */}
      {source && (
        <Marker position={source} icon={SOURCE_ICON}>
          <Popup><b style={{ color: '#00E5FF' }}>Start</b></Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destination && (
        <Marker position={destination} icon={DEST_ICON}>
          <Popup><b style={{ color: '#00FF9D' }}>Destination</b></Popup>
        </Marker>
      )}

      {/* Moving user marker */}
      {currentPosition && (
        <Marker position={currentPosition} icon={getUserIcon(riskLevel)} zIndexOffset={1000}>
          <Popup>
            <b style={{ color: riskLevel === 'HIGH' ? '#FF3B5C' : riskLevel === 'MEDIUM' ? '#FFC857' : '#00FF9D' }}>
              You are here ({riskLevel} risk)
            </b>
          </Popup>
        </Marker>
      )}

      {/* Unsafe zone circles (pulsing effect via two stacked circles) */}
      {showUnsafeZones && UNSAFE_ZONES.map((z, i) => (
        <React.Fragment key={i}>
          <Circle
            center={[z.lat, z.lon]}
            radius={350}
            pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: 0.08, weight: 1.5 }}
          />
          <Circle
            center={[z.lat, z.lon]}
            radius={180}
            pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: 0.15, weight: 0 }}
          >
            <Popup><b style={{ color: zoneColor }}>{z.name}</b><br/>Community-reported unsafe area</Popup>
          </Circle>
        </React.Fragment>
      ))}

      {/* Extra markers (e.g. police, hospitals) */}
      {markers.map((m, i) => {
        let markerIcon = makeIcon(m.color || '#FFC857', 16);
        if (m.type === 'hospital') markerIcon = HOSPITAL_ICON;
        else if (m.type === 'medical') markerIcon = MEDICAL_ICON;
        else if (m.type === 'mall') markerIcon = MALL_ICON;
        else if (m.type === 'police') markerIcon = POLICE_ICON;
        else if (m.type === 'crowded') markerIcon = CROWDED_ICON;
        return (
          <Marker key={i} position={m.position} icon={markerIcon}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        );
      })}
    </MapContainer>
  );
}

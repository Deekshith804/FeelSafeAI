import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Shield, PhoneCall, Navigation, Compass, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getHighwayPatrol, dispatch112 } from '../services/api';
import { haversineDistance, DELHI_SAFETY_POIS, detectPOIsForRoute } from '../utils/routeEngine';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Custom Map Icons using emojis inside divIcon ────────────────────────────
const makeIconWithSymbol = (color, symbol, size = 32) => L.divIcon({
  className: "",
  html: `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:2px solid white;
    box-shadow:0 0 10px ${color}88;
    display:flex;align-items:center;justify-content:center;
    font-size:15px;
  ">${symbol}</div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
});

const START_ICON        = makeIconWithSymbol('#00FF9D', 'S', 28); // Green Start
const END_ICON          = makeIconWithSymbol('#FF3B5C', 'E', 28); // Red End
const HOSPITAL_MAP_ICON = makeIconWithSymbol('#00E5FF', '🏥');
const MEDICAL_MAP_ICON  = makeIconWithSymbol('#00FF9D', '💊');
const CROWDED_MAP_ICON  = makeIconWithSymbol('#FFC857', '👥');
const POLICE_MAP_ICON    = makeIconWithSymbol('#0055FF', '🛡️');

const getMarkerIcon = (type) => {
  if (type === 'police') return POLICE_MAP_ICON;
  if (type === 'hospital') return HOSPITAL_MAP_ICON;
  if (type === 'medical') return MEDICAL_MAP_ICON;
  return CROWDED_MAP_ICON;
};

// ── Auto-fit map camera to route bounds ──────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      const valid = positions.filter(p => p && p[0] != null && p[1] != null);
      if (valid.length >= 2) {
        try { 
          map.fitBounds(valid, { padding: [50, 50], maxZoom: 14 }); 
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [positions, map]);
  return null;
}

export default function EmergencyServices({ activeTrip }) {
  const [radius, setRadius] = useState(5.0);
  const [patrolData, setPatrolData] = useState(null);
  const [checkingPatrol, setCheckingPatrol] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // ── Fetch highway patrol when trip coordinates change ────────────────────────
  useEffect(() => {
    if (!activeTrip || !activeTrip.active) return;

    const fetchPatrol = async () => {
      setCheckingPatrol(true);
      try {
        const res = await getHighwayPatrol(activeTrip.srcLat, activeTrip.srcLon);
        if (res.success) {
          setPatrolData(res);
        }
      } catch (err) {
        console.error('Failed to check highway patrol', err);
      } finally {
        setCheckingPatrol(false);
      }
    };

    fetchPatrol();
  }, [activeTrip]);

  // ── ERSS 112 Dispatch ────────────────────────────────────────────────────────
  const handle112Dispatch = async () => {
    if (!activeTrip) return;
    try {
      const res = await dispatch112(activeTrip.srcLat, activeTrip.srcLon, "Priya Sharma");
      if (res.success) {
        setDispatchResult(res);
        setTimeout(() => setDispatchResult(null), 8000);
      }
    } catch (err) {
      console.error('Dispatch simulation failed', err);
    }
  };

  // ── Render Empty State if no active trip exists ──────────────────────────────
  if (!activeTrip || !activeTrip.active) {
    return (
      <div className="min-h-screen px-4 md:px-8 py-16 max-w-xl mx-auto flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(255,59,92,0.15)]">
          <AlertOctagon className="w-12 h-12 text-[#FF3B5C]" />
        </div>
        <h1 className="text-3xl font-black text-white">No Active Trip Found</h1>
        <p className="text-gray-400 text-sm max-w-md leading-relaxed">
          Please select Start and Destination in Start Trip first to utilize the smart emergency infrastructure features.
        </p>
        <Link 
          to="/start-trip"
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white font-bold hover:scale-105 transition-transform duration-300 shadow-[0_4px_25px_rgba(0,229,255,0.25)] flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" /> Go to Start Trip
        </Link>
      </div>
    );
  }

  // ── Extract route & filter POIs by distance ───────────────────────────────
  const routePoints = activeTrip.waypoints || [];
  
  // Proximity Filter: Show only POIs within 1.5 km of any route coordinate
  const detectedMarkers = detectPOIsForRoute(routePoints, DELHI_SAFETY_POIS);

  // Map to the nearby services table structure
  const services = detectedMarkers.map((m) => {
    const distance = haversineDistance(activeTrip.srcLat, activeTrip.srcLon, m.position[0], m.position[1]);
    return {
      name: m.label,
      type: m.type,
      lat: m.position[0],
      lon: m.position[1],
      distance_km: Math.round(distance * 100) / 100,
      phone: m.type === 'police' ? '112' : m.type === 'hospital' ? '011-23365525' : '102',
      status: m.type === 'police' ? 'ACTIVE' : m.type === 'hospital' ? 'ACTIVE' : 'AVAILABLE'
    };
  }).sort((a, b) => a.distance_km - b.distance_km);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="w-8 h-8 text-[#FF3B5C]" />
            <h1 className="text-3xl font-black">Smart Emergency Infrastructure</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Radius-based search, highway connectivity mapping, women-safety routes, & direct ERSS 112 dispatch simulation.
          </p>
        </div>

        {/* 112 Dispatch Trigger Button */}
        <button 
          onClick={handle112Dispatch}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white font-bold hover:scale-105 transition-transform duration-300 neon-glow-danger flex items-center gap-2"
        >
          <PhoneCall className="w-4 h-4 animate-bounce" /> ERSS 112 Dispatch
        </button>
      </div>

      {/* Dispatch status notification */}
      <AnimatePresence>
        {dispatchResult && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 rounded-2xl text-xs text-white space-y-2 relative"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-[#FF3B5C]">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              CRITICAL EMERGENCY TICKET INITIATED: {dispatchResult.ticket_id}
            </div>
            <p className="text-gray-300">{dispatchResult.message}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-[10px] border-t border-[#FF3B5C]/20">
              <div><b>Squad Vehicle:</b> {dispatchResult.dispatch_details.vehicle_type}</div>
              <div><b>Commanding:</b> {dispatchResult.dispatch_details.officer_in_charge}</div>
              <div><b>Origin:</b> {dispatchResult.dispatch_details.origin_station}</div>
              <div><b>GPS Lock Accuracy:</b> {dispatchResult.gps_lock.accuracy_meters}m</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Control and Stats Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Active Trip Details Panel */}
          <div className="glass p-5 rounded-3xl border border-white/5 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Navigation className="w-4.5 h-4.5 text-[#00E5FF]" /> Active Trip Details
            </h3>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00FF9D]/10 border border-[#00FF9D]/30 flex items-center justify-center font-bold text-xs text-[#00FF9D] mt-0.5 shrink-0">
                  S
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Start Location</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeTrip.srcName}</div>
                </div>
              </div>

              <div className="w-0.5 h-6 bg-gray-800 ml-3"></div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 flex items-center justify-center font-bold text-xs text-[#FF3B5C] mt-0.5 shrink-0">
                  E
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase">End Location</div>
                  <div className="text-sm font-bold text-white mt-0.5">{activeTrip.dstName}</div>
                </div>
              </div>
            </div>

            {/* Radius Slider */}
            <div className="pt-3 border-t border-white/5">
              <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-semibold">
                <span>Infrastructure Search Radius</span>
                <span className="text-[#00E5FF] font-bold">{radius} km</span>
              </div>
              <input 
                type="range" min="1.0" max="15.0" step="0.5" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
            </div>
          </div>

          {/* Highway Patrol segment */}
          <div className="glass p-5 rounded-3xl border border-white/5 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-[#FFC857]" /> Highway Segment Patrol
            </h3>
            
            {checkingPatrol ? (
              <div className="text-center py-2 text-xs text-gray-400">Pinging highway network...</div>
            ) : patrolData ? (
              <div className="text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-semibold">Expressway Connected</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${patrolData.on_highway ? 'bg-[#00FF9D]/10 text-[#00FF9D]' : 'bg-white/5 text-gray-400'}`}>
                    {patrolData.on_highway ? 'YES' : 'NO'}
                  </span>
                </div>

                {patrolData.on_highway && (
                  <div className="p-3 bg-black/30 border border-white/5 rounded-xl space-y-1.5 animate-fade-in">
                    <div className="font-bold text-white text-xs">{patrolData.highway_name}</div>
                    <div className="text-[11px] text-gray-400">Nearest: {patrolData.nearest_patrol}</div>
                    <div className="text-[11px] text-gray-400">Patrol Contact: {patrolData.contact}</div>
                    <div className="text-[11px] text-[#00FF9D] font-bold">ETA: ~{patrolData.eta_minutes} mins</div>
                  </div>
                )}
                {!patrolData.on_highway && (
                  <p className="text-gray-500 text-[11px] italic leading-relaxed">
                    No active highway segments detected within 25km. Defaulting to local PCR dispatch.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* Route Safety Details */}
          {activeTrip.selectedRoute && (
            <div className="glass p-5 rounded-3xl border border-white/5 space-y-3 animate-fade-in">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#00FF9D]" /> Route Safety Details
              </h3>
              <div className="flex justify-between items-center font-bold text-xs">
                <span className="text-gray-400">Safety Score</span>
                <span className="text-[#00FF9D]">{activeTrip.selectedRoute.safety_score}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Distance</span>
                <span className="text-white">{activeTrip.selectedRoute.distance_km} km</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl text-[11px] text-gray-300 leading-relaxed">
                {activeTrip.selectedRoute.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Map and Services List Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-[430px] rounded-3xl overflow-hidden border border-white/10 relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <MapContainer 
              center={[activeTrip.srcLat, activeTrip.srcLon]} 
              zoom={13} 
              style={{ height: '100%', width: '100%', background: '#0b1020' }}
              zoomControl={false}
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
              />

              <FitBounds positions={[[activeTrip.srcLat, activeTrip.srcLon], [activeTrip.dstLat, activeTrip.dstLon], ...routePoints]} />

              {/* Start Marker */}
              <Marker position={[activeTrip.srcLat, activeTrip.srcLon]} icon={START_ICON}>
                <Popup><b>Start: {activeTrip.srcName}</b></Popup>
              </Marker>

              {/* End Marker */}
              <Marker position={[activeTrip.dstLat, activeTrip.dstLon]} icon={END_ICON}>
                <Popup><b>End: {activeTrip.dstName}</b></Popup>
              </Marker>

              {/* Optimized safety route polyline */}
              {routePoints.length >= 2 && (
                <Polyline 
                  positions={routePoints} 
                  pathOptions={{
                    color: '#7C4DFF',
                    weight: 6,
                    opacity: 0.8
                  }}
                />
              )}

              {/* Nearby Proximity POIs */}
              {detectedMarkers.map((s, i) => (
                <Marker 
                  key={i} 
                  position={s.position} 
                  icon={getMarkerIcon(s.type)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-white">{s.label}</div>
                      <div className="text-gray-400 capitalize">Category: {s.type}</div>
                      <div className="text-gray-400">Phone: {s.type === 'police' ? '112' : s.type === 'hospital' ? '011-23365525' : '102'}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* List of nearby services details */}
          <div className="glass p-5 rounded-3xl border border-white/5 space-y-4">
            <h3 className="font-bold text-lg text-white">Nearby Safety POIs ({services.length} items found)</h3>
            {services.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No safety infrastructure points within 1.5 km of the selected route.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[160px] overflow-y-auto pr-1">
                {services.map((s, i) => (
                  <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="truncate max-w-[120px] text-white">{s.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 capitalize">{s.type}</span>
                    </div>
                    <div className="text-gray-400">Distance: {s.distance_km} km</div>
                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-white/5">
                      <span className="text-gray-500">PH: {s.phone}</span>
                      <span className="text-[#00FF9D] font-bold">{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dynamic Proximity Legend */}
          {detectedMarkers.length > 0 && (
            <div className="glass p-5 rounded-3xl border border-white/5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-3">
                <div>
                  <h3 className="font-bold text-base text-white">Route Safety Proximity</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Verified active safety infrastructure within 1.5 km of your path</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider justify-center">
                {detectedMarkers.some(m => m.type === 'hospital') && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-sm">🏥</span>
                    <span>Hospital</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'medical') && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-sm">💊</span>
                    <span>Medical Store</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'crowded') && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-sm">👥</span>
                    <span>Malls / Crowded Area</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'police') && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-sm">🛡️</span>
                    <span>Police Station</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

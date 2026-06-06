// services/api.js
// Complete FeelSafe API service layer — all calls go through here.

const API_BASE = 'http://localhost:5000';

async function apiCall(endpoint, options = {}, fallback = null) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[API] ${endpoint} failed:`, err.message);
    if (fallback !== null) return fallback;
    throw err;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
export const checkHealth = () =>
  apiCall('/health', {}, { status: 'offline' });

// ── Threat ────────────────────────────────────────────────────────────────────
export const analyzeThreat = (text, lat = null, lon = null, userId = 1, userName = 'FeelSafe User', tripId = null, voiceMetadata = null) =>
  apiCall('/api/analyze-threat', {
    method: 'POST',
    body: JSON.stringify({ 
      text, 
      lat, 
      lon, 
      user_id: userId, 
      user_name: userName, 
      trip_id: tripId,
      ...(voiceMetadata || {})
    }),
  }, {
    success: true,
    risk_level: 'LOW',
    message: 'Unable to connect to backend.',
    score: 0,
    matched_keywords: [],
    action_tips: [],
    auto_escalated: false,
    escalation_result: null,
  });

// ── Trip ──────────────────────────────────────────────────────────────────────
export const startTrip = (originLat, originLon, destLat, destLon, originName = '', destName = '', userId = 1) =>
  apiCall('/api/start-trip', {
    method: 'POST',
    body: JSON.stringify({
      origin_lat: originLat, origin_lon: originLon,
      dest_lat: destLat,     dest_lon: destLon,
      origin_name: originName, dest_name: destName,
      user_id: userId,
    }),
  });

export const endTrip = (tripId) =>
  apiCall('/api/end-trip', {
    method: 'POST',
    body: JSON.stringify({ trip_id: tripId }),
  });

export const checkDeviation = (tripId, currentLat, currentLon) =>
  apiCall('/api/check-deviation', {
    method: 'POST',
    body: JSON.stringify({ trip_id: tripId, current_lat: currentLat, current_lon: currentLon }),
  });

export const getTrip = (tripId) =>
  apiCall(`/api/trip/${tripId}`);

export const getActiveTrips = (userId = null) =>
  apiCall(`/api/active-trips${userId ? `?user_id=${userId}` : ''}`);

export const getTripHistory = (userId = 1, limit = 10) =>
  apiCall(`/api/trip-history?user_id=${userId}&limit=${limit}`, {}, {
    success: true,
    trips: [],
    count: 0,
  });

// ── SafeRoute ─────────────────────────────────────────────────────────────────
export const getSafestRoute = (originLat, originLon, destLat, destLon) =>
  apiCall('/api/safest-route', {
    method: 'POST',
    body: JSON.stringify({ origin_lat: originLat, origin_lon: originLon, dest_lat: destLat, dest_lon: destLon }),
  }, {
    success: true,
    safest_route: { name: 'Main Road', safety_score: 75, safety_label: 'Safe', distance_km: 8, explanation: 'Fallback route.' },
    shortest_route: { name: 'Direct Route', safety_score: 55, safety_label: 'Moderate', distance_km: 5 },
    alternative_routes: [],
    all_routes_ranked: [],
    explanation: 'Backend unavailable.',
    route_count: 1,
  });

export const geocodeLocation = async (query) => {
  const q = (query || '').trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch (err) {
    console.error('[API] geocode failed:', err.message);
    return null;
  }
};

export const submitRouteFeedback = (routeId, rating, isUnsafe = false, comment = '') =>
  apiCall('/api/submit-route-feedback', {
    method: 'POST',
    body: JSON.stringify({ route_id: routeId, rating, is_unsafe_report: isUnsafe, comment }),
  });

export const getRouteStats = (routeId) =>
  apiCall(`/api/route-stats/${routeId}`);

// ── Emergency ─────────────────────────────────────────────────────────────────
export const triggerEmergency = (lat, lon, userId = 1, userName = 'FeelSafe User', tripId = null, contactPhone = null, riskLevel = 'HIGH', threatText = '', extraData = {}) =>
  apiCall('/api/emergency-alert', {
    method: 'POST',
    body: JSON.stringify({ lat, lon, user_id: userId, user_name: userName, trip_id: tripId, contact_phone: contactPhone, risk_level: riskLevel, threat_text: threatText, ...extraData }),
  }, {
    success: true,
    whatsapp_link: `https://wa.me/?text=EMERGENCY+ALERT`,
    maps_link: `https://www.google.com/maps?q=${lat},${lon}`,
    emergency_numbers: { police: '100', ambulance: '108', women_helpline: '1091', national_emergency: '112' },
    nearby_police: [],
    nearby_hospitals: [],
    auto_contacts_notified: [],
    escalation_level: 1,
  });

export const retryEmergency = (lat, lon, previousAttempt, userId = 1, contactNumbers = []) =>
  apiCall('/api/emergency-retry', {
    method: 'POST',
    body: JSON.stringify({ lat, lon, previous_attempt: previousAttempt, user_id: userId, contact_numbers: contactNumbers }),
  });

// ── Contacts ──────────────────────────────────────────────────────────────────
export const getContacts = (userId = 1) =>
  apiCall(`/api/contacts?user_id=${userId}`, {}, { success: true, contacts: [], count: 0 });

export const addContact = (name, phone, relation = 'Contact', mediumAlert = true, highAlert = true, userId = 1) =>
  apiCall('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ name, phone, relation, medium_alert_enabled: mediumAlert, high_alert_enabled: highAlert, user_id: userId }),
  });

export const updateContact = (contactId, updates) =>
  apiCall(`/api/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteContact = (contactId) =>
  apiCall(`/api/contacts/${contactId}`, { method: 'DELETE' });

// ── Community ─────────────────────────────────────────────────────────────────
export const getCommunityFeed = (limit = 10) =>
  apiCall(`/api/community/feed?limit=${limit}`, {}, {
    success: true,
    feed: [
      { area: 'Connaught Place', issue: 'Safe zone — CCTV active', severity: 'LOW', color: '#00FF9D', time: '2 min ago', source: 'community_intel' },
      { area: 'MG Road Underpass', issue: 'Poor lighting reported', severity: 'HIGH', color: '#FF3B5C', time: '15 min ago', source: 'community_intel' },
    ],
    count: 2,
  });

export const getCommunityStats = (userId = 1) =>
  apiCall(`/api/community/stats?user_id=${userId}`, {}, {
    success: true,
    stats: { total_trips: 0, active_trips: 0, sos_alerts: 0, community_reports: 0, avg_safety_score: 72 },
  });

// ── Cybercrime Hotspot Mapping ────────────────────────────────────────────────
export const getCybercrimeHotspots = (lat = null, lon = null) =>
  apiCall(`/api/cybercrime/hotspots${lat && lon ? `?lat=${lat}&lon=${lon}` : ''}`, {}, { success: true, hotspots: [], count: 0 });

export const getCybercrimeForecast = (hours = 24) =>
  apiCall(`/api/cybercrime/forecast?hours=${hours}`, {}, { success: true, forecast: [], hours: 24, count: 0 });

export const getCyberThreatFeed = (limit = 20) =>
  apiCall(`/api/cybercrime/threats?limit=${limit}`, {}, { success: true, threats: [], count: 0 });

export const submitCyberReport = (data) =>
  apiCall('/api/cybercrime/report', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getCyberGovAlerts = (limit = 10) =>
  apiCall(`/api/cybercrime/gov-alerts?limit=${limit}`, {}, { success: true, advisories: [], count: 0 });

export const getLiveThreatFeed = () =>
  apiCall('/api/cyber/live-threat-feed', {}, { success: true, items: [] });

export const getNationalPortalIntel = () =>
  apiCall('/api/cyber/national-portal-intel', {}, { success: true, items: [] });

// ── Auto FIR & Complaint Generator ───────────────────────────────────────────
export const generateFIR = (data) =>
  apiCall('/api/fir/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getFIRList = (userId = 1, limit = 20) =>
  apiCall(`/api/fir/list?user_id=${userId}&limit=${limit}`, {}, { success: true, firs: [], count: 0 });

export const getFIRDetail = (firId) =>
  apiCall(`/api/fir/${firId}`, {}, { success: false, error: 'FIR not found' });

export const updateFIRStatus = (firId, status, officer = null) =>
  apiCall(`/api/fir/status/${firId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, assigned_officer: officer }),
  });

export const uploadEvidence = async (formData) => {
  try {
    const res = await fetch(`${API_BASE}/api/fir/evidence`, {
      method: 'POST',
      body: formData, // contains file and fir_id
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] uploadEvidence failed:', err.message);
    return { success: false, error: err.message };
  }
};

export const getFIRLanguages = () =>
  apiCall('/api/fir/languages', {}, { success: true, languages: {} });

// ── AI Emergency Severity Detection (Upgrade) ────────────────────────────────
export const analyzeSeverity = (text, lat = null, lon = null, voiceFeatures = null, userId = 1) =>
  apiCall('/api/severity/analyze', {
    method: 'POST',
    body: JSON.stringify({ text, lat, lon, voice_features: voiceFeatures, user_id: userId }),
  }, {
    success: true,
    severity: 'LOW',
    fused_score: 0.0,
    explanation: 'Fallback severity (offline mode).',
  });

// ── Smart Emergency Infrastructure ──────────────────────────────────────────
export const getNearbyServices = (lat, lon, radiusKm = 5.0) =>
  apiCall('/api/infrastructure/nearby-services', {
    method: 'POST',
    body: JSON.stringify({ lat, lon, radius_km: radiusKm }),
  }, { success: true, services: [], count: 0 });

export const getWomenSafeRoute = (originLat, originLon, destLat, destLon, womenMode = true) =>
  apiCall('/api/infrastructure/safe-route-enhanced', {
    method: 'POST',
    body: JSON.stringify({ origin_lat: originLat, origin_lon: originLon, dest_lat: destLat, dest_lon: destLon, women_safety_mode: womenMode }),
  });

export const getHighwayPatrol = (lat, lon) =>
  apiCall(`/api/infrastructure/highway-patrol?lat=${lat}&lon=${lon}`);

export const dispatch112 = (lat, lon, userName = 'FeelSafe User') =>
  apiCall('/api/infrastructure/dispatch-112', {
    method: 'POST',
    body: JSON.stringify({ lat, lon, user_name: userName }),
  });


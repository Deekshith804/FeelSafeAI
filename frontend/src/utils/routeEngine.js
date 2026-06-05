/**
 * src/utils/routeEngine.js
 * Centralized Route Generation, Waypoint Interpolation, and Delhi Safety POI Proximity Filtering.
 */

/**
 * Calculates geodesic distance between two points in kilometers.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a curved route between start [lat, lon] and end [lat, lon].
 * Uses perpendicular sinusoidal deviation to look like a winding city street.
 */
export function generateCurvedRoute(start, end, steps = 30) {
  const lat1 = start[0];
  const lon1 = start[1];
  const lat2 = end[0];
  const lon2 = end[1];

  const points = [];
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const length = Math.sqrt(dLat * dLat + dLon * dLon);

  if (length === 0) return [start, end];

  const pLat = -dLon / length;
  const pLon = dLat / length;

  // Stable coordinate-based seed to make curvature consistent for the same start/end points
  const seed = (lat1 + lon1 + lat2 + lon2) * 1000;
  const pseudoRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  // Curvature scale based on distance (maximum 0.008 degrees)
  const amp = Math.min(0.008, length * 0.18) * (pseudoRandom(1) > 0.5 ? 1 : -1);
  const frequency = 1 + Math.floor(pseudoRandom(2) * 2); // 1 or 2 waves

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let lat = lat1 + t * dLat;
    let lon = lon1 + t * dLon;

    // Apply perpendicular wave offset
    const wave = Math.sin(t * Math.PI) * amp * Math.sin(t * Math.PI * frequency);
    lat += pLat * wave;
    lon += pLon * wave;

    points.push([lat, lon]);
  }
  return points;
}

/**
 * Interpolates and curves a list of waypoints to ensure realistic curvature.
 */
export function interpolateWaypoints(waypoints, stepsPerSegment = 10) {
  if (!waypoints || waypoints.length < 2) return waypoints;
  const curved = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const pt1 = waypoints[i];
    const pt2 = waypoints[i + 1];
    const start = [pt1.lat ?? pt1[0], pt1.lon ?? pt1[1]];
    const end = [pt2.lat ?? pt2[0], pt2.lon ?? pt2[1]];
    const segment = generateCurvedRoute(start, end, stepsPerSegment);
    
    // De-duplicate boundary points between segments
    if (i > 0) segment.shift();
    curved.push(...segment);
  }
  return curved;
}

/**
 * Processes a route object, ensuring its waypoints are curved.
 * Exposes a fallback if OSRM returns empty or straight-line waypoints.
 */
export function processRoute(route) {
  if (!route) return null;
  
  // Extract start and end coordinates
  const originLat = route.origin?.lat ?? route.waypoints?.[0]?.lat;
  const originLon = route.origin?.lon ?? route.waypoints?.[0]?.lon;
  const destLat = route.destination?.lat ?? route.waypoints?.[route.waypoints.length - 1]?.lat;
  const destLon = route.destination?.lon ?? route.waypoints?.[route.waypoints.length - 1]?.lon;

  if (originLat == null || originLon == null || destLat == null || destLon == null) {
    return route;
  }

  const start = [originLat, originLon];
  const end = [destLat, destLon];
  
  let points = [];
  if (route.waypoints && route.waypoints.length >= 2) {
    const rawPoints = route.waypoints.map(w => [w.lat ?? w[0], w.lon ?? w[1]]);
    points = interpolateWaypoints(rawPoints, 10);
  } else {
    points = generateCurvedRoute(start, end, 30);
  }
  
  return {
    ...route,
    waypoints: points.map(p => ({ lat: p[0], lon: p[1] }))
  };
}

/**
 * Expanded Delhi Safety POIs database
 */
export const DELHI_SAFETY_POIS = [
  // Hospitals
  { position: [28.5672, 77.2100], type: 'hospital', label: 'AIIMS Delhi' },
  { position: [28.5687, 77.2051], type: 'hospital', label: 'Safdarjung Hospital' },
  { position: [28.5351, 77.2874], type: 'hospital', label: 'Apollo Hospital Delhi' },
  { position: [28.5497, 77.3390], type: 'hospital', label: 'Fortis Hospital' },
  { position: [28.5244, 77.2090], type: 'hospital', label: 'Max Hospital' },

  // Medical Stores
  { position: [28.6305, 77.2202], type: 'medical', label: 'Apollo Pharmacy' },
  { position: [28.5680, 77.2450], type: 'medical', label: 'MedPlus' },
  { position: [28.6280, 77.2150], type: 'medical', label: 'Local chemist chain CP' },
  { position: [28.5220, 77.2085], type: 'medical', label: 'Local chemist chain Saket' },

  // Malls / Crowded Areas
  { position: [28.5284, 77.2190], type: 'crowded', label: 'Select City Walk' },
  { position: [28.5675, 77.3211], type: 'crowded', label: 'DLF Mall of India' },
  { position: [28.6300, 77.2195], type: 'crowded', label: 'Connaught Place market area' },
  { position: [28.6560, 77.2300], type: 'crowded', label: 'Chandni Chowk' },

  // Police Stations
  { position: [28.6300, 77.2180], type: 'police', label: 'Delhi Police CP Station' },
  { position: [28.5650, 77.2400], type: 'police', label: 'Delhi Police Lajpat Nagar Station' },
  { position: [28.5210, 77.2050], type: 'police', label: 'Delhi Police Saket Station' },
  { position: [28.6550, 77.2320], type: 'police', label: 'Delhi Police Chandni Chowk Station' },
  { position: [28.5992, 77.1990], type: 'police', label: 'Delhi Police Chanakyapuri Station' },
  { position: [28.6330, 77.2195], type: 'police', label: 'Connaught Place Police Station' },
  { position: [28.5490, 77.2050], type: 'police', label: 'Hauz Khas Police Station' },
  { position: [28.6519, 77.1909], type: 'police', label: 'Karol Bagh Police Station' },
  { position: [28.5200, 77.2070], type: 'police', label: 'Saket Police Station' },
  { position: [28.5820, 77.0490], type: 'police', label: 'Dwarka Police Station' }
];

/**
 * Filters a list of POIs against route waypoints within a 1.5 km distance threshold.
 */
export const detectPOIsForRoute = (waypoints, pois) => {
  if (!waypoints || waypoints.length === 0) return [];
  return pois.filter(poi => {
    return waypoints.some(wp => {
      const wpLat = wp.lat ?? wp[0];
      const wpLon = wp.lon ?? wp[1];
      return haversineDistance(wpLat, wpLon, poi.position[0], poi.position[1]) < 1.5;
    });
  });
};

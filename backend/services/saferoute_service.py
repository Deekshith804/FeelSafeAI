"""
services/saferoute_service.py
==============================
Real road-following routing using OSRM + FeelSafe safety scoring.
"""

import json
import os
import requests
from utils.risk_scoring import compute_route_safety_score, _score_to_label
from utils.location_utils import find_nearby, haversine_km
from utils.constants import UNSAFE_ZONE_RADIUS_KM
from models.feedback_model import get_route_stats

# ── Load Static Data ──────────────────────────────────────────────────────────
_BASE = os.path.dirname(os.path.abspath(__file__))
_DATA = os.path.join(_BASE, "..", "data")

with open(os.path.join(_DATA, "unsafe_zones.json"),  encoding="utf-8") as f:
    UNSAFE_ZONES = json.load(f)

# Static POI lists (extend or replace with Overpass API in production)
POLICE_POI = [
    {"name": "Connaught Place PS",       "lat": 28.6330, "lon": 77.2195},
    {"name": "Lajpat Nagar PS",          "lat": 28.5680, "lon": 77.2440},
    {"name": "Hauz Khas PS",             "lat": 28.5490, "lon": 77.2050},
    {"name": "Karol Bagh PS",            "lat": 28.6519, "lon": 77.1909},
    {"name": "Dwarka Sector 10 PS",      "lat": 28.5820, "lon": 77.0490},
    {"name": "Noida Sector 18 PS",       "lat": 28.5355, "lon": 77.3910},
    {"name": "Saket PS",                 "lat": 28.5200, "lon": 77.2070},
    {"name": "Vasant Kunj PS",           "lat": 28.5200, "lon": 77.1600},
    {"name": "Rohini Sector 8 PS",       "lat": 28.7300, "lon": 77.1100},
    {"name": "Janakpuri West PS",        "lat": 28.6300, "lon": 77.0800},
]

HOSPITAL_POI = [
    {"name": "AIIMS New Delhi",          "lat": 28.5672, "lon": 77.2100},
    {"name": "Safdarjung Hospital",      "lat": 28.5687, "lon": 77.2051},
    {"name": "Apollo Sarita Vihar",      "lat": 28.5351, "lon": 77.2874},
    {"name": "Max Saket",                "lat": 28.5244, "lon": 77.2090},
    {"name": "Fortis Noida",             "lat": 28.5497, "lon": 77.3390},
    {"name": "RML Hospital",             "lat": 28.6378, "lon": 77.2072},
    {"name": "GTB Hospital",             "lat": 28.6720, "lon": 77.3050},
    {"name": "Deen Dayal Upadhyay Hosp", "lat": 28.6380, "lon": 77.0680},
    {"name": "Sir Ganga Ram Hospital",   "lat": 28.6455, "lon": 77.1900},
    {"name": "Medanta Gurugram",         "lat": 28.4570, "lon": 77.0430},
]

SEARCH_RADIUS_KM = 1.5
OSRM_BASE_URL = "https://router.project-osrm.org"

# Tag bonuses — route tags that improve safety score
_TAG_BONUSES: dict[str, int] = {
    "well_lit":      8,
    "cctv_present":  7,
    "busy_road":     5,
    "busy_market":   5,
    "recommended":   6,
    "heavy_traffic": 3,
    "airport_road":  4,
}
# Tag penalties
_TAG_PENALTIES: dict[str, int] = {
    "isolated_stretch":  10,
    "poor_lighting":     8,
    "late_night_risk":   6,
    "dark_stretch":      8,
    "no_cctv":           5,
}


# ── Public API ────────────────────────────────────────────────────────────────

def get_safest_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> dict:
    """Fetch real OSRM alternatives and rank them by safety score."""
    candidates = _fetch_osrm_routes(origin_lat, origin_lon, dest_lat, dest_lon)
    if not candidates:
        fallback = _score_direct_route(origin_lat, origin_lon, dest_lat, dest_lon)
        return {"safest_route": fallback, "all_routes_ranked": [fallback], "explanation": "OSRM unavailable; scored direct fallback route."}

    scored = [_score_route(r, origin_lat, origin_lon, dest_lat, dest_lon) for r in candidates]
    scored.sort(key=lambda r: r["safety_score"], reverse=True)   # Safest first

    best  = scored[0]
    worst = scored[-1] if len(scored) > 1 else None

    explanation = _generate_explanation(best, worst, scored)

    return {
        "safest_route":      best,
        "all_routes_ranked": scored,
        "explanation":       explanation,
    }


def score_custom_route(
    mid_lat: float,
    mid_lon: float,
    is_isolated: bool,
    community_rating: float,
    unsafe_report_count: int,
    route_id: str = None,
) -> dict:
    """
    Score a custom / user-defined route segment using the safety engine.
    Useful when the frontend sends a route obtained from OSRM.
    """
    has_police   = bool(find_nearby(mid_lat, mid_lon, POLICE_POI,   radius_km=SEARCH_RADIUS_KM))
    has_hospital = bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))

    if route_id:
        stats = get_route_stats(route_id)
        community_rating    = stats["avg_rating"]          or community_rating
        unsafe_report_count = stats["unsafe_report_count"] or unsafe_report_count

    result = compute_route_safety_score(
        has_hospital_nearby  = has_hospital,
        has_police_nearby    = has_police,
        is_isolated          = is_isolated,
        unsafe_report_count  = unsafe_report_count,
        community_rating     = community_rating,
    )

    return {
        "safety_score":   result["score"],
        "safety_label":   result["label"],
        "safety_factors": result["factors"],
        "is_nighttime":   result["is_nighttime"],
    }


# ── Explanation Engine ────────────────────────────────────────────────────────

def _generate_explanation(best: dict, worst: dict | None, all_routes: list) -> str:
    """
    Generate a rich, human-readable AI explanation for why this route was chosen.
    Considers safety factors, nighttime status, community data, and comparisons.
    """
    score  = best["safety_score"]
    label  = best["safety_label"]
    name   = best["name"]
    factors = best.get("safety_factors", [])
    is_night = best.get("is_nighttime", False)
    is_deep_night = best.get("is_deep_night", False)
    stats  = best.get("community_stats", {})
    tags   = best.get("tags", [])

    # Opening sentence
    if score >= 80:
        opener = f"'{name}' is highly recommended — scoring {score}/100 ({label})."
    elif score >= 65:
        opener = f"'{name}' is the safest available route with a score of {score}/100 ({label})."
    elif score >= 40:
        opener = f"'{name}' is the least risky option, though conditions warrant caution (score {score}/100 — {label})."
    else:
        opener = f"All routes carry elevated risk. '{name}' is the safest of the available options (score {score}/100 — {label})."

    # Key positive factors
    positives = []
    if best.get("nearby_police"):
        nearby_station = _nearest_poi_name(best, POLICE_POI)
        positives.append(f"police presence nearby{' (' + nearby_station + ')' if nearby_station else ''}")
    if best.get("nearby_hospital"):
        positives.append("hospital within reach for emergencies")
    if "well_lit" in tags:
        positives.append("well-lit road throughout")
    if "cctv_present" in tags:
        positives.append("CCTV surveillance active")
    if "busy_road" in tags or "busy_market" in tags:
        positives.append("high foot traffic and activity")
    if stats.get("avg_rating", 0) >= 4.0:
        positives.append(f"strong community rating of {stats['avg_rating']:.1f}/5")

    pos_sentence = ""
    if positives:
        pos_sentence = " Key safety advantages: " + "; ".join(positives[:4]) + "."

    # Risk warnings
    warnings = []
    report_count = stats.get("unsafe_report_count", 0) or best.get("unsafe_report_count", 0)
    if report_count > 0:
        warnings.append(f"{report_count} community unsafe report{'s' if report_count != 1 else ''} on record")
    if best.get("is_isolated"):
        warnings.append("road has isolated stretches — stay alert")
    if "poor_lighting" in tags:
        warnings.append("some areas have poor lighting")
    if is_deep_night:
        warnings.append("deep-night travel (10 PM–4 AM) carries highest risk — stay vigilant")
    elif is_night:
        warnings.append("evening travel — increased caution advised")

    warn_sentence = ""
    if warnings:
        warn_sentence = " Note: " + "; ".join(warnings[:3]) + "."

    # Comparison with worst route
    compare_sentence = ""
    if worst and worst["safety_score"] < best["safety_score"]:
        gap = best["safety_score"] - worst["safety_score"]
        compare_sentence = (
            f" This route scores {gap} points safer than '{worst['name']}'"
            f" (score {worst['safety_score']}/100 — {worst['safety_label']}), "
            f"making it the clear preferred choice."
        )

    # Suitability tag
    if score >= 70 and not is_night:
        suitability = " Suitable for travel at any time of day."
    elif score >= 65 and is_night:
        suitability = " Reasonable for night travel if you stay aware."
    elif score >= 40:
        suitability = " Use extra caution, especially at night."
    else:
        suitability = " Consider delaying travel or using a verified cab service."

    return opener + pos_sentence + warn_sentence + compare_sentence + suitability


def _nearest_poi_name(route: dict, poi_list: list) -> str | None:
    """Return the name of the closest POI to the route midpoint, or None."""
    mid_lat = (route["origin"]["lat"] + route["destination"]["lat"]) / 2
    mid_lon = (route["origin"]["lon"] + route["destination"]["lon"]) / 2
    best_name, best_dist = None, float("inf")
    for poi in poi_list:
        d = haversine_km(mid_lat, mid_lon, poi["lat"], poi["lon"])
        if d < best_dist:
            best_dist, best_name = d, poi["name"]
    return best_name if best_dist <= SEARCH_RADIUS_KM * 2 else None


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _fetch_osrm_routes(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> list:
    """Fetch real driving routes from OSRM public API."""
    coords = f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
    url = f"{OSRM_BASE_URL}/route/v1/driving/{coords}"
    params = {
        "alternatives": "true",
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    try:
        resp = requests.get(url, params=params, timeout=12)
        resp.raise_for_status()
        payload = resp.json()
    except Exception:
        return []

    routes = payload.get("routes", [])
    normalized = []
    for idx, route in enumerate(routes):
        coords_ll = route.get("geometry", {}).get("coordinates", [])
        if len(coords_ll) < 2:
            continue
        waypoints = [{"lat": lat, "lon": lon} for lon, lat in coords_ll]
        route_id = f"osrm_{idx}_{int(route.get('distance', 0))}"
        normalized.append({
            "id": route_id,
            "name": "Safest Candidate" if idx == 0 else f"Alternative {idx}",
            "origin": {"lat": origin_lat, "lon": origin_lon, "name": "Origin"},
            "destination": {"lat": dest_lat, "lon": dest_lon, "name": "Destination"},
            "distance_km": round(route.get("distance", 0.0) / 1000, 2),
            "eta_minutes": round(route.get("duration", 0.0) / 60),
            "duration_seconds": round(route.get("duration", 0.0)),
            "waypoints": waypoints,
        })
    return normalized


def _score_route(route: dict, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> dict:
    """Score a real route using geometry, nearby POIs, and unsafe-zone proximity."""
    waypoints = route.get("waypoints", [])
    mid = waypoints[len(waypoints) // 2] if waypoints else {"lat": (origin_lat + dest_lat) / 2, "lon": (origin_lon + dest_lon) / 2}
    mid_lat = mid["lat"]
    mid_lon = mid["lon"]

    # Live community stats (DB)
    stats = get_route_stats(route["id"])
    community_rating = stats["avg_rating"] if stats["total_ratings"] > 0 else 3.2
    total_ratings = stats["total_ratings"] or 0
    unsafe_report_count = stats["unsafe_report_count"] or 0

    # POI proximity
    has_police = bool(find_nearby(mid_lat, mid_lon, POLICE_POI, radius_km=SEARCH_RADIUS_KM))
    has_hospital = bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))

    # Unsafe zone penalty
    unsafe_zone_hits = _count_unsafe_zones_on_route(route)
    unsafe_report_count += unsafe_zone_hits * 2    # each unsafe zone = 2 extra reports

    result = compute_route_safety_score(
        has_hospital_nearby = has_hospital,
        has_police_nearby   = has_police,
        is_isolated = unsafe_zone_hits >= 2,
        unsafe_report_count = unsafe_report_count,
        community_rating = float(community_rating),
        total_ratings = total_ratings,
    )

    # Prefer shorter routes slightly, but safety remains primary.
    distance_adjustment = max(-6, min(4, int((8 - route.get("distance_km", 8)) * 0.7)))
    final_score = max(0, min(100, result["score"] + distance_adjustment))
    if distance_adjustment != 0:
        result["factors"].append(f"Distance adjustment ({distance_adjustment:+d})")

    return {
        **route,
        "safety_score": final_score,
        "safety_label": _score_to_label(final_score),
        "safety_factors": result["factors"],
        "is_nighttime": result["is_nighttime"],
        "is_deep_night": result.get("is_deep_night", False),
        "community_stats": stats,
        "report_penalty": result.get("report_penalty", 0),
        "rating_bonus": result.get("rating_bonus", 0),
        "nearby_police": has_police,
        "nearby_hospital": has_hospital,
        "unsafe_report_count": unsafe_report_count,
        "is_isolated": unsafe_zone_hits >= 2,
        "tags": ["well_lit"] if unsafe_zone_hits == 0 else ["isolated_stretch"],
    }


def _score_direct_route(
    origin_lat: float, origin_lon: float,
    dest_lat:   float, dest_lon:   float,
) -> dict:
    """Fallback: score the midpoint of a direct origin→destination line."""
    mid_lat = (origin_lat + dest_lat) / 2
    mid_lon = (origin_lon + dest_lon) / 2

    has_police   = bool(find_nearby(mid_lat, mid_lon, POLICE_POI,   radius_km=SEARCH_RADIUS_KM))
    has_hospital = bool(find_nearby(mid_lat, mid_lon, HOSPITAL_POI, radius_km=SEARCH_RADIUS_KM))
    unsafe_near  = find_nearby(mid_lat, mid_lon, UNSAFE_ZONES,       radius_km=UNSAFE_ZONE_RADIUS_KM)

    result = compute_route_safety_score(
        has_hospital_nearby = has_hospital,
        has_police_nearby   = has_police,
        is_isolated         = False,
        unsafe_report_count = len(unsafe_near),
        community_rating    = 3.0,
    )

    dist = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)

    return {
        "id":             "direct",
        "name":           "Direct Route",
        "origin":         {"lat": origin_lat, "lon": origin_lon, "name": "Your Location"},
        "destination":    {"lat": dest_lat,   "lon": dest_lon,   "name": "Destination"},
        "distance_km":    round(dist, 2),
        "waypoints":      [],
        "safety_score":   result["score"],
        "safety_label":   result["label"],
        "safety_factors": result["factors"],
        "is_nighttime":   result["is_nighttime"],
        "is_deep_night":  result.get("is_deep_night", False),
        "community_stats": {"route_id": "direct", "total_ratings": 0, "avg_rating": 0, "unsafe_report_count": 0},
        "report_penalty":  result.get("report_penalty", 0),
        "rating_bonus":    result.get("rating_bonus", 0),
    }


def _count_unsafe_zones_on_route(route: dict) -> int:
    """Count how many known unsafe zones fall near the route's waypoints."""
    waypoints = route.get("waypoints", [])
    if not waypoints:
        waypoints = [
            {"lat": route["origin"]["lat"], "lon": route["origin"]["lon"]},
            {"lat": route["destination"]["lat"], "lon": route["destination"]["lon"]},
        ]
    sampled = waypoints[:: max(1, len(waypoints) // 60)]
    hits = set()
    for wp in sampled:
        for zone in UNSAFE_ZONES:
            if haversine_km(wp["lat"], wp["lon"], zone["lat"], zone["lon"]) <= UNSAFE_ZONE_RADIUS_KM:
                hits.add(zone["id"])
    return len(hits)

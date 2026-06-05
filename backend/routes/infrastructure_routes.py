"""
routes/infrastructure_routes.py
================================
Blueprint: Smart Emergency Infrastructure endpoints.
"""

from flask import Blueprint, request, jsonify
from services.infrastructure_service import (
    get_nearby_services, get_women_safe_route,
    get_highway_patrol, dispatch_112
)
from utils.helpers import error_response, require_fields

infrastructure_bp = Blueprint("infrastructure", __name__)

@infrastructure_bp.route("/infrastructure/nearby-services", methods=["POST"])
def api_infrastructure_nearby():
    """Find nearby emergency services in a given radius."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
        radius = float(data.get("radius_km", 5.0))
        
        services = get_nearby_services(lat, lon, radius)
        return jsonify({"success": True, "services": services, "count": len(services)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to fetch nearby services: {str(e)}")[0]), 500

@infrastructure_bp.route("/infrastructure/safe-route-enhanced", methods=["POST"])
def api_infrastructure_route():
    """Compute safe route that avoids hotspots and includes women safety routing features."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["origin_lat", "origin_lon", "dest_lat", "dest_lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        origin_lat = float(data["origin_lat"])
        origin_lon = float(data["origin_lon"])
        dest_lat = float(data["dest_lat"])
        dest_lon = float(data["dest_lon"])
        women_mode = bool(data.get("women_safety_mode", True))
        
        res = get_women_safe_route(origin_lat, origin_lon, dest_lat, dest_lon, women_mode)
        return jsonify(res), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to compute enhanced safe route: {str(e)}")[0]), 500

@infrastructure_bp.route("/infrastructure/highway-patrol", methods=["GET"])
def api_infrastructure_highway():
    """Check if coordinate is on/near a highway segment and fetch patrol info."""
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)
        if lat is None or lon is None:
            return jsonify(error_response("Missing query parameters 'lat' and 'lon'")[0]), 400
            
        res = get_highway_patrol(lat, lon)
        return jsonify({"success": True, **res}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to verify highway patrol status: {str(e)}")[0]), 500

@infrastructure_bp.route("/infrastructure/dispatch-112", methods=["POST"])
def api_infrastructure_dispatch():
    """Simulate ERSS 112 dispatch center connection and dispatch car."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["lat", "lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
        user_name = data.get("user_name", "FeelSafe User")
        
        res = dispatch_112(lat, lon, user_name)
        return jsonify(res), 200
    except Exception as e:
        return jsonify(error_response(f"112 Dispatch simulation failed: {str(e)}")[0]), 500

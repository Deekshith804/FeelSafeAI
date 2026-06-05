"""
routes/cybercrime_routes.py
============================
Blueprint: Cybercrime Hotspot Mapping endpoints.
"""

from flask import Blueprint, request, jsonify
from services.cybercrime_service import (
    get_hotspots, get_forecast, get_threat_feed,
    submit_citizen_report, get_gov_alerts
)
from utils.helpers import error_response, require_fields

cybercrime_bp = Blueprint("cybercrime", __name__)

@cybercrime_bp.route("/cybercrime/hotspots", methods=["GET"])
def api_cybercrime_hotspots():
    """Return all cybercrime hotspot coordinates and risk levels."""
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)
        data = get_hotspots(lat, lon)
        return jsonify({"success": True, "hotspots": data, "count": len(data)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to fetch hotspots: {str(e)}")[0]), 500

@cybercrime_bp.route("/cybercrime/forecast", methods=["GET"])
def api_cybercrime_forecast():
    """Return 24-hour or 48-hour risk forecasting overlays."""
    try:
        hours = request.args.get("hours", default=24, type=int)
        data = get_forecast(hours)
        return jsonify({"success": True, "forecast": data, "hours": hours, "count": len(data)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to generate forecast: {str(e)}")[0]), 500

@cybercrime_bp.route("/cybercrime/threats", methods=["GET"])
def api_cybercrime_threats():
    """Return real-time cyber threat intelligence feed."""
    try:
        limit = request.args.get("limit", default=20, type=int)
        data = get_threat_feed(limit)
        return jsonify({"success": True, "threats": data, "count": len(data)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to load threats: {str(e)}")[0]), 500

@cybercrime_bp.route("/cybercrime/report", methods=["POST"])
def api_cybercrime_report():
    """Allow citizen reports submission to dynamically update hotspots."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["incident_type", "description", "lat", "lon"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        user_id = data.get("user_id", 1)
        incident_type = data["incident_type"]
        description = data["description"]
        lat = float(data["lat"])
        lon = float(data["lon"])
        location_name = data.get("location_name", "")
        severity = data.get("severity", "MEDIUM")
        
        res = submit_citizen_report(
            user_id=user_id,
            incident_type=incident_type,
            description=description,
            lat=lat,
            lon=lon,
            location_name=location_name,
            severity=severity
        )
        return jsonify({"success": True, **res}), 201
    except Exception as e:
        return jsonify(error_response(f"Failed to submit cybercrime report: {str(e)}")[0]), 500

@cybercrime_bp.route("/cybercrime/gov-alerts", methods=["GET"])
def api_cybercrime_gov_alerts():
    """Simulation layer for cybercrime.gov.in official adivsories/alerts."""
    try:
        limit = request.args.get("limit", default=10, type=int)
        data = get_gov_alerts(limit)
        return jsonify({"success": True, "advisories": data, "count": len(data)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to fetch government advisories: {str(e)}")[0]), 500

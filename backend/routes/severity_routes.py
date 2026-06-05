"""
routes/severity_routes.py
==========================
Blueprint: AI Emergency Severity Detection endpoints.
Fuses voice features, text patterns, and GPS zone reports.
"""

from flask import Blueprint, request, jsonify
from services.severity_service import analyze_severity
from utils.helpers import error_response, require_fields

severity_bp = Blueprint("severity", __name__)

@severity_bp.route("/severity/analyze", methods=["POST"])
def api_severity_analyze():
    """
    Perform multi-modal severity analysis.
    Request body:
        {
            "text": "Help me I am in danger!",
            "lat": 28.6315,
            "lon": 77.2167,
            "voice_features": {
                "pitch": 240,
                "speech_rate": 180,
                "urgency_tone": 0.85
            },
            "user_id": 1
        }
    """
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["text"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        text = str(data["text"]).strip()
        lat = data.get("lat")
        lon = data.get("lon")
        if lat is not None: lat = float(lat)
        if lon is not None: lon = float(lon)
        
        voice_features = data.get("voice_features")
        user_id = int(data.get("user_id", 1))
        
        res = analyze_severity(
            text=text,
            lat=lat,
            lon=lon,
            voice_features=voice_features,
            user_id=user_id
        )
        return jsonify(res), 200
    except Exception as e:
        return jsonify(error_response(f"Severity analysis failed: {str(e)}")[0]), 500

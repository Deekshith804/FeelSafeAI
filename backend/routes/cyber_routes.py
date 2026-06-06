"""
routes/cyber_routes.py
===========================
Blueprint for AI-generated and official Cyber Threat Intelligence.
"""

from flask import Blueprint, jsonify
from services.cyber_intel_service import get_live_threat_feed, get_national_portal_intel
from datetime import datetime

cyber_bp = Blueprint("cyber", __name__)

@cyber_bp.route("/cyber/live-threat-feed", methods=["GET"])
def api_live_threat_feed():
    try:
        items = get_live_threat_feed()
        return jsonify({
            "success": True,
            "updated_at": datetime.utcnow().isoformat(),
            "items": items
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cyber_bp.route("/cyber/national-portal-intel", methods=["GET"])
def api_national_portal_intel():
    try:
        items = get_national_portal_intel()
        return jsonify({
            "success": True,
            "updated_at": datetime.utcnow().isoformat(),
            "items": items
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

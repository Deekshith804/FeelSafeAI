"""
routes/fir_routes.py
=====================
Blueprint: Auto FIR & Complaint Generator endpoints.
"""

import os
from flask import Blueprint, request, jsonify
from services.fir_service import (
    generate_fir, attach_evidence, get_fir_detail,
    list_firs, update_status, SUPPORTED_LANGUAGES
)
from utils.helpers import error_response, require_fields
from werkzeug.utils import secure_filename

fir_bp = Blueprint("fir", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "evidence")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@fir_bp.route("/fir/generate", methods=["POST"])
def api_fir_generate():
    """Generate structured FIR draft from text description."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["incident_description"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        user_id = data.get("user_id", 1)
        desc = data["incident_description"]
        lang = data.get("language", "en")
        name = data.get("complainant_name", "FeelSafe User")
        phone = data.get("complainant_phone", "")
        location = data.get("incident_location", "Delhi, India")
        date_str = data.get("incident_date")
        accused = data.get("accused_description", "Unknown")
        
        result = generate_fir(
            incident_text=desc,
            language=lang,
            complainant_name=name,
            complainant_phone=phone,
            incident_location=location,
            incident_date=date_str,
            accused_description=accused,
            user_id=user_id
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to generate FIR: {str(e)}")[0]), 500

@fir_bp.route("/fir/list", methods=["GET"])
def api_fir_list():
    """List submitted FIR complaints."""
    try:
        user_id = request.args.get("user_id", type=int)
        limit = request.args.get("limit", default=20, type=int)
        data = list_firs(user_id, limit)
        return jsonify({"success": True, "firs": data, "count": len(data)}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to list FIRs: {str(e)}")[0]), 500

@fir_bp.route("/fir/<int:fir_id>", methods=["GET"])
def api_fir_detail(fir_id):
    """Retrieve full detail of a FIR including hash of attachments."""
    try:
        data = get_fir_detail(fir_id)
        if not data:
            return jsonify(error_response("FIR record not found")[0]), 404
        return jsonify({"success": True, "fir": data}), 200
    except Exception as e:
        return jsonify(error_response(f"Failed to get FIR detail: {str(e)}")[0]), 500

@fir_bp.route("/fir/status/<int:fir_id>", methods=["PUT"])
def api_fir_update_status(fir_id):
    """Update FIR status (Filed -> Assigned -> Resolved)."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["status"])
    if missing:
        return jsonify(error_response(f"Missing required field: '{missing}'")[0]), 400
        
    try:
        status = data["status"]
        officer = data.get("assigned_officer")
        res = update_status(fir_id, status, officer)
        return jsonify({"success": True, **res}), 200
    except ValueError as ve:
        return jsonify(error_response(str(ve))[0]), 400
    except Exception as e:
        return jsonify(error_response(f"Failed to update status: {str(e)}")[0]), 500

@fir_bp.route("/fir/evidence", methods=["POST"])
def api_fir_upload_evidence():
    """Upload evidence file, generate SHA-256 hash, and associate with FIR."""
    if "file" not in request.files:
        return jsonify(error_response("No file uploaded in key 'file'")[0]), 400
        
    file = request.files["file"]
    fir_id_str = request.form.get("fir_id")
    if not fir_id_str:
        return jsonify(error_response("Missing 'fir_id' in form parameters")[0]), 400
        
    try:
        fir_id = int(fir_id_str)
    except ValueError:
        return jsonify(error_response("'fir_id' must be a valid integer")[0]), 400
        
    if file.filename == "":
        return jsonify(error_response("Invalid empty filename")[0]), 400
        
    try:
        filename = secure_filename(file.filename)
        # Compute SHA-256 hash first
        file_bytes = file.read()
        file.seek(0) # reset pointer to save file
        
        # Save file to server disk
        save_path = os.path.join(UPLOAD_FOLDER, f"fir_{fir_id}_{filename}")
        file.save(save_path)
        
        res = attach_evidence(
            fir_id=fir_id,
            filename=f"fir_{fir_id}_{filename}",
            original_name=file.filename,
            file_type=file.content_type,
            file_bytes=file_bytes
        )
        return jsonify({"success": True, **res}), 201
    except Exception as e:
        return jsonify(error_response(f"Failed to upload evidence: {str(e)}")[0]), 500

@fir_bp.route("/fir/languages", methods=["GET"])
def api_fir_languages():
    """Return all 22 officially supported Indian languages for translation."""
    return jsonify({"success": True, "languages": SUPPORTED_LANGUAGES}), 200

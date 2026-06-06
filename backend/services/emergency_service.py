"""
services/emergency_service.py
==============================
SOS emergency escalation with AUTOMATIC contact notification.

Escalation levels:
    1 → Initial alert   (WhatsApp link + Twilio SMS if HIGH)
    2 → Retry alert     (Twilio SMS to all contacts)
    3 → Max escalation  (Twilio Voice call + call police)

Auto-escalation:
    MEDIUM risk → notify medium-enabled contacts (WA + SMS)
    HIGH risk   → notify ALL high-enabled contacts (WA + SMS + Call)
"""

import logging
from datetime import datetime

from models.trip_model   import get_connection
from models.contact_model import get_contacts_for_alert
from services.whatsapp_service import generate_emergency_link
from services.twilio_service import (
    normalize_phone, send_sms_to_contacts, call_contacts, send_sms_alert,
)
from utils.constants import EMERGENCY_NUMBERS, MAX_RETRY_ATTEMPTS
from utils.helpers import utc_now_str
from utils.location_utils import find_nearby

logger = logging.getLogger(__name__)

# ── Static POIs ───────────────────────────────────────────────────────────────
POLICE_STATIONS = [
    {"name": "Connaught Place PS",  "lat": 28.6330, "lon": 77.2195, "phone": "011-23341111"},
    {"name": "Lajpat Nagar PS",     "lat": 28.5680, "lon": 77.2440, "phone": "011-29815555"},
    {"name": "Hauz Khas PS",        "lat": 28.5490, "lon": 77.2050, "phone": "011-26867777"},
    {"name": "Karol Bagh PS",       "lat": 28.6519, "lon": 77.1909, "phone": "011-28750000"},
    {"name": "Dwarka Sector 10",    "lat": 28.5820, "lon": 77.0490, "phone": "011-25086666"},
    {"name": "Noida Sector 18 PS",  "lat": 28.5355, "lon": 77.3910, "phone": "0120-2520222"},
]

HOSPITALS = [
    {"name": "AIIMS New Delhi",            "lat": 28.5672, "lon": 77.2100, "phone": "011-26588500"},
    {"name": "Safdarjung Hospital",        "lat": 28.5687, "lon": 77.2051, "phone": "011-26707444"},
    {"name": "Apollo Sarita Vihar",        "lat": 28.5351, "lon": 77.2874, "phone": "011-71791090"},
    {"name": "Max Super Speciality Saket", "lat": 28.5244, "lon": 77.2090, "phone": "011-26515050"},
    {"name": "Fortis Noida",               "lat": 28.5497, "lon": 77.3390, "phone": "0120-2400444"},
    {"name": "RML Hospital",               "lat": 28.6378, "lon": 77.2072, "phone": "011-23404325"},
]


# ── Context-Aware SMS Message Builder ─────────────────────────────────────────

def _build_sms_message(
    user_name: str,
    risk_level: str,
    lat: float,
    lon: float,
    threat_text: str = "",
    trip_description: str = "",
) -> str:
    """Build a dynamic, context-aware SMS alert message."""
    maps_link = f"https://maps.google.com/?q={lat},{lon}"
    timestamp = datetime.now().strftime("%d %b %Y %I:%M %p")
    threat_line = f"\nSituation: \"{threat_text}\"" if threat_text else ""
    trip_line = f"\nTrip: {trip_description}" if trip_description else ""
    emoji = "🚨" if risk_level == "HIGH" else "⚠️"

    return (
        f"{emoji} EMERGENCY ALERT from FeelSafe\n\n"
        f"User: {user_name}\n"
        f"Risk: {risk_level}{threat_line}{trip_line}\n"
        f"Location: {maps_link}\n"
        f"Time: {timestamp}\n\n"
        f"Needs immediate help. Please contact them now.\n"
        f"Emergency: Police {EMERGENCY_NUMBERS['police']} | "
        f"Ambulance {EMERGENCY_NUMBERS['ambulance']}"
    )


# ── Main Trigger ──────────────────────────────────────────────────────────────

def trigger_emergency(
    lat: float,
    lon: float,
    trip_id: int = None,
    user_id: int = None,
    contact_phone: str = None,
    user_name: str = "FeelSafe User",
    retry_attempt: int = 1,
    risk_level: str = "HIGH",
    threat_text: str = "",
    audio_reference_id: str = None,
    audio_transcript: str = None,
    audio_timestamp: str = None,
    contact_numbers: list = None,
) -> dict:
    """
    Trigger a full SOS emergency response with automatic contact escalation.

    Escalation Decision Logic (Agentic Flow):
        Level 1 (retry_attempt=1, risk=HIGH):
            → WhatsApp links for all contacts
            → Twilio SMS to all contacts

        Level 1 (retry_attempt=1, risk=MEDIUM/LOW):
            → WhatsApp links only

        Level 2 (retry_attempt>=2):
            → WhatsApp links + Twilio SMS (all contacts)

        Level 3 (retry_attempt>=3 OR risk=HIGH on retry):
            → WhatsApp + Twilio SMS + Twilio Voice Call

    Args:
        lat, lon:       User's GPS coordinates.
        trip_id:        Associated trip (optional).
        user_id:        User ID for contact lookup.
        contact_phone:  Manual override contact phone.
        user_name:      User's name for the message.
        retry_attempt:  Escalation level (1–3).
        risk_level:     "LOW" | "MEDIUM" | "HIGH"
        threat_text:    The text that triggered the threat (for the WA message).
    """
    retry_attempt    = max(1, min(retry_attempt, MAX_RETRY_ATTEMPTS))
    escalation_level = retry_attempt
    maps_link        = f"https://maps.google.com/?q={lat},{lon}"

    logger.info(
        f"[EmergencyService] Trigger — level={escalation_level} "
        f"risk={risk_level} user={user_name}"
    )
    trip_description = _get_trip_description(trip_id)

    # ── Auto-contact lookup ───────────────────────────────────────────────────
    auto_contacts = []
    if user_id:
        auto_contacts = get_contacts_for_alert(user_id, risk_level)

    # Fallback to frontend-provided contacts if DB is empty
    if not auto_contacts:
        if contact_numbers:
            valid_nums = [n for n in contact_numbers if n]
            auto_contacts = [{"phone": num, "name": f"Contact {i+1}"} for i, num in enumerate(valid_nums)]
        elif contact_phone:
            if isinstance(contact_phone, list):
                valid_nums = [n for n in contact_phone if n]
                auto_contacts = [{"phone": num, "name": f"Contact {i+1}"} for i, num in enumerate(valid_nums)]
            elif str(contact_phone).strip():
                auto_contacts = [{"phone": str(contact_phone).strip(), "name": "Primary Contact"}]

    # Strict check: If BOTH are empty, return error and do NOT send SMS blindly
    if not auto_contacts:
        logger.error("[EmergencyService] Failed to trigger emergency: NO_CONTACTS_AVAILABLE")
        return {
            "success": False,
            "error": "NO_CONTACTS_AVAILABLE",
            "message": "No emergency contacts are available to notify."
        }

    # ── WhatsApp link generation (always — existing behavior) ─────────────────
    auto_wa_links = []
    for contact in auto_contacts:
        wa = generate_emergency_link(
            lat=lat, lon=lon,
            contact_phone=contact["phone"],
            user_name=user_name,
            threat_text=threat_text,
            risk_level=risk_level,
        )
        auto_wa_links.append({
            "contact_name":  contact["name"],
            "contact_phone": normalize_phone(contact["phone"]),
            "whatsapp_link": wa["whatsapp_link"],
            "maps_link":     wa["maps_link"],
        })

    # Primary link (manual override or first auto-contact or generic)
    primary_phone = contact_phone or (auto_contacts[0]["phone"] if auto_contacts else None)
    wa_data = generate_emergency_link(
        lat=lat, lon=lon,
        contact_phone=primary_phone,
        user_name=user_name,
        threat_text=threat_text,
        risk_level=risk_level,
    )

    # ── Nearby resources ──────────────────────────────────────────────────────
    nearby_police    = find_nearby(lat, lon, POLICE_STATIONS, radius_km=3.0)
    nearby_hospitals = find_nearby(lat, lon, HOSPITALS,       radius_km=3.0)

    # ── Agentic Decision Layer ────────────────────────────────────────────────
    # Determine which Twilio actions to trigger based on risk + escalation level
    trigger_sms  = True
    trigger_call = (escalation_level >= 3)

    sms_results  = []
    call_results = []

    if audio_reference_id:
        sms_message = (
            f"🚨 EMERGENCY AUDIO ALERT from FeelSafe\n\n"
            f"User: {user_name}\n"
            f"Ref ID: {audio_reference_id}\n"
            f"Message: High risk emergency recorded audio attached\n"
            f"Transcript: \"{audio_transcript}\"\n"
            f"Time: {audio_timestamp}\n"
            f"Location: {maps_link}"
        )
    else:
        sms_message = _build_sms_message(user_name, risk_level, lat, lon, threat_text, trip_description)

    # ── Action Layer: Twilio SMS ──────────────────────────────────────────────
    if trigger_sms:
        logger.info(f"[EmergencyService] Sending SMS to {len(auto_contacts)} contact(s)...")
        sms_results = send_sms_to_contacts(auto_contacts, sms_message)

    # ── Action Layer: Twilio Voice Call ───────────────────────────────────────
    if trigger_call:
        logger.info(f"[EmergencyService] Initiating voice calls to {len(auto_contacts)} contact(s)...")
        call_results = call_contacts(
            contacts=auto_contacts,
            user_name=user_name,
            risk_level=risk_level,
            maps_link=maps_link,
            trip_description=trip_description,
        )

    # ── Merge results for frontend ────────────────────────────────────────────
    # Build a unified per-contact result list
    combined_results = _merge_results(auto_wa_links, sms_results, call_results)

    escalation_msg = _escalation_message(escalation_level, user_name)
    alert_id       = _save_alert(trip_id, user_id, lat, lon,
                                 escalation_level, wa_data["whatsapp_link"])

    return {
        "alert_id":               alert_id,
        "escalation_level":       escalation_level,
        "max_retries":            MAX_RETRY_ATTEMPTS,
        "escalation_message":     escalation_msg,
        "whatsapp_link":          wa_data["whatsapp_link"],
        "message_text":           wa_data["message_text"],
        "maps_link":              wa_data["maps_link"],
        "emergency_numbers":      EMERGENCY_NUMBERS,
        "nearby_police":          nearby_police[:3],
        "nearby_hospitals":       nearby_hospitals[:3],
        "auto_contacts_notified": auto_wa_links,
        "contacts_count":         len(auto_wa_links),
        "triggered_at":           utc_now_str(),
        "should_retry":           escalation_level < MAX_RETRY_ATTEMPTS,
        "retry_in_seconds":       30 if escalation_level < MAX_RETRY_ATTEMPTS else None,
        # New Twilio escalation fields
        "twilio_sms_triggered":   trigger_sms,
        "twilio_call_triggered":  trigger_call,
        "sms_results":            sms_results,
        "call_results":           call_results,
        "results":                combined_results,   # Unified per-contact view
    }


def trigger_auto_escalation(
    lat: float,
    lon: float,
    risk_level: str,
    threat_text: str = "",
    user_id: int = 1,
    user_name: str = "FeelSafe User",
    trip_id: int = None,
) -> dict | None:
    """
    Automatic escalation triggered by threat analysis result.
    Called automatically when MEDIUM or HIGH risk is detected.

    Returns None for LOW risk (no auto-action).
    """
    if risk_level == "LOW":
        return None

    return trigger_emergency(
        lat=lat, lon=lon,
        trip_id=trip_id,
        user_id=user_id,
        user_name=user_name,
        retry_attempt=1,
        risk_level=risk_level,
        threat_text=threat_text,
    )


def get_retry_escalation(
    lat: float, lon: float,
    previous_attempt: int,
    trip_id: int = None,
    user_id: int = None,
    contact_phone: str = None,
    user_name: str = "FeelSafe User",
    contact_numbers: list = None,
) -> dict:
    """Trigger the next retry for an unanswered emergency."""
    return trigger_emergency(
        lat=lat, lon=lon,
        trip_id=trip_id, user_id=user_id,
        contact_phone=contact_phone, user_name=user_name,
        contact_numbers=contact_numbers,
        retry_attempt=previous_attempt + 1,
        risk_level="HIGH",   # Retries are always treated as HIGH
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _merge_results(wa_links: list, sms_results: list, call_results: list) -> list:
    """Merge per-contact WhatsApp, SMS, and Call results into a unified list."""
    # Index SMS and Call by normalized phone
    sms_by_phone  = {r["normalized"]: r for r in sms_results}
    call_by_phone = {r["normalized"]: r for r in call_results}

    merged = []
    for wa in wa_links:
        phone = wa["contact_phone"]
        sms   = sms_by_phone.get(phone, {})
        call  = call_by_phone.get(phone, {})
        merged.append({
            "number":          phone,
            "contact_name":    wa["contact_name"],
            "whatsapp_link":   wa["whatsapp_link"],
            "sms_status":      sms.get("sms_status", "not_triggered"),
            "sms_sid":         sms.get("sms_sid"),
            "sms_error":       sms.get("sms_error"),
            "is_trial_error":  sms.get("is_trial_error", False),
            "user_hint":       sms.get("user_hint"),
            "call_status":     call.get("call_status", "not_triggered"),
            "call_sid":        call.get("call_sid"),
        })
    return merged


def _escalation_message(level: int, user_name: str) -> str:
    messages = {
        1: f"Emergency alert sent for {user_name}. WhatsApp + SMS dispatched. Stay calm and move to safety.",
        2: f"RETRY: {user_name} has not confirmed safety. SMS + WhatsApp re-sent. Contact emergency services.",
        3: f"MAX ESCALATION: {user_name} is unresponsive. Voice calls initiated. Call 112 immediately.",
    }
    return messages.get(level, messages[3])


def _save_alert(trip_id, user_id, lat, lon, escalation_level, whatsapp_link) -> int | None:
    try:
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO emergency_alerts
               (trip_id, user_id, lat, lon, escalation_level, whatsapp_link)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (trip_id, user_id, lat, lon, escalation_level, whatsapp_link),
        )
        conn.commit()
        alert_id = cursor.lastrowid
        conn.close()
        return alert_id
    except Exception as e:
        logger.error(f"[EmergencyService] DB save failed: {e}")
        return None


def _get_trip_description(trip_id) -> str:
    """Fetch trip source->destination labels for emergency SMS/call context."""
    if not trip_id:
        return ""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT origin_name, dest_name FROM trips WHERE id = ?", (trip_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return ""
        origin = row["origin_name"] or "Source"
        dest = row["dest_name"] or "Destination"
        return f"{origin} -> {dest}"
    except Exception as e:
        logger.warning(f"[EmergencyService] Could not resolve trip description: {e}")
        return ""

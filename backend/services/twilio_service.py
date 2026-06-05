"""
services/twilio_service.py
===========================
Twilio SMS + Voice call escalation layer for FeelSafe emergency system.

Functions:
    normalize_phone(phone)        → E.164 format (+919XXXXXXXXX)
    send_sms_alert(phone, msg)    → Twilio SMS
    make_emergency_call(phone, msg, ...) → Twilio Voice (inline TwiML)
    send_sms_to_contacts(contacts, msg)  → Batch SMS
    call_contacts(contacts, msg, ...)    → Batch Voice
"""

import os
import logging

logger = logging.getLogger(__name__)

# ── Lazy Twilio import (graceful fallback if not installed / creds missing) ────
try:
    from twilio.rest import Client as TwilioClient
    from twilio.base.exceptions import TwilioRestException
    _TWILIO_AVAILABLE = True
except ImportError:
    _TWILIO_AVAILABLE = False
    TwilioRestException = Exception
    logger.warning("[TwilioService] twilio package not installed — SMS/Voice disabled.")


def _get_client():
    """Return an authenticated Twilio client, or None if credentials are missing."""
    sid   = os.getenv("TWILIO_SID", "").strip()
    auth  = os.getenv("TWILIO_AUTH", "").strip()
    if not (sid and auth):
        logger.warning("[TwilioService] TWILIO_SID / TWILIO_AUTH not set — Twilio disabled.")
        return None
    if not _TWILIO_AVAILABLE:
        return None
    return TwilioClient(sid, auth)


def normalize_phone(phone: str) -> str:
    """
    Normalize an Indian phone number to E.164 format.
    STRICT Rules:
    - If number has 10 digits -> +91XXXXXXXXXX
    - If number already starts with +91 and has 12 digits -> keep it
    - If number starts with 91 (no plus) and has 12 digits -> prepend +
    - Else -> reject/log error, return "" (no guessing, no trimming)
    """
    if not phone:
        return ""
    cleaned = phone.strip()
    digits = "".join(c for c in cleaned if c.isdigit())
    
    if len(digits) == 10:
        return f"+91{digits}"
    elif cleaned.startswith("+91") and len(digits) == 12:
        return f"+{digits}"
    elif cleaned.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    
    logger.error(f"[TwilioService] Rejecting invalid phone format: {phone}")
    return ""


def send_sms_alert(phone: str, message: str) -> dict:
    """
    Send an SMS alert via Twilio.

    Returns:
        { "success": bool, "sid": str|None, "status": str|None, "error": str|None }
    """
    normalized = normalize_phone(phone)
    if not normalized:
        return {"success": False, "sid": None, "status": "failed", "error": "Invalid phone format"}

    from_phone = os.getenv("TWILIO_PHONE", "").strip()

    logger.info(f"[TwilioSMS] Sending SMS → {normalized}")

    client = _get_client()
    if not client:
        return {"success": False, "sid": None, "status": "failed", "error": "Twilio not configured"}
    if not from_phone:
        return {"success": False, "sid": None, "status": "failed", "error": "TWILIO_PHONE not set"}

    try:
        msg = client.messages.create(
            body=message,
            from_=from_phone,
            to=normalized,
        )
        print("SMS SENDING TO:", normalized)
        print("SMS FROM:", from_phone)
        print("MESSAGE:", message)
        print("TWILIO RESPONSE SID:", msg.sid)
        print("STATUS:", msg.status)
        print("TWILIO ERROR CODE:", getattr(msg, "error_code", None))
        print("TWILIO ERROR MESSAGE:", getattr(msg, "error_message", None))
        
        logger.info(f"[TwilioSMS] Sent — SID: {msg.sid}, Status: {msg.status}")
        return {"success": True, "sid": msg.sid, "status": msg.status, "error": None}
    except TwilioRestException as e:
        print("SMS SENDING FAILED TO:", normalized)
        print("TWILIO REST EXCEPTION ERROR:", str(e))
        logger.error(f"[TwilioSMS] Failed for {normalized}: {e}")
        return {"success": False, "sid": None, "status": "failed", "error": str(e)}


def make_emergency_call(
    phone: str,
    user_name: str = "FeelSafe User",
    risk_level: str = "HIGH",
    maps_link: str = "",
    trip_description: str = "",
) -> dict:
    """
    Initiate a Twilio Voice call using inline TwiML <Say>.

    Args:
        phone:            Recipient phone number (will be normalized).
        user_name:        Name of the person in danger.
        risk_level:       "HIGH" | "MEDIUM" | "LOW"
        maps_link:        Google Maps live location URL.
        trip_description: Short trip context (e.g. "Bangalore to Mysore").

    Returns:
        { "success": bool, "sid": str|None, "error": str|None }
    """
    normalized = normalize_phone(phone)
    from_phone = os.getenv("TWILIO_PHONE", "").strip()

    logger.info(f"[TwilioCall] Initiating voice call → {normalized}")

    client = _get_client()
    if not client:
        return {"success": False, "sid": None, "error": "Twilio not configured"}
    if not from_phone:
        return {"success": False, "sid": None, "error": "TWILIO_PHONE not set"}

    # Build spoken message (TTS-friendly — no URLs in speech)
    trip_line = f"Last known trip: {trip_description}. " if trip_description else ""
    twiml_message = (
        f"This is an automated emergency alert from FeelSafe. "
        f"A user named {user_name} may be in danger. "
        f"Threat level is {risk_level}. "
        f"{trip_line}"
        f"Please contact the user immediately and check on their safety. "
        f"This message will repeat. "
        f"This is an automated emergency alert from FeelSafe. "
        f"A user named {user_name} may be in danger. "
        f"Threat level is {risk_level}. "
        f"{trip_line}"
        f"Please contact the user immediately."
    )

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" language="en-US">{twiml_message}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna" language="en-US">End of emergency alert.</Say>
</Response>"""

    try:
        call = client.calls.create(
            twiml=twiml,
            from_=from_phone,
            to=normalized,
        )
        logger.info(f"[TwilioCall] Initiated — SID: {call.sid}")
        return {"success": True, "sid": call.sid, "error": None}
    except TwilioRestException as e:
        logger.error(f"[TwilioCall] Failed for {normalized}: {e}")
        return {"success": False, "sid": None, "error": str(e)}


def send_sms_to_contacts(contacts: list, message: str) -> list:
    """
    Send SMS to a list of contacts.

    Args:
        contacts: List of dicts with at least a "phone" key.
        message:  The SMS message body.

    Returns:
        List of result dicts with contact info + SMS status.
    """
    results = []
    for contact in contacts:
        phone = contact.get("phone", "")
        result = send_sms_alert(phone, message)
        results.append({
            "contact_name":  contact.get("name", "Contact"),
            "phone":         phone,
            "normalized":    normalize_phone(phone),
            "sms_status":    "sent" if result["success"] else "failed",
            "sms_sid":       result.get("sid"),
            "sms_error":     result.get("error"),
        })
    return results


def call_contacts(
    contacts: list,
    user_name: str,
    risk_level: str,
    maps_link: str,
    trip_description: str = "",
) -> list:
    """
    Initiate voice calls to a list of contacts.

    Returns:
        List of result dicts with contact info + call status.
    """
    results = []
    for contact in contacts:
        phone = contact.get("phone", "")
        result = make_emergency_call(
            phone=phone,
            user_name=user_name,
            risk_level=risk_level,
            maps_link=maps_link,
            trip_description=trip_description,
        )
        results.append({
            "contact_name":  contact.get("name", "Contact"),
            "phone":         phone,
            "normalized":    normalize_phone(phone),
            "call_status":   "initiated" if result["success"] else "failed",
            "call_sid":      result.get("sid"),
            "call_error":    result.get("error"),
        })
    return results

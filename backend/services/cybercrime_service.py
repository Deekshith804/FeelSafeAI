"""
services/cybercrime_service.py
================================
Cybercrime Hotspot Mapping engine for FeelSafe.
Provides: heatmap data, 24h/48h forecasts, threat intel feed,
          citizen report ingestion, cybercrime.gov.in simulation.

All datasets are mock/synthetic for hackathon demo purposes.
Real API integration hooks are clearly marked.
"""

import random
import math
from datetime import datetime, timedelta
from models.cybercrime_model import save_report, get_all_reports, get_report_count_near

# ── Static Mock Hotspot Dataset (India-wide major cities) ─────────────────────
_BASE_HOTSPOTS = [
    # Delhi NCR
    {"id": "DEL-001", "zone": "Connaught Place, Delhi", "lat": 28.6315, "lon": 77.2167, "base_risk": 0.72, "types": ["phishing", "UPI fraud", "identity theft"]},
    {"id": "DEL-002", "zone": "Chandni Chowk, Delhi", "lat": 28.6507, "lon": 77.2334, "base_risk": 0.65, "types": ["mobile snatch", "pickpocket", "fake calls"]},
    {"id": "DEL-003", "zone": "Saket, Delhi", "lat": 28.5244, "lon": 77.2066, "base_risk": 0.48, "types": ["ATM fraud", "phishing"]},
    {"id": "DEL-004", "zone": "Paharganj, Delhi", "lat": 28.6448, "lon": 77.2139, "base_risk": 0.78, "types": ["tourist scam", "fake currency", "drug nexus"]},
    {"id": "DEL-005", "zone": "Lajpat Nagar, Delhi", "lat": 28.5677, "lon": 77.2433, "base_risk": 0.55, "types": ["chain snatching", "cyber stalking"]},
    # Mumbai
    {"id": "MUM-001", "zone": "Dharavi, Mumbai", "lat": 19.0383, "lon": 72.8527, "base_risk": 0.80, "types": ["cyber fraud", "loan app scam", "blackmail"]},
    {"id": "MUM-002", "zone": "Andheri West, Mumbai", "lat": 19.1136, "lon": 72.8697, "base_risk": 0.60, "types": ["online job scam", "phishing", "OTP fraud"]},
    {"id": "MUM-003", "zone": "Kurla, Mumbai", "lat": 19.0726, "lon": 72.8845, "base_risk": 0.70, "types": ["UPI fraud", "fake delivery", "SIM swap"]},
    {"id": "MUM-004", "zone": "Bandra, Mumbai", "lat": 19.0596, "lon": 72.8295, "base_risk": 0.44, "types": ["social media fraud", "romance scam"]},
    # Bangalore
    {"id": "BLR-001", "zone": "Whitefield, Bangalore", "lat": 12.9698, "lon": 77.7500, "base_risk": 0.68, "types": ["tech support scam", "investment fraud", "phishing"]},
    {"id": "BLR-002", "zone": "Koramangala, Bangalore", "lat": 12.9352, "lon": 77.6245, "base_risk": 0.53, "types": ["app fraud", "gig worker scam", "data theft"]},
    {"id": "BLR-003", "zone": "BTM Layout, Bangalore", "lat": 12.9165, "lon": 77.6101, "base_risk": 0.47, "types": ["rental scam", "OLX fraud"]},
    # Hyderabad
    {"id": "HYD-001", "zone": "Hitech City, Hyderabad", "lat": 17.4435, "lon": 78.3772, "base_risk": 0.74, "types": ["ransomware", "corporate espionage", "phishing"]},
    {"id": "HYD-002", "zone": "Secunderabad, Hyderabad", "lat": 17.4399, "lon": 78.4983, "base_risk": 0.58, "types": ["ATM skimming", "fake banking"]},
    # Chennai
    {"id": "CHN-001", "zone": "T Nagar, Chennai", "lat": 13.0418, "lon": 80.2341, "base_risk": 0.62, "types": ["gold chain snatch", "mobile theft", "UPI fraud"]},
    {"id": "CHN-002", "zone": "Anna Nagar, Chennai", "lat": 13.0878, "lon": 80.2098, "base_risk": 0.45, "types": ["phishing", "fake offers"]},
    # Kolkata
    {"id": "KOL-001", "zone": "Park Street, Kolkata", "lat": 22.5515, "lon": 88.3530, "base_risk": 0.61, "types": ["wallet theft", "social media fraud"]},
    {"id": "KOL-002", "zone": "Howrah, Kolkata", "lat": 22.5958, "lon": 88.2636, "base_risk": 0.71, "types": ["train scam", "fake ID", "pickpocket"]},
    # Pune
    {"id": "PUN-001", "zone": "Kothrud, Pune", "lat": 18.5074, "lon": 73.8077, "base_risk": 0.49, "types": ["investment scam", "social media"]},
    {"id": "PUN-002", "zone": "Shivajinagar, Pune", "lat": 18.5308, "lon": 73.8475, "base_risk": 0.56, "types": ["OTP fraud", "fake recruitment"]},
]

# ── Time-of-day risk multipliers ───────────────────────────────────────────────
def _time_multiplier(hour: int) -> float:
    """Risk increases at night and during commute hours."""
    if 0 <= hour < 5:    return 1.40   # Late night — high risk
    if 5 <= hour < 8:    return 0.80   # Early morning — low risk
    if 8 <= hour < 11:   return 1.10   # Morning commute
    if 11 <= hour < 14:  return 0.90   # Midday — lower
    if 14 <= hour < 17:  return 0.95
    if 17 <= hour < 20:  return 1.20   # Evening commute — elevated
    if 20 <= hour < 23:  return 1.30   # Night — high risk
    return 1.35                          # 23-24 — very high


# ── Public API ────────────────────────────────────────────────────────────────

def get_hotspots(user_lat=None, user_lon=None) -> list:
    """
    Return heatmap-ready hotspot list with current risk scores.
    Incorporates time-of-day multiplier and citizen report density.
    """
    hour = datetime.utcnow().hour + 5  # IST offset
    time_mult = _time_multiplier(hour % 24)
    hotspots = []
    for h in _BASE_HOTSPOTS:
        # Factor in citizen reports near this location
        report_count = get_report_count_near(h["lat"], h["lon"])
        report_boost = min(report_count * 0.03, 0.25)  # max +25% from reports
        risk = min(h["base_risk"] * time_mult + report_boost, 1.0)
        # Add small jitter for realism
        jitter = random.uniform(-0.01, 0.01)
        hotspots.append({
            "id":            h["id"],
            "zone":          h["zone"],
            "lat":           h["lat"] + jitter,
            "lon":           h["lon"] + jitter,
            "risk_score":    round(min(risk + jitter, 1.0), 3),
            "intensity":     round(risk, 3),
            "crime_types":   h["types"],
            "incident_count": report_count + random.randint(5, 80),
            "risk_label":    _risk_label(risk),
            "last_updated":  datetime.utcnow().isoformat(),
        })
    # Sort by risk descending
    hotspots.sort(key=lambda x: -x["risk_score"])
    return hotspots


def get_forecast(hours: int = 24) -> list:
    """
    Predictive risk layer for next 24h or 48h.
    Simulates time-shifted risk variation across hotspots.
    """
    if hours not in (24, 48):
        hours = 24
    current_hour = (datetime.utcnow().hour + 5) % 24  # IST
    forecast_points = []
    for h in _BASE_HOTSPOTS:
        window_risks = []
        for delta in range(0, hours, 3):
            future_hour = (current_hour + delta) % 24
            mult = _time_multiplier(future_hour)
            risk = min(h["base_risk"] * mult, 1.0)
            window_risks.append(risk)
        peak_risk   = max(window_risks)
        avg_risk    = sum(window_risks) / len(window_risks)
        peak_hour   = (current_hour + window_risks.index(peak_risk) * 3) % 24
        forecast_points.append({
            "id":          h["id"],
            "zone":        h["zone"],
            "lat":         h["lat"],
            "lon":         h["lon"],
            "avg_risk":    round(avg_risk, 3),
            "peak_risk":   round(peak_risk, 3),
            "peak_hour":   f"{peak_hour:02d}:00 IST",
            "risk_label":  _risk_label(peak_risk),
            "forecast_hrs": hours,
            "crime_types": h["types"],
        })
    forecast_points.sort(key=lambda x: -x["peak_risk"])
    return forecast_points


def get_threat_feed(limit: int = 20) -> list:
    """
    Real-time cyber threat intelligence feed (mock).
    Simulates live alerts from national cybercrime monitoring systems.
    """
    templates = [
        {"type": "UPI Fraud",        "color": "#FF3B5C", "severity": "HIGH"},
        {"type": "Phishing Attack",  "color": "#FF3B5C", "severity": "HIGH"},
        {"type": "SIM Swap",         "color": "#FFC857", "severity": "MEDIUM"},
        {"type": "OTP Scam",         "color": "#FFC857", "severity": "MEDIUM"},
        {"type": "Ransomware Alert", "color": "#FF3B5C", "severity": "HIGH"},
        {"type": "Loan App Fraud",   "color": "#FFC857", "severity": "MEDIUM"},
        {"type": "Fake Job Offer",   "color": "#00E5FF", "severity": "LOW"},
        {"type": "Romance Scam",     "color": "#FFC857", "severity": "MEDIUM"},
        {"type": "Investment Fraud", "color": "#FF3B5C", "severity": "HIGH"},
        {"type": "Tech Support Scam","color": "#FFC857", "severity": "MEDIUM"},
        {"type": "ATM Skimming",     "color": "#FF3B5C", "severity": "HIGH"},
        {"type": "Social Media Hack","color": "#00E5FF", "severity": "LOW"},
    ]
    cities = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai",
              "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"]
    now = datetime.utcnow()
    feed = []
    random.seed(int(now.timestamp() / 60))  # stable per minute
    for i in range(limit):
        tpl  = random.choice(templates)
        city = random.choice(cities)
        mins_ago = random.randint(1, 120)
        feed.append({
            "id":           f"THREAT-{i+1:04d}",
            "type":         tpl["type"],
            "city":         city,
            "description":  f"{tpl['type']} reported in {city} area",
            "severity":     tpl["severity"],
            "color":        tpl["color"],
            "time":         f"{mins_ago} min ago",
            "source":       "cybercrime.gov.in (simulated)",
            "timestamp":    (now - timedelta(minutes=mins_ago)).isoformat(),
        })
    feed.sort(key=lambda x: x["timestamp"], reverse=True)
    return feed


def submit_citizen_report(user_id, incident_type, description, lat, lon,
                           location_name="", severity="MEDIUM") -> dict:
    """Ingest a citizen cybercrime report and update heatmap density."""
    report_id = save_report(
        user_id=user_id,
        incident_type=incident_type,
        description=description,
        lat=lat,
        lon=lon,
        location_name=location_name,
        severity=severity,
    )
    return {
        "report_id":    report_id,
        "status":       "RECEIVED",
        "message":      "Your report has been submitted and will update the heatmap.",
        "incident_type": incident_type,
        "severity":     severity,
        "tracking_id":  f"RPT-{report_id:06d}",
    }


def get_gov_alerts(limit: int = 10) -> list:
    """
    Simulated cybercrime.gov.in advisory feed.
    INTEGRATION HOOK: Replace with real API call when available.
    Real endpoint: https://cybercrime.gov.in (API not publicly available yet)
    """
    advisories = [
        {"id": "GOV-2025-001", "title": "Warning: KYC Update Scam", "category": "Phishing",
         "issued_by": "CERT-In", "severity": "HIGH",
         "description": "Fraudsters posing as bank officials asking for KYC updates via SMS/email links.",
         "advisory_date": "2025-06-01", "affected_states": ["All India"]},
        {"id": "GOV-2025-002", "title": "Investment App Fraud Alert", "category": "Financial Fraud",
         "issued_by": "cybercrime.gov.in", "severity": "HIGH",
         "description": "Multiple fake investment apps promising high returns. 2,400 complaints in May 2025.",
         "advisory_date": "2025-05-28", "affected_states": ["Maharashtra", "Karnataka", "Delhi"]},
        {"id": "GOV-2025-003", "title": "FedEx Parcel Scam Active", "category": "Social Engineering",
         "issued_by": "MHA Cyber Division", "severity": "HIGH",
         "description": "Calls impersonating FedEx/customs officials demanding payment for 'seized parcels'.",
         "advisory_date": "2025-05-20", "affected_states": ["Gujarat", "Rajasthan", "UP"]},
        {"id": "GOV-2025-004", "title": "Digital Arrest Scam Warning", "category": "Extortion",
         "issued_by": "CERT-In", "severity": "HIGH",
         "description": "Scammers impersonating CBI/police demanding money to avoid 'digital arrest'.",
         "advisory_date": "2025-05-15", "affected_states": ["All India"]},
        {"id": "GOV-2025-005", "title": "OTP Bypass Malware Detected", "category": "Malware",
         "issued_by": "CERT-In", "severity": "MEDIUM",
         "description": "New Android malware variant intercepting OTPs from banking apps.",
         "advisory_date": "2025-05-10", "affected_states": ["All India"]},
        {"id": "GOV-2025-006", "title": "Fake Job Portal Alert", "category": "Recruitment Fraud",
         "issued_by": "cybercrime.gov.in", "severity": "MEDIUM",
         "description": "Fake job portals collecting advance fees and personal data from job seekers.",
         "advisory_date": "2025-05-05", "affected_states": ["Bihar", "UP", "MP"]},
        {"id": "GOV-2025-007", "title": "Romance Scam via Dating Apps", "category": "Social Media Fraud",
         "issued_by": "cybercrime.gov.in", "severity": "MEDIUM",
         "description": "Organized gangs using dating apps to extract money via emotional manipulation.",
         "advisory_date": "2025-04-28", "affected_states": ["All India"]},
        {"id": "GOV-2025-008", "title": "Crypto Investment Scam", "category": "Financial Fraud",
         "issued_by": "RBI Advisory", "severity": "HIGH",
         "description": "Fraudulent crypto trading platforms luring investors with fake profits.",
         "advisory_date": "2025-04-20", "affected_states": ["All India"]},
        {"id": "GOV-2025-009", "title": "AI Voice Cloning Fraud", "category": "Emerging Threat",
         "issued_by": "CERT-In", "severity": "HIGH",
         "description": "AI-generated voice clones of family members used to demand emergency money transfers.",
         "advisory_date": "2025-04-15", "affected_states": ["All India"]},
        {"id": "GOV-2025-010", "title": "QR Code Payment Scam", "category": "UPI Fraud",
         "issued_by": "NPCI Advisory", "severity": "MEDIUM",
         "description": "Fraudulent QR codes placed on payment terminals redirecting funds to scammers.",
         "advisory_date": "2025-04-10", "affected_states": ["Delhi", "NCR", "Mumbai"]},
    ]
    return advisories[:limit]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _risk_label(score: float) -> str:
    if score >= 0.70: return "CRITICAL"
    if score >= 0.50: return "HIGH"
    if score >= 0.30: return "MEDIUM"
    return "LOW"

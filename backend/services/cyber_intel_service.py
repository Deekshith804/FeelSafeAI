import os
import json
import logging
from datetime import datetime, timedelta

# Try to import groq, handle if somehow missing
try:
    from groq import Groq
except ImportError:
    Groq = None

logger = logging.getLogger("cyber_intel_service")

# Helper to check if key is set and valid
def is_groq_configured():
    key = os.environ.get("GROQ_API_KEY")
    if not key or key == "YOUR_GROQ_KEY":
        return False
    return True

def get_live_threat_feed():
    if not Groq or not is_groq_configured():
        logger.warning("Groq API key not set or 'groq' package not found. Using threat feed fallback.")
        return get_live_threat_feed_fallback()
        
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        prompt = (
            "Generate 8-10 real-looking AI-simulated cyber threat alerts based on public Indian cybercrime trends.\n"
            "The response must be a JSON object with an 'items' array. Each item must contain the following keys exactly:\n"
            "- title: A specific name of the scam or threat (e.g., 'UPI Cashback Phishing Campaign', 'Fake KYC SMS Extortion')\n"
            "- category: The category of the crime (e.g., 'UPI Fraud', 'Phishing', 'Ransomware', 'OTP Scam', 'Job Scam')\n"
            "- description: A detailed, realistic explanation of the threat, vectors, or tactics (e.g., 'Attackers are sending WhatsApp messages claiming the user has won UPI cashback...')\n"
            "- source: A realistic public source (e.g., 'NPCI / UPI Fraud Awareness', 'Delhi Police Cyber Cell', 'State Cyber Advisories', 'cybercrime.gov.in')\n"
            "- source_url: A realistic public URL related to the source (e.g., 'https://cybercrime.gov.in', 'https://www.npci.org.in')\n"
            "- location: A realistic Indian city or region (e.g., 'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'All India')\n"
            "- severity: Either 'HIGH', 'MEDIUM', or 'LOW'\n"
            "- time: A relative time string (e.g., '5 min ago', '15 min ago', '1 hour ago')\n"
            "- source_type: Use 'AI-Simulated' for these generated alerts.\n\n"
            "Ensure that the data is structured, realistic, and matches current cyber threats in India. Return ONLY the JSON object. Do not include markdown code block syntax (like ```json) in your raw response, just the JSON string."
        )
        
        # We can use llama-3.3-70b-versatile or llama3-8b-8192
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a cybersecurity expert intelligence feed system that outputs only structured JSON data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        res_text = chat_completion.choices[0].message.content
        data = json.loads(res_text)
        if "items" in data and isinstance(data["items"], list):
            # Assign fallback IDs if they are not generated
            for i, item in enumerate(data["items"]):
                if "id" not in item:
                    item["id"] = f"THREAT-AI-{i+1:04d}"
            return data["items"]
        
        logger.error("Invalid response format from Groq for threat feed. Fallback applied.")
        return get_live_threat_feed_fallback()
        
    except Exception as e:
        logger.error(f"Error fetching live threat feed from Groq: {e}. Fallback applied.")
        return get_live_threat_feed_fallback()


def get_national_portal_intel():
    if not Groq or not is_groq_configured():
        logger.warning("Groq API key not set or 'groq' package not found. Using national portal advisories fallback.")
        return get_national_portal_intel_fallback()
        
    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        
        prompt = (
            "Generate 5-6 cyber threat advisories or national portal intelligence based on public CERT-In, RBI, NPCI, or cybercrime.gov.in bulletins.\n"
            "The response must be a JSON object with an 'items' array. Each item must contain the following keys exactly:\n"
            "- title: The official or realistic advisory title (e.g., 'Advisory on Android banking trojan targeting Indian users')\n"
            "- category: The category of the advisory (e.g., 'Malware Alert', 'Advisory', 'Financial Alert', 'Phishing Bulletin')\n"
            "- description: A detailed explanation of the threat, affected systems/users, and safety steps (e.g., 'CERT-In has issued a warning regarding a new Android banking malware...')\n"
            "- source: The issuing agency (e.g., 'CERT-In', 'RBI Cyber Alerts', 'NPCI Advisory', 'cybercrime.gov.in')\n"
            "- source_url: The actual official URL or portal link for verification (e.g., 'https://www.cert-in.org.in', 'https://cybercrime.gov.in', 'https://rbi.org.in')\n"
            "- location: The geographic scope (e.g., 'All India', 'Delhi', 'Maharashtra')\n"
            "- severity: Either 'HIGH', 'MEDIUM', or 'LOW'\n"
            "- time: The publication date or relative time (e.g., 'June 5, 2026', '2 days ago')\n"
            "- source_type: If the link is an actual official verification portal link, use 'Official Source', otherwise use 'AI-Simulated'.\n\n"
            "Ensure that the alerts are highly realistic, informative, and formatted as a JSON object. Return ONLY the JSON object. Do not include markdown code block syntax (like ```json) in your raw response, just the JSON string."
        )
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a cybersecurity expert intelligence feed system that outputs only structured JSON data."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        res_text = chat_completion.choices[0].message.content
        data = json.loads(res_text)
        if "items" in data and isinstance(data["items"], list):
            for i, item in enumerate(data["items"]):
                if "id" not in item:
                    item["id"] = f"GOV-AI-{i+1:04d}"
            return data["items"]
            
        logger.error("Invalid response format from Groq for national portal intel. Fallback applied.")
        return get_national_portal_intel_fallback()
        
    except Exception as e:
        logger.error(f"Error fetching national portal intel from Groq: {e}. Fallback applied.")
        return get_national_portal_intel_fallback()


# ── Fallback Implementations (Reuses cybercrime_service static mock data) ─────

def get_live_threat_feed_fallback():
    try:
        from services.cybercrime_service import get_threat_feed
        mock_threats = get_threat_feed(10)
        items = []
        for i, t in enumerate(mock_threats):
            items.append({
                "id": t.get("id", f"THREAT-FB-{i+1:04d}"),
                "title": f"{t['type']} Incident Alert",
                "category": t["type"],
                "description": t["description"],
                "source": t["source"].replace(" (simulated)", ""),
                "source_url": "https://cybercrime.gov.in",
                "location": t["city"],
                "severity": t["severity"],
                "time": t["time"],
                "source_type": "AI-Simulated"
            })
        return items
    except Exception as e:
        logger.error(f"Threat feed fallback failed: {e}")
        return []

def get_national_portal_intel_fallback():
    try:
        from services.cybercrime_service import get_gov_alerts
        mock_alerts = get_gov_alerts(5)
        items = []
        for i, a in enumerate(mock_alerts):
            # Map affected states
            states = a.get("affected_states", ["All India"])
            location = ", ".join(states) if isinstance(states, list) else str(states)
            items.append({
                "id": a.get("id", f"GOV-FB-{i+1:04d}"),
                "title": a["title"],
                "category": a["category"],
                "description": a["description"],
                "source": a["issued_by"],
                "source_url": "https://cybercrime.gov.in" if "cybercrime" in a["issued_by"].lower() else "https://www.cert-in.org.in",
                "location": location,
                "severity": a["severity"],
                "time": a["advisory_date"],
                "source_type": "Official Source"
            })
        return items
    except Exception as e:
        logger.error(f"National portal intel fallback failed: {e}")
        return []

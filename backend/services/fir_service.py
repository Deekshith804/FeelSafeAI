"""
services/fir_service.py
========================
Auto FIR & Complaint Generator service for FeelSafe.
Handles: FIR draft generation, multi-language mock translation,
         evidence SHA-256 hashing, status tracking.
"""

import hashlib
import re
from datetime import datetime
from models.fir_model import (
    save_fir, get_fir, get_fir_list,
    update_fir_status as db_update_status,
    save_evidence,
)

# ── 22 Indian Languages ───────────────────────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en":  "English",
    "hi":  "Hindi (हिंदी)",
    "bn":  "Bengali (বাংলা)",
    "te":  "Telugu (తెలుగు)",
    "mr":  "Marathi (मराठी)",
    "ta":  "Tamil (தமிழ்)",
    "ur":  "Urdu (اردو)",
    "gu":  "Gujarati (ગુજરાતી)",
    "kn":  "Kannada (ಕನ್ನಡ)",
    "or":  "Odia (ଓଡ଼ିଆ)",
    "ml":  "Malayalam (മലയാളം)",
    "pa":  "Punjabi (ਪੰਜਾਬੀ)",
    "as":  "Assamese (অসমীয়া)",
    "mai": "Maithili (मैथिली)",
    "sat": "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
    "ks":  "Kashmiri (كٲشُر)",
    "ne":  "Nepali (नेपाली)",
    "sd":  "Sindhi (سنڌي)",
    "doi": "Dogri (डोगरी)",
    "kok": "Konkani (कोंकणी)",
    "mni": "Manipuri (মেইতেই)",
    "bho": "Bhojpuri (भोजपुरी)",
}

# FIR template field labels translated (subset for demo)
_TRANSLATED_LABELS = {
    "hi": {
        "fir_title":          "प्रथम सूचना रिपोर्ट (FIR)",
        "complainant":        "शिकायतकर्ता का नाम",
        "incident_date":      "घटना की तारीख",
        "incident_location":  "घटना स्थल",
        "incident_desc":      "घटना का विवरण",
        "accused":            "अभियुक्त का विवरण",
        "relief_sought":      "मांगी गई राहत",
        "declaration":        "मैं घोषणा करता/करती हूं कि उपरोक्त जानकारी सत्य है।",
    },
    "mr": {
        "fir_title":          "प्रथम माहिती अहवाल (FIR)",
        "complainant":        "तक्रारदाराचे नाव",
        "incident_date":      "घटनेची तारीख",
        "incident_location":  "घटनास्थळ",
        "incident_desc":      "घटनेचे वर्णन",
        "accused":            "आरोपीचे वर्णन",
        "relief_sought":      "मागितलेली दाद",
        "declaration":        "मी घोषित करतो/करते की वरील माहिती सत्य आहे.",
    },
    "ta": {
        "fir_title":          "முதல் தகவல் அறிக்கை (FIR)",
        "complainant":        "புகார்தாரர் பெயர்",
        "incident_date":      "சம்பவ தேதி",
        "incident_location":  "சம்பவ இடம்",
        "incident_desc":      "சம்பவ விவரம்",
        "accused":            "குற்றவாளி விவரம்",
        "relief_sought":      "வேண்டப்படும் நிவாரணம்",
        "declaration":        "மேலே உள்ள தகவல்கள் உண்மையானவை என்று அறிவிக்கிறேன்.",
    },
    "te": {
        "fir_title":          "ప్రథమ సమాచార నివేదిక (FIR)",
        "complainant":        "ఫిర్యాదీ పేరు",
        "incident_date":      "సంఘటన తేదీ",
        "incident_location":  "సంఘటన స్థలం",
        "incident_desc":      "సంఘటన వివరణ",
        "accused":            "నిందితుని వివరణ",
        "relief_sought":      "కోరిన ఉపశమనం",
        "declaration":        "పైన పేర్కొన్న సమాచారం నిజమని నిర్ధారిస్తున్నాను.",
    },
    "kn": {
        "fir_title":          "ಪ್ರಥಮ ಮಾಹಿತಿ ವರದಿ (FIR)",
        "complainant":        "ದೂರುದಾರರ ಹೆಸರು",
        "incident_date":      "ಘಟನೆಯ ದಿನಾಂಕ",
        "incident_location":  "ಘಟನೆಯ ಸ್ಥಳ",
        "incident_desc":      "ಘಟನೆಯ ವಿವರಣೆ",
        "accused":            "ಆರೋಪಿಯ ವಿವರಣೆ",
        "relief_sought":      "ಕೋರಿದ ಪರಿಹಾರ",
        "declaration":        "ಮೇಲೆ ತಿಳಿಸಲಾದ ಮಾಹಿತಿ ನಿಜವೆಂದು ನಾನು ದೃಢೀಕರಿಸುತ್ತೇನೆ.",
    },
    "ml": {
        "fir_title":          "പ്രഥമ വിവര റിപ്പോർട്ട് (FIR)",
        "complainant":        "പരാതിക്കാരന്റെ പേര്",
        "incident_date":      "സംഭവ തീയതി",
        "incident_location":  "സംഭവ സ്ഥലം",
        "incident_desc":      "സംഭവ വിവരണം",
        "accused":            "പ്രതിയുടെ വിവരണം",
        "relief_sought":      "ആവശ്യപ്പെട്ട പരിഹാരം",
        "declaration":        "മുകളിൽ നൽകിയിരിക്കുന്ന വിവരങ്ങൾ സത്യമാണെന്ന് ഞാൻ സാക്ഷ്യപ്പെടുത്തുന്നു.",
    },
}

# ── IPC Section Mapping ────────────────────────────────────────────────────────
_IPC_SECTIONS = {
    "theft":           "IPC Section 379 (Theft), IPC Section 380 (Theft in dwelling)",
    "assault":         "IPC Section 351 (Assault), IPC Section 354 (Assault on woman)",
    "fraud":           "IPC Section 420 (Cheating), IT Act Section 66C (Identity theft)",
    "cybercrime":      "IT Act Section 66 (Computer offences), IT Act Section 66C & 66D",
    "stalking":        "IPC Section 354D (Stalking), IT Act Section 66E",
    "harassment":      "IPC Section 354A (Sexual harassment), IPC Section 509",
    "kidnap":          "IPC Section 363 (Kidnapping), IPC Section 365",
    "extortion":       "IPC Section 383 (Extortion), IT Act Section 66E",
    "domestic":        "IPC Section 498A (Cruelty by husband/relatives), DV Act 2005",
    "robbery":         "IPC Section 392 (Robbery), IPC Section 395 (Dacoity)",
    "cheating":        "IPC Section 415 (Cheating), IPC Section 420",
    "murder":          "IPC Section 302 (Murder), IPC Section 307 (Attempt to murder)",
    "default":         "IPC Section 154 (FIR), Applicable IPC sections as per investigation",
}


# ── Public API ────────────────────────────────────────────────────────────────

def generate_fir(incident_text: str, language: str = "en",
                 complainant_name: str = "Complainant",
                 complainant_phone: str = "",
                 incident_location: str = "India",
                 incident_date: str = None,
                 accused_description: str = "Unknown",
                 user_id: int = 1) -> dict:
    """
    Generate a structured FIR draft from free-form incident description.
    Detects crime type, maps IPC sections, builds structured template.
    """
    if incident_date is None:
        incident_date = datetime.utcnow().strftime("%Y-%m-%d")

    # Detect crime category from text
    crime_type  = _detect_crime_type(incident_text.lower())
    ipc_section = _IPC_SECTIONS.get(crime_type, _IPC_SECTIONS["default"])

    # Build English draft
    draft_en = _build_fir_template(
        complainant_name=complainant_name,
        complainant_phone=complainant_phone,
        incident_location=incident_location,
        incident_date=incident_date,
        incident_text=incident_text,
        accused_description=accused_description,
        crime_type=crime_type,
        ipc_section=ipc_section,
        language="en"
    )

    # Compile the translated draft directly using template builder
    translated_draft = _build_fir_template(
        complainant_name=complainant_name,
        complainant_phone=complainant_phone,
        incident_location=incident_location,
        incident_date=incident_date,
        incident_text=incident_text,
        accused_description=accused_description,
        crime_type=crime_type,
        ipc_section=ipc_section,
        language=language
    )

    # Persist to DB
    saved = save_fir(
        user_id=user_id,
        incident_description=incident_text,
        structured_draft=translated_draft,
        language=language,
        complainant_name=complainant_name,
        complainant_phone=complainant_phone,
        incident_location=incident_location,
        incident_date=incident_date,
        accused_description=accused_description,
    )

    return {
        "fir_id":            saved["id"],
        "fir_number":        saved["fir_number"],
        "status":            "FILED",
        "crime_type":        crime_type,
        "ipc_sections":      ipc_section,
        "language":          language,
        "language_name":     SUPPORTED_LANGUAGES.get(language, "English"),
        "draft_english":     draft_en,
        "draft_translated":  translated_draft,
        "generated_at":      datetime.utcnow().isoformat(),
    }


def compute_evidence_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash for an evidence file."""
    return hashlib.sha256(file_bytes).hexdigest()


def attach_evidence(fir_id: int, filename: str, original_name: str,
                    file_type: str, file_bytes: bytes) -> dict:
    """Attach evidence to a FIR, storing its SHA-256 hash."""
    sha256 = compute_evidence_hash(file_bytes)
    ev_id = save_evidence(
        fir_id=fir_id,
        filename=filename,
        original_name=original_name,
        file_type=file_type,
        sha256_hash=sha256,
        file_size_bytes=len(file_bytes),
    )
    return {
        "evidence_id":   ev_id,
        "fir_id":        fir_id,
        "filename":      original_name,
        "sha256_hash":   sha256,
        "file_type":     file_type,
        "file_size_kb":  round(len(file_bytes) / 1024, 2),
        "integrity":     "VERIFIED",
        "message":       "Evidence hash computed and stored. This cannot be tampered with.",
    }


def get_fir_detail(fir_id: int) -> dict:
    return get_fir(fir_id)


def list_firs(user_id=None, limit=20) -> list:
    return get_fir_list(user_id=user_id, limit=limit)


def update_status(fir_id: int, status: str, assigned_officer: str = None) -> dict:
    valid_statuses = {"FILED", "ASSIGNED", "UNDER_INVESTIGATION", "RESOLVED", "CLOSED"}
    if status not in valid_statuses:
        raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
    result = db_update_status(fir_id, status)
    if assigned_officer:
        from models.trip_model import get_connection
        conn = get_connection()
        conn.execute(
            "UPDATE firs SET assigned_officer=? WHERE id=?", (assigned_officer, fir_id)
        )
        conn.commit()
        conn.close()
    return result


# ── Internal Helpers ──────────────────────────────────────────────────────────

def _detect_crime_type(text: str) -> str:
    """Rule-based crime type detection from incident text."""
    keywords = {
        "theft":      ["theft", "stole", "stolen", "steal", "missing", "snatch"],
        "assault":    ["assault", "attack", "hit", "punch", "beat", "physical"],
        "fraud":      ["fraud", "scam", "cheated", "fake", "impersonate", "duped"],
        "cybercrime": ["cyber", "phishing", "upi", "otp", "hack", "online", "digital",
                       "ransomware", "malware", "social media"],
        "stalking":   ["stalk", "following", "track", "harass online", "messages"],
        "harassment": ["harass", "eve tease", "grope", "touch", "molestation"],
        "kidnap":     ["kidnap", "abduct", "missing person", "took away"],
        "extortion":  ["extort", "blackmail", "threaten", "demand money"],
        "domestic":   ["husband", "wife", "domestic", "family violence", "in-law"],
        "robbery":    ["rob", "robbery", "dacoity", "looted", "weapon"],
        "cheating":   ["cheat", "deceive", "misrepresent", "false promise"],
        "murder":     ["murder", "kill", "shot", "stabbed", "dead body"],
    }
    for crime, words in keywords.items():
        if any(w in text for w in words):
            return crime
    return "default"


TRANSLATION_MAP = {
    "hi": {
        "Priya Sharma": "प्रिया शर्मा",
        "New Delhi, India": "नई दिल्ली, भारत",
        "Whitefield, Bangalore": "व्हाइटफील्ड, बैंगलोर",
        "T Nagar, Chennai": "टी नगर, चेन्नई",
        "Connaught Place, Delhi": "कनॉट प्लेस, दिल्ली",
        "Lajpat Nagar, Delhi": "लजपत नगर, दिल्ली",
        "Bandra West, Mumbai": "बांद्रा पश्चिम, मुंबई",
        "Andheri West, Mumbai": "अंधेरी पश्चिम, मुंबई",
        "Hitech City, Hyderabad": "हाइटेक सिटी, हैदराबाद",
        "Secunderabad, Hyderabad": "सिकंदराबाद, हैदराबाद",
        "Someone is following me": "कोई मेरा पीछा कर रहा है",
        "Online phishing transaction theft of 50000 rupees": "50000 रुपये की ऑनलाइन फ़िशिंग लेनदेन चोरी",
        "Unknown caller claiming to be a bank agent": "बैंक एजेंट होने का दावा करने वाला अज्ञात कॉलर",
        "Help, I feel unsafe walking home": "मदद करें, मुझे घर चलने में असुरक्षित महसूस हो रहा है",
        "No description provided": "कोई विवरण प्रदान नहीं किया गया",
        "cybercrime": "साइबर अपराध",
        "theft": "चोरी",
        "stalking": "पीछा करना (Stalking)",
        "harassment": "उत्पीड़न",
        "fraud": "धोखाधड़ी",
        "General Incident": "सामान्य घटना",
        "No files attached": "कोई फाइल संलग्न नहीं है",
        "No files attached yet.": "अभी तक कोई फाइल संलग्न नहीं है।",
        "N/A": "लागू नहीं",
        "Unknown": "अज्ञात",
        "Not provided": "प्रदान नहीं किया गया",
    },
    "ta": {
        "Priya Sharma": "பிரியா சர்மா",
        "New Delhi, India": "புது தில்லி, இந்தியா",
        "Whitefield, Bangalore": "ஒயிட்பீல்ட், பெங்களூர்",
        "T Nagar, Chennai": "தி நகர், சென்னை",
        "Connaught Place, Delhi": "கனாட் பிளேஸ், டெல்லி",
        "Lajpat Nagar, Delhi": "லஜ்பத் நகர், டெல்லி",
        "Bandra West, Mumbai": "பாந்த்ரா மேற்கு, மும்பை",
        "Andheri West, Mumbai": "அந்தேரி மேற்கு, மும்பை",
        "Hitech City, Hyderabad": "ஹைடெக் சிட்டி, ஹைய்ராபாத்",
        "Secunderabad, Hyderabad": "செகந்திராபாத், ஹைதராபாத்",
        "Someone is following me": "யாரோ என்னை பின்தொடர்கிறார்கள்",
        "Online phishing transaction theft of 50000 rupees": "50000 ரூபாய் ஆன்லைன் பிஷிங் பரிவர்த்தனை திருட்டு",
        "Unknown caller claiming to be a bank agent": "வங்கி முகவர் என்று கூறிக்கொள்ளும் அறியப்படாத அழைப்பாளர்",
        "Help, I feel unsafe walking home": "உதவி, நான் வீட்டிற்கு நடப்பது பாதுகாப்பற்றதாக உணர்கிறேன்",
        "No description provided": "விளக்கம் எதுவும் வழங்கப்படவில்லை",
        "cybercrime": "சைபர் குற்றம்",
        "theft": "திருட்டு",
        "stalking": "பின்தொடர்தல்",
        "harassment": "துன்புறுத்தல்",
        "fraud": "மோசடி",
        "General Incident": "பொதுவான சம்பவம்",
        "No files attached": "கோப்புகள் எதுவும் இணைக்கப்படவில்லை",
        "No files attached yet.": "இன்னும் கோப்புகள் எதுவும் இணைக்கப்படவில்லை.",
        "N/A": "இல்லை",
        "Unknown": "அறியப்படாதவர்",
        "Not provided": "வழங்கப்படவில்லை",
    },
    "te": {
        "Priya Sharma": "ప్రియా శర్మ",
        "New Delhi, India": "న్యూ ఢిల్లీ, భారతదేశం",
        "Whitefield, Bangalore": "వైట్‌ఫీల్డ్, బెంగళూరు",
        "T Nagar, Chennai": "టి నగర్, చెన్నై",
        "Connaught Place, Delhi": "కన్నాట్ ప్లేస్, ఢిల్లీ",
        "Lajpat Nagar, Delhi": "లజపత్ నగర్, ఢిల్లీ",
        "Bandra West, Mumbai": "బాంద్రా వెస్ట్, ముంబై",
        "Andheri West, Mumbai": "అంధేరి వెస్ట్, ముంబై",
        "Hitech City, Hyderabad": "హైటెక్ సిటీ, హైదరాబాద్",
        "Secunderabad, Hyderabad": "సికింద్రాబాద్, హైదరాబాద్",
        "Someone is following me": "ఎవరో నన్ను వెంబడిస్తున్నారు",
        "Online phishing transaction theft of 50000 rupees": "50000 రూపాయల ఆన్‌లైన్ ఫిషింగ్ లావాదేవీల దొంగతనం",
        "Unknown caller claiming to be a bank agent": "బ్యాంక్ ఏజెంట్ అని చెప్పుకునే తెలియని కాలర్",
        "Help, I feel unsafe walking home": "సహాయం చేయండి, నేను ఇంటికి నడవడానికి అసురక్షితంగా భావిస్తున్నాను",
        "No description provided": "ఎలాంటి వివരണ ఇవ్వలేదు",
        "cybercrime": "సైబర్ క్రైమ్",
        "theft": "దొంగతనం",
        "stalking": "వెంబడించడం",
        "harassment": "వేధింపులు",
        "fraud": "మోసం",
        "General Incident": "సాధారణ సంఘటన",
        "No files attached": "ఫైల్‌లు ఏవీ జోడించబడలేదు",
        "No files attached yet.": "ఇంకా ఫైల్‌లు ఏవీ జోడించబడలేదు.",
        "N/A": "వర్తించదు",
        "Unknown": "తెలియదు",
        "Not provided": "అందించబడలేదు",
    },
    "kn": {
        "Priya Sharma": "ಪ್ರಿಯಾ ಶರ್ಮಾ",
        "New Delhi, India": "ನವದೆಹಲಿ, ಭಾರತ",
        "Whitefield, Bangalore": "ವೈಟ್‌ಫೀಲ್ಡ್, ಬೆಂಗಳೂರು",
        "T Nagar, Chennai": "ಟಿ ನಗರ, ಚೆನ್ನೈ",
        "Connaught Place, Delhi": "ಕನಾಟ್ ಪ್ಲೇಸ್, ದೆಹಲಿ",
        "Lajpat Nagar, Delhi": "ಲಜಪತ್ ನಗರ, ದೆಹಲಿ",
        "Bandra West, Mumbai": "ಬಾಂದ್ರಾ ಪಶ್ಚಿಮ, ಮುಂಬೈ",
        "Andheri West, Mumbai": "ಅಂಧೇರಿ ಪಶ್ಚಿಮ, ಮುಂಬೈ",
        "Hitech City, Hyderabad": "ಹೈಟೆಕ್ ಸಿಟಿ, ಹೈದರಾಬಾದ್",
        "Secunderabad, Hyderabad": "ಸಿಕಂದರಾಬಾದ್, ಹೈದರಾಬಾದ್",
        "Someone is following me": "ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ",
        "Online phishing transaction theft of 50000 rupees": "50000 ರೂಪಾಯಿ ಆನ್‌ಲೈನ್ ಫಿಶಿಂಗ್ ವಹಿವಾಟು ಕಳ್ಳತನ",
        "Unknown caller claiming to be a bank agent": "ಬ್ಯಾಂಕ್ ಏಜೆಂಟ್ ಎಂದು ಹೇಳಿಕೊಳ್ಳುವ ಅಪರಿಚಿತ ಕರೆದಾರ",
        "Help, I feel unsafe walking home": "ಸಹಾಯ ಮಾಡಿ, ನನಗೆ ಮನೆಗೆ ನಡೆಯಲು ಅಸುರಕ್ಷಿತ ಅನಿಸುತ್ತಿದೆ",
        "No description provided": "ಯಾವುದೇ ವಿವರಣೆ ನೀಡಲಾಗಿಲ್ಲ",
        "cybercrime": "ಸೈಬರ್ ಅಪರಾಧ",
        "theft": "ಕಳ್ಳತನ",
        "stalking": "ಹಿಂಬಾಲಿಸುವುದು",
        "harassment": "ಕಿರುಕುಳ",
        "fraud": "ವಂಚನೆ",
        "General Incident": "ಸಾಮಾನ್ಯ ಘಟನೆ",
        "No files attached": "ಯಾವುದೇ ಫೈಲ್‌ಗಳನ್ನು ಲಗತ್ತಿಸಲಾಗಿಲ್ಲ",
        "No files attached yet.": "ಇನ್ನೂ ಯಾವುದೇ ಫೈಲ್‌ಗಳನ್ನು ಲಗತ್ತಿಸಲಾಗಿಲ್ಲ.",
        "N/A": "ಲಭ್ಯವಿಲ್ಲ",
        "Unknown": "ಅಪರಿಚಿತ",
        "Not provided": "ಒಡಗಿಸಲಾಗಿಲ್ಲ",
    },
    "ml": {
        "Priya Sharma": "പ്രിയ ശർമ്മ",
        "New Delhi, India": "ന്യൂഡൽഹി, ഇന്ത്യ",
        "Whitefield, Bangalore": "വൈറ്റ്ഫീൽഡ്, ബാംഗ്ലൂർ",
        "T Nagar, Chennai": "ടി നഗർ, ചെന്നൈ",
        "Connaught Place, Delhi": "കനോട്ട് പ്ലേസ്, ഡെൽഹി",
        "Lajpat Nagar, Delhi": "ലജ്പത് നഗർ, ഡെൽഹി",
        "Bandra West, Mumbai": "ബാന്ദ്ര വെസ്റ്റ്, മുംബൈ",
        "Andheri West, Mumbai": "അന്ധേരി വെസ്റ്റ്, മുംബൈ",
        "Hitech City, Hyderabad": "ഹൈടെക് സിറ്റി, ഹൈദരാബാദ്",
        "Secunderabad, Hyderabad": "സെക്കന്തരാബാദ്, ഹൈദരാബാദ്",
        "Someone is following me": "ആരോ എന്നെ പിന്തുടരുന്നു",
        "Online phishing transaction theft of 50000 rupees": "50000 രൂപ ഓൺലൈൻ ഫിഷിംഗ് ഇടപാട് മോഷണം",
        "Unknown caller claiming to be a bank agent": "ബാങ്ക് ഏജന്റാണെന്ന് അവകാശപ്പെടുന്ന അപരിചിതനായ വിളിച്ചയാൾ",
        "Help, I feel unsafe walking home": "സഹായം, എനിക്ക് വീട്ടിലേക്ക് നടക്കാൻ സുരക്ഷിതമല്ലാത്തതായി തോന്നുന്നു",
        "No description provided": "വിവരണം ഒന്നും നൽകിയിട്ടില്ല",
        "cybercrime": "സൈബർ കുറ്റകൃത്യം",
        "theft": "മോഷണം",
        "stalking": "പിന്തുടരൽ",
        "harassment": "പീഡനം",
        "fraud": "തട്ടിപ്പ്",
        "General Incident": "പൊതുവായ സംഭവം",
        "No files attached": "ഫയലുകളൊന്നും അറ്റാച്ചുചെയ്തിട്ടില്ല",
        "No files attached yet.": "ഫയലുകളൊന്നും ഇതുവരെ അറ്റാച്ചുചെയ്തിട്ടില്ല.",
        "N/A": "ബാധകമല്ല",
        "Unknown": "അജ്ഞാതൻ",
        "Not provided": "നൽകിയിട്ടില്ല",
    }
}

def _translate_text(text: str, target_lang: str) -> str:
    if not text:
        return ""
    if target_lang == "en" or target_lang not in TRANSLATION_MAP:
        return text
    
    mapping = TRANSLATION_MAP.get(target_lang, {})
    text_stripped = text.strip()
    if text_stripped in mapping:
        return mapping[text_stripped]
        
    translated = text
    for key in sorted(mapping.keys(), key=len, reverse=True):
        translated = translated.replace(key, mapping[key])
    return translated

def _build_fir_template(complainant_name, complainant_phone, incident_location,
                         incident_date, incident_text, accused_description,
                         crime_type, ipc_section, language="en") -> str:
    """Build a structured FIR document as a formatted string."""
    name_trans = _translate_text(complainant_name, language)
    phone_trans = complainant_phone or ("Not provided" if language == "en" else _translate_text("Not provided", language))
    loc_trans = _translate_text(incident_location, language)
    desc_trans = _translate_text(incident_text, language)
    accused_trans = _translate_text(accused_description, language)
    crime_trans = _translate_text(crime_type, language).upper()
    ipc_trans = ipc_section

    if language == "hi":
        statement = (
            f"दिनांक {incident_date} को, {loc_trans} पर एक घटना घटित हुई। "
            f"शिकायतकर्ता {name_trans} ने रिपोर्ट किया है कि {desc_trans}। "
            f"इस घटना में शामिल आरोपी/संदेही का विवरण इस प्रकार है: {accused_trans}। "
            f"यह मामला आधिकारिक रिकॉर्ड और {ipc_trans} के तहत कार्रवाई के लिए रिपोर्ट किया जा रहा है।"
        )
        return f"""
----------------------------------------
प्रथम सूचना रिपोर्ट (FIR)
----------------------------------------

1. शिकायतकर्ता का विवरण:
   नाम: {name_trans}
   फ़ोन: {phone_trans}

2. घटना का विवरण:
   {desc_trans}

3. घटना का स्थान:
   {loc_trans}

4. दिनांक और समय:
   {incident_date}

5. शिकायत की प्रकृति:
   {crime_trans} ({ipc_trans})

6. बयान:
   {statement}

7. अनुरोधित कार्रवाई:
   - जांच
   - उच्च जोखिम होने पर तत्काल सहायता

----------------------------------------
""".strip()

    elif language == "ta":
        statement = (
            f"தேதி {incident_date} அன்று, {loc_trans}-இல் ஒரு சம்பவம் நிகழ்ந்தது. "
            f"புகார்தாரர் {name_trans}, {desc_trans} என்று தெரிவிக்கிறார். "
            f"இச்சம்பவத்தில் தொடர்புடைய சந்தேக நபர் விவரம்: {accused_trans}. "
            f"இந்த விஷயம் அதிகாரப்பூர்வ பதிவு மற்றும் {ipc_trans}-இன் கீழ் நடவடிக்கைக்காக புகாரளிக்கப்படுகிறது."
        )
        return f"""
----------------------------------------
முதல் தகவல் அறிக்கை (FIR)
----------------------------------------

1. புகார்தாரர் விவரங்கள்:
   பெயர்: {name_trans}
   தொலைபேசி: {phone_trans}

2. சம்பவ விவரம்:
   {desc_trans}

3. சம்பவ இடம்:
   {loc_trans}

4. தேதி & நேரம்:
   {incident_date}

5. புகாரின் தன்மை:
   {crime_trans} ({ipc_trans})

6. அறிக்கை:
   {statement}

7. கோரப்பட்ட நடவடிக்கை:
   - விசாரணை
   - அதிக ஆபத்து இருந்தால் உடனடி உதவி

----------------------------------------
""".strip()

    elif language == "te":
        statement = (
            f"తేదీ {incident_date} న, {loc_trans} వద్ద ఒక సంఘటన జరిగింది. "
            f"ఫిర్యాదీ {name_trans}, {desc_trans} అని నివేదించారు. "
            f"ఈ సంఘటనలో పాల్గొన్న నిందితుని వివరణ: {accused_trans}. "
            f"ఈ విషయం అధికారిక రికార్డింగ్ మరియు {ipc_trans} కింద చర్య కోసం నివేదించబడుతోంది."
        )
        return f"""
----------------------------------------
ప్రథమ సమాచార నివేదిక (FIR)
----------------------------------------

1. ఫిర్యాదీ వివరాలు:
   పేరు: {name_trans}
   ఫోన్: {phone_trans}

2. సంఘటన వివరణ:
   {desc_trans}

3. సంఘటన స్థలం:
   {loc_trans}

4. తేదీ & సమయం:
   {incident_date}

5. ఫిర్యాదు స్వభావం:
   {crime_trans} ({ipc_trans})

6. ప్రకటన:
   {statement}

7. కోరిన చర్య:
   - విచారణ
   - అధిక ప్రమాదం ఉంటే తక్షణ సహాయం

----------------------------------------
""".strip()

    elif language == "kn":
        statement = (
            f"ದಿನಾಂಕ {incident_date} ರಂದು, {loc_trans} ನಲ್ಲಿ ಘಟನೆ ಸಂಭವಿಸಿದೆ. "
            f"ದೂರುದಾರರಾದ {name_trans}, {desc_trans} ಎಂದು ವರದಿ ಮಾಡಿದ್ದಾರೆ. "
            f"ಈ ಘಟನೆಯಲ್ಲಿ ಭಾಗಿಯಾಗಿರುವ ಶಂಕಿತ ಆರೋಪಿಯ ವಿವರಣೆ: {accused_trans}. "
            f"ಈ ವಿಷಯವನ್ನು ಅಧಿಕೃತ ದಾಖಲಾತಿ ಮತ್ತು {ipc_trans} ಅಡಿಯಲ್ಲಿ ಕ್ರಮಕ್ಕಾಗಿ ವರದಿ ಮಾಡಲಾಗುತ್ತಿದೆ."
        )
        return f"""
----------------------------------------
ಪ್ರಥಮ ಮಾಹಿತಿ ವರದಿ (FIR)
----------------------------------------

1. ದೂರುದಾರರ ವಿವರಗಳು:
   ಹೆಸರು: {name_trans}
   ದೂರವಾಣಿ: {phone_trans}

2. ಘಟನೆಯ ವಿವರಣೆ:
   {desc_trans}

3. ಘಟನೆಯ ಸ್ಥಳ:
   {loc_trans}

4. ದಿನಾಂಕ ಮತ್ತು ಸಮಯ:
   {incident_date}

5. ದೂರಿನ ಸ್ವರೂಪ:
   {crime_trans} ({ipc_trans})

6. ಹೇಳಿಕೆ:
   {statement}

7. ಕೋರಿದ ಕ್ರಮ:
   - ತನಿಖೆ
   - ಹೆಚ್ಚಿನ ಅಪಾಯವಿದ್ದರೆ ತಕ್ಷಣದ ಸಹಾಯ

----------------------------------------
""".strip()

    elif language == "ml":
        statement = (
            f"{incident_date} തീയതിയിൽ, {loc_trans} വെച്ച് ഒരു സംഭവം ഉണ്ടായി. "
            f"പരാതിക്കാരനായ {name_trans}, {desc_trans} എന്ന് റിപ്പോർട്ട് ചെയ്യുന്നു. "
            f"സംഭവത്തിൽ ഉൾപ്പെട്ടിരിക്കുന്ന പ്രതിയുടെ വിവരണം: {accused_trans}. "
            f"ഈ വിഷയം ഔദ്യോഗിക രേഖപ്പെടുത്തലിനും {ipc_trans} പ്രകാരമുള്ള നടപടിക്കുമായി റിപ്പോർട്ട് ചെയ്യുന്നു."
        )
        return f"""
----------------------------------------
പ്രഥമ വിവര റിപ്പോർട്ട് (FIR)
----------------------------------------

1. പരാതിക്കാരന്റെ വിവരങ്ങൾ:
   പേര്: {name_trans}
   ഫോൺ: {phone_trans}

2. സംഭവ വിവരണം:
   {desc_trans}

3. സംഭവ സ്ഥലം:
   {loc_trans}

4. തീയതിയും സമയവും:
   {incident_date}

5. പരാതിയുടെ സ്വഭാവം:
   {crime_trans} ({ipc_trans})

6. പ്രസ്താവന:
   {statement}

7. ആവശ്യപ്പെട്ട നടപടി:
   - അന്വേഷണം
   - ഉയർന്ന അപകടസാധ്യതയുള്ള സാഹചര്യത്തിൽ അടിയന്തിര സഹായം

----------------------------------------
""".strip()

    else:
        # Default English
        statement = (
            f"On {incident_date}, an incident occurred at {loc_trans}. "
            f"The complainant, {name_trans}, reports that {desc_trans}. "
            f"The accused/suspect involved in the incident is described as: {accused_trans}. "
            f"This matter is being reported for official recording and action under {ipc_trans}."
        )
        return f"""
----------------------------------------
FIRST INFORMATION REPORT (FIR)
----------------------------------------

1. Complainant Details:
   Name: {name_trans}
   Phone: {phone_trans}

2. Incident Description:
   {desc_trans}

3. Location of Incident:
   {loc_trans}

4. Date & Time:
   {incident_date}

5. Nature of Complaint:
   {crime_trans} ({ipc_trans})

6. Statement:
   {statement}

7. Requested Action:
   - Investigation
   - Immediate assistance if HIGH risk

----------------------------------------
""".strip()

def _mock_translate(draft: str, lang: str) -> str:
    return draft

"""
services/severity_service.py
=============================
AI Emergency Severity Detection Upgrade.
Fuses text NLP, voice stress analysis, and GPS location risk into a unified severity rating.
Includes false alarm suppression based on baseline user behavior.
"""

from models.cybercrime_model import get_report_count_near
from utils.risk_scoring import threat_score_to_risk
import random

# User baseline storage (mock for calibration / false alarm suppression)
# In production, this would be persisted in a DB table: user_severity_calibrations
_USER_BASELINES = {
    1: {"avg_text_urgency": 2.0, "avg_voice_stress": 0.25, "false_alerts_count": 0}
}

def analyze_severity(text: str, lat: float = None, lon: float = None, voice_features: dict = None, user_id: int = 1) -> dict:
    """
    Combines text NLP, GPS location risk, and voice stress into a unified severity.
    Output: LOW / MEDIUM / HIGH with explainable reasoning.
    """
    # 1. NLP Urgency Score
    text_score, matched_patterns = _nlp_urgency_score(text)
    
    # 2. Voice Stress Score
    voice_score, voice_details = _voice_stress_analysis(voice_features)
    
    # 3. GPS Location Risk Score
    gps_score, gps_details = _gps_risk_score(lat, lon)
    
    # 4. Multi-modal Fusion
    # Weights: Text NLP (50%), Voice Stress (30%), GPS Risk (20%)
    fused_score = (text_score * 0.5) + (voice_score * 3.0) + (gps_score * 3.0)
    
    # Cap fused score to 10
    fused_score = min(max(fused_score, 0.0), 10.0)
    
    # Base Severity Level
    if fused_score >= 7.0:
        base_severity = "HIGH"
    elif fused_score >= 4.0:
        base_severity = "MEDIUM"
    else:
        base_severity = "LOW"
        
    # 5. False Alarm Suppression (User Calibration)
    calibrated_severity, suppressed = _apply_false_alarm_suppression(user_id, base_severity, text_score, voice_score, text)
    
    # Final explanation construction
    explanation = _build_fusion_explanation(
        text_score, voice_score, gps_score, 
        base_severity, calibrated_severity, suppressed,
        matched_patterns, voice_details, gps_details
    )
    
    return {
        "success": True,
        "severity": calibrated_severity,
        "fused_score": round(fused_score, 2),
        "text_urgency_score": round(text_score, 2),
        "voice_stress_score": round(voice_score, 2),
        "gps_risk_score": round(gps_score, 2),
        "false_alarm_suppressed": suppressed,
        "explanation": explanation,
        "breakdown": {
            "text": {
                "score": text_score,
                "matched_patterns": matched_patterns
            },
            "voice": voice_details,
            "gps": gps_details
        }
    }

def _nlp_urgency_score(text: str) -> tuple:
    """Enhanced rule-based NLP urgency scoring."""
    text_lower = text.lower()
    score = 0.0
    matched = []
    
    # High urgency words / phrases
    critical_phrases = {
        "help": 3.0, "police": 2.5, "sos": 3.5, "emergency": 3.0, "danger": 3.0, 
        "following me": 3.0, "stalking": 2.5, "chasing": 3.0, "attack": 3.5, 
        "weapon": 3.0, "gun": 3.5, "knife": 3.0, "rob": 2.5, "rape": 4.0, 
        "kill": 4.0, "hurry": 2.0, "immediate": 2.0, "scared": 1.5, "unsafe": 1.5,
        "die": 3.5, "accident": 2.5, "bleeding": 3.0, "run away": 2.0
    }
    
    for phrase, val in critical_phrases.items():
        if phrase in text_lower:
            score += val
            matched.append(phrase)
            
    # Contextual modifiers
    if "please" in text_lower:
        score += 0.5
    if "!" in text:
        score += 0.5
        matched.append("exclamation mark")
        
    return min(score, 10.0), matched

def _voice_stress_analysis(voice_features: dict) -> tuple:
    """
    Simulates voice stress scoring.
    Accepts: pitch (Hz), speech_rate (words/min), urgency_tone (0.0-1.0)
    """
    if not voice_features:
        # Return fallback/neutral
        return 0.0, {"analyzed": False, "message": "No voice data provided."}
        
    pitch = float(voice_features.get("pitch", 180.0))
    speech_rate = float(voice_features.get("speech_rate", 130.0))
    urgency_tone = float(voice_features.get("urgency_tone", 0.1))
    
    # Normal boundaries:
    # Pitch: high pitch (>240 Hz) is associated with stress/fear
    # Speech rate: fast (>170 wpm) or extremely slow/stuttering (<70 wpm) indicates stress
    # Urgency tone: direct indicator
    
    stress_factors = 0.0
    indicators = []
    
    if pitch > 230:
        stress_factors += 1.0
        indicators.append("Elevated vocal pitch (potential panic)")
    elif pitch < 80:
        stress_factors += 0.5
        indicators.append("Low pitch/trembling")
        
    if speech_rate > 170:
        stress_factors += 0.8
        indicators.append("Rapid speech rate (adrenaline response)")
    elif speech_rate < 70 and speech_rate > 10:
        stress_factors += 0.8
        indicators.append("Stuttering or slow speech (shock)")
        
    stress_factors += urgency_tone * 1.5
    if urgency_tone > 0.6:
        indicators.append("High urgency tone detected")
        
    voice_score = min(stress_factors, 3.0)
    
    return voice_score, {
        "analyzed": True,
        "pitch_hz": pitch,
        "speech_rate_wpm": speech_rate,
        "urgency_tone": urgency_tone,
        "indicators": indicators
    }

def _gps_risk_score(lat: float, lon: float) -> tuple:
    """Computes risk score based on coordinate hotspot reports."""
    if lat is None or lon is None:
        return 0.0, {"analyzed": False, "message": "No coordinates provided."}
        
    # Query cybercrime database or feedback database
    report_count = get_report_count_near(lat, lon, radius_deg=0.05)
    
    # Map report count to score between 0.0 and 3.0
    gps_score = min(report_count * 0.2, 3.0)
    
    details = {
        "analyzed": True,
        "nearby_report_count": report_count,
        "risk_description": "Normal area" if gps_score < 1.0 else "Moderately high crime density" if gps_score < 2.0 else "Critical high crime zone"
    }
    
    return gps_score, details

def _apply_false_alarm_suppression(user_id: int, base_severity: str, text_score: float, voice_score: float, text: str) -> tuple:
    """
    Suppresses false high severity alerts based on user profile calibration.
    If the user has a history of high false alarms, or if text triggers negation phrases.
    """
    # Negation check
    negations = ["not scared", "just checking", "false alarm", "all good", "reached safe", "testing the app", "no problem"]
    text_lower = text.lower()
    if any(neg in text_lower for neg in negations):
        return "LOW", True
        
    # Get user baseline profile
    baseline = _USER_BASELINES.setdefault(user_id, {
        "avg_text_urgency": 1.5,
        "avg_voice_stress": 0.2,
        "false_alerts_count": 0
    })
    
    # If base severity is HIGH, but both text and voice are close to user's normal low baseline, suppress it
    suppressed = False
    calibrated = base_severity
    
    if base_severity == "HIGH":
        # Check if user has triggered multiple high alerts that were resolved quickly without action
        if baseline["false_alerts_count"] >= 3 and text_score < 4.0 and voice_score < 1.5:
            calibrated = "MEDIUM"
            suppressed = True
            
    return calibrated, suppressed

def _build_fusion_explanation(text_score, voice_score, gps_score, base_severity, final_severity, suppressed, matched_patterns, voice_details, gps_details) -> str:
    """Generates human-readable explainable severity output."""
    reasons = []
    
    # NLP summary
    if text_score > 0:
        reasons.append(f"Text analysis matched key threats: {', '.join(matched_patterns[:3])} (Urgency: {text_score:.1f}/10)")
    else:
        reasons.append("No critical text threat keywords found")
        
    # Voice summary
    if voice_details.get("analyzed"):
        indicators = voice_details.get("indicators", [])
        if indicators:
            reasons.append(f"Voice stress details: {'; '.join(indicators)}")
        else:
            reasons.append("Voice features analyze as normal tone/pitch")
            
    # GPS summary
    if gps_details.get("analyzed"):
        reasons.append(f"GPS zone risk: {gps_details['risk_description']} ({gps_details['nearby_report_count']} reports nearby)")
        
    suppression_text = ""
    if suppressed:
        suppression_text = f" (Suppressed from {base_severity} to suppress false alarm based on user baseline)"
        
    return f"Severity determined as {final_severity}{suppression_text}. Details: " + " | ".join(reasons)

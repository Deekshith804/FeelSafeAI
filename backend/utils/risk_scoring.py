"""
utils/risk_scoring.py
=====================
Enhanced, AI-grade safety scoring functions shared across FeelSafe services.
All scores are 0–100 (higher = safer).

Improvements over v1:
  - Dynamic weight scaling based on context
  - Exponential penalty for repeated unsafe reports
  - Trust-weighted community rating (more raters = more credible)
  - Deepened nighttime risk tiers (early night vs. deep night)
  - Small controlled random variation to simulate real-time changing conditions
  - Richer factor descriptions for explainability
"""

import math
import random

from utils.constants import (
    ROUTE_SAFE_THRESHOLD,
    ROUTE_MODERATE_THRESHOLD,
    NIGHT_START_HOUR,
    NIGHT_END_HOUR,
    RISK_LOW,
    RISK_MEDIUM,
    RISK_HIGH,
    THREAT_THRESHOLD_HIGH,
    THREAT_THRESHOLD_MEDIUM,
)
from utils.helpers import current_hour_local, clamp


# ── Route Safety Score ─────────────────────────────────────────────────────────

def compute_route_safety_score(
    has_hospital_nearby: bool,
    has_police_nearby: bool,
    is_isolated: bool,
    unsafe_report_count: int,
    community_rating: float,        # 0.0 – 5.0
    total_ratings: int = 0,         # number of community raters (trust signal)
    current_hour: int | None = None,
    add_variation: bool = True,     # simulate real-time micro-changes
    crowd_level: int = 3,           # crowd density safety (1-5)
) -> dict:
    """
    Compute a composite safety score (0-100) for a route segment.
    """
    if current_hour is None:
        current_hour = current_hour_local()

    score = 50.0        # Neutral baseline
    factors = []
    detailed = {}       # For explanation engine

    # ── Police Proximity ──────────────────────────────────────────────────────
    if has_police_nearby:
        police_bonus = 25
        score += police_bonus
        factors.append(f"Police station nearby (+{police_bonus})")
        detailed["police"] = police_bonus
    else:
        detailed["police"] = 0

    # ── Hospital Proximity ────────────────────────────────────────────────────
    if has_hospital_nearby:
        score += 20
        factors.append("Hospital within safe distance (+20)")
        detailed["hospital"] = 20
    else:
        detailed["hospital"] = 0

    # ── Trust-weighted Community Rating ───────────────────────────────────────
    raw_rating_bonus = community_rating * 7.0          # max 35
    trust_multiplier = _trust_weight(total_ratings)
    rating_bonus = raw_rating_bonus * trust_multiplier
    score += rating_bonus
    if community_rating > 0:
        factors.append(
            f"Community rating {community_rating:.1f}/5 (+{rating_bonus:.1f})"
        )
    detailed["rating_bonus"] = rating_bonus

    # ── Crowd Density Safety ──────────────────────────────────────────────────
    crowd_bonus = (crowd_level / 5.0) * 15.0
    score += crowd_bonus
    factors.append(f"Crowd density safety (+{crowd_bonus:.1f})")
    detailed["crowd"] = crowd_bonus

    # ── Isolation Penalty ─────────────────────────────────────────────────────
    if is_isolated:
        score -= 25
        factors.append("Isolated / poorly-lit road (-25)")
        detailed["isolated"] = -25
    else:
        detailed["isolated"] = 0

    # ── Exponential Unsafe Report Penalty ─────────────────────────────────────
    report_penalty = _exponential_report_penalty(unsafe_report_count)
    if report_penalty > 0:
        score -= report_penalty
        factors.append(
            f"{unsafe_report_count} unsafe reports (-{report_penalty:.0f})"
        )
        detailed["report_penalty"] = -report_penalty
    else:
        detailed["report_penalty"] = 0

    # ── Nighttime Penalty (tiered) ────────────────────────────────────────────
    is_night, is_deep_night = _nighttime_tier(current_hour)
    if is_deep_night:
        score -= 20
        factors.append("Deep night travel (10 PM – 4 AM) — highest risk (-20)")
        detailed["night"] = -20
    elif is_night:
        score -= 10
        factors.append("Evening / early-night travel — elevated risk (-10)")
        detailed["night"] = -10
    else:
        detailed["night"] = 0

    # ── Real-time Variation (simulated) ───────────────────────────────────────
    variation = 0
    if add_variation:
        variation = random.uniform(-3, 3)
        score += variation

    score = int(clamp(score, 0, 100))
    label = _score_to_label(score)

    return {
        "score": score,
        "label": label,
        "factors": factors,
        "is_nighttime": is_night or is_deep_night,
        "is_deep_night": is_deep_night,
        "report_penalty": int(report_penalty),
        "rating_bonus": round(rating_bonus, 1),
        "detailed_breakdown": detailed,
    }


# ── Helper: Exponential Report Penalty ────────────────────────────────────────

def _exponential_report_penalty(n: int) -> float:
    """
    Exponentially increasing penalty per unsafe report.
    Each report hurts more than the last — heavy repeated reports signal danger.
      n=0 → 0
      n=1 → 5.0
      n=2 → 11.5
      n=3 → 19.4
      n=5 → 37.5 (capped at 35)
    """
    if n <= 0:
        return 0.0
    penalty = 5 * n * (1 + 0.15 * (n - 1))
    return min(penalty, 35.0)


# ── Helper: Trust Weight ───────────────────────────────────────────────────────

def _trust_weight(total_ratings: int) -> float:
    """
    Sigmoid-like trust multiplier: 0 raters → 0.50, ≥20 raters → ~1.0.
    Prevents a single anonymous rating from having full influence.
    """
    if total_ratings <= 0:
        return 0.50
    # Approaches 1.0 asymptotically; 20 ratings ≈ 95% trust
    return min(1.0, 0.50 + 0.50 * (1 - math.exp(-total_ratings / 8.0)))


# ── Helper: Nighttime Tier ─────────────────────────────────────────────────────

def _nighttime_tier(hour: int) -> tuple[bool, bool]:
    """
    Return (is_night, is_deep_night).
    Deep night = 22:00–04:00 (highest danger window).
    Night      = 20:00–22:00 and 04:00–06:00 (moderate danger window).
    """
    deep_night_start = 22
    deep_night_end   = 4    # wraps around midnight
    early_night_start = NIGHT_START_HOUR   # 20
    early_night_end   = NIGHT_END_HOUR     # 6

    is_deep = (hour >= deep_night_start) or (hour < deep_night_end)
    is_early_night = (not is_deep) and _is_nighttime(hour)
    return (is_deep or is_early_night), is_deep


def _is_nighttime(hour: int) -> bool:
    """Return True if hour falls in the configured nighttime window."""
    if NIGHT_START_HOUR < NIGHT_END_HOUR:
        return NIGHT_START_HOUR <= hour < NIGHT_END_HOUR
    return hour >= NIGHT_START_HOUR or hour < NIGHT_END_HOUR


# ── Score Label ────────────────────────────────────────────────────────────────

def _score_to_label(score: int) -> str:
    """Convert numeric score to human-readable safety label."""
    if score >= 65:
        return "SAFEST ROUTE"
    if score >= 40:
        return "SAFE ROUTE"
    return "UNSAFE ROUTE"


# ── Threat Score → Risk Level ──────────────────────────────────────────────────

def threat_score_to_risk(score: int) -> str:
    """
    Map a raw threat score (accumulated keyword points) to a risk level label.

    Args:
        score: Accumulated keyword-match score.

    Returns:
        One of RISK_LOW, RISK_MEDIUM, RISK_HIGH.
    """
    if score >= THREAT_THRESHOLD_HIGH:
        return RISK_HIGH
    if score >= THREAT_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW


# ── Confidence Score ───────────────────────────────────────────────────────────

def compute_threat_confidence(raw_score: int, matched_count: int) -> float:
    """
    Derive a 0.0–1.0 confidence value from raw threat score and number of
    distinct keyword matches.  More keywords + higher score = more confident.

    Formula: sigmoid-like curve; saturates near 1.0 at score ≥ 15.
    """
    if raw_score <= 0:
        return 0.0
    # Base confidence from score magnitude
    base = 1 - math.exp(-raw_score / 7.0)
    # Boost slightly for breadth of keyword matches
    breadth_boost = min(0.1 * matched_count, 0.2)
    return round(min(base + breadth_boost, 1.0), 2)

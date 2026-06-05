"""
models/cybercrime_model.py
===========================
SQLite schema for cybercrime hotspot mapping and citizen reports.
Tables: cybercrime_reports, cybercrime_hotspots
"""

import sqlite3
from models.trip_model import get_connection


def init_cybercrime_tables():
    """Create cybercrime-related tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Citizen Crime Reports ─────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cybercrime_reports (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER,
            incident_type   TEXT NOT NULL,
            description     TEXT NOT NULL,
            lat             REAL NOT NULL,
            lon             REAL NOT NULL,
            location_name   TEXT,
            severity        TEXT DEFAULT 'MEDIUM',
            status          TEXT DEFAULT 'PENDING',
            submitted_at    TEXT DEFAULT (datetime('now'))
        )
    """)

    # ── Aggregated Hotspot Zones ───────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cybercrime_hotspots (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_name       TEXT NOT NULL,
            lat             REAL NOT NULL,
            lon             REAL NOT NULL,
            risk_score      REAL DEFAULT 0.5,
            incident_count  INTEGER DEFAULT 0,
            crime_types     TEXT,
            last_updated    TEXT DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] Cybercrime tables initialised.")


def save_report(user_id, incident_type, description, lat, lon, location_name, severity):
    """Persist a citizen report and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO cybercrime_reports
           (user_id, incident_type, description, lat, lon, location_name, severity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, incident_type, description, lat, lon, location_name, severity),
    )
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return report_id


def get_all_reports(limit=50):
    """Return recent citizen reports."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM cybercrime_reports ORDER BY submitted_at DESC LIMIT ?",
        (limit,),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_report_count_near(lat, lon, radius_deg=0.1):
    """Count reports within an approximate bounding box (for risk scoring)."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT COUNT(*) as cnt FROM cybercrime_reports
           WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?""",
        (lat - radius_deg, lat + radius_deg, lon - radius_deg, lon + radius_deg),
    )
    count = cursor.fetchone()["cnt"]
    conn.close()
    return count

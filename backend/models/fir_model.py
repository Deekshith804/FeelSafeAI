"""
models/fir_model.py
====================
SQLite schema for Auto FIR & Complaint Generator.
Tables: firs, fir_evidence
"""

import sqlite3
from models.trip_model import get_connection


def init_fir_tables():
    """Create FIR-related tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── FIR Records ───────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS firs (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER,
            incident_description TEXT NOT NULL,
            structured_draft    TEXT NOT NULL,
            language            TEXT DEFAULT 'en',
            complainant_name    TEXT,
            complainant_phone   TEXT,
            incident_location   TEXT,
            incident_date       TEXT,
            accused_description TEXT,
            status              TEXT DEFAULT 'FILED',
            fir_number          TEXT,
            assigned_officer    TEXT,
            created_at          TEXT DEFAULT (datetime('now')),
            assigned_at         TEXT,
            resolved_at         TEXT
        )
    """)

    # ── FIR Evidence Attachments ───────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fir_evidence (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fir_id          INTEGER NOT NULL,
            filename        TEXT NOT NULL,
            original_name   TEXT,
            file_type       TEXT,
            sha256_hash     TEXT NOT NULL,
            file_size_bytes INTEGER,
            uploaded_at     TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (fir_id) REFERENCES firs(id)
        )
    """)

    conn.commit()
    conn.close()
    print("[OK] FIR tables initialised.")


def save_fir(user_id, incident_description, structured_draft, language,
             complainant_name, complainant_phone, incident_location,
             incident_date, accused_description):
    """Persist a new FIR and return its record dict."""
    import random, string
    fir_number = "FIR-" + "".join(random.choices(string.digits, k=8))
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO firs
           (user_id, incident_description, structured_draft, language,
            complainant_name, complainant_phone, incident_location,
            incident_date, accused_description, fir_number)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, incident_description, structured_draft, language,
         complainant_name, complainant_phone, incident_location,
         incident_date, accused_description, fir_number),
    )
    fir_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": fir_id, "fir_number": fir_number, "status": "FILED"}


def get_fir(fir_id):
    """Fetch a single FIR with its evidence list."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM firs WHERE id = ?", (fir_id,))
    fir = cursor.fetchone()
    if not fir:
        conn.close()
        return None
    fir_dict = dict(fir)
    cursor.execute("SELECT * FROM fir_evidence WHERE fir_id = ?", (fir_id,))
    fir_dict["evidence"] = [dict(e) for e in cursor.fetchall()]
    conn.close()
    return fir_dict


def get_fir_list(user_id=None, limit=20):
    """List FIRs, optionally filtered by user."""
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "SELECT * FROM firs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        )
    else:
        cursor.execute("SELECT * FROM firs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def update_fir_status(fir_id, status):
    """Update FIR status and set timestamp."""
    from datetime import datetime
    conn = get_connection()
    cursor = conn.cursor()
    ts = datetime.utcnow().isoformat()
    if status == "ASSIGNED":
        cursor.execute(
            "UPDATE firs SET status=?, assigned_at=? WHERE id=?", (status, ts, fir_id)
        )
    elif status == "RESOLVED":
        cursor.execute(
            "UPDATE firs SET status=?, resolved_at=? WHERE id=?", (status, ts, fir_id)
        )
    else:
        cursor.execute("UPDATE firs SET status=? WHERE id=?", (status, fir_id))
    conn.commit()
    conn.close()
    return {"id": fir_id, "status": status}


def save_evidence(fir_id, filename, original_name, file_type, sha256_hash, file_size_bytes):
    """Persist evidence metadata for a FIR."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO fir_evidence
           (fir_id, filename, original_name, file_type, sha256_hash, file_size_bytes)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (fir_id, filename, original_name, file_type, sha256_hash, file_size_bytes),
    )
    ev_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return ev_id

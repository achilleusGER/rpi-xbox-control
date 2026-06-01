"""
app.py
Flask REST-API für den Xbox Controller.
Stellt Endpunkte für Discovery, Verbindung, Button-Senden
und Sequenz-Verwaltung/-Ausführung bereit.
"""

import json
import logging
import threading
import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from keepalive import KeepaliveManager, controller_info
from xbox_client import XboxClient, _load_auth

# ── Setup ─────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

DIST = Path(__file__).parent / "dist"
app = Flask(__name__, static_folder=str(DIST) if DIST.exists() else None)
CORS(app)   # erlaubt Zugriff vom Vite-Dev-Server (Port 5173) und Produktion

client = XboxClient()

SEQUENCES_FILE = Path(__file__).parent / "sequences.json"
SETTINGS_FILE  = Path(__file__).parent / "settings.json"

# Laufende Sequenz
_seq_thread: threading.Thread | None = None
_stop_event = threading.Event()

# ── In-Memory Log-Ring ────────────────────────────────────────────────────────

from collections import deque

_LOG_RING: deque = deque(maxlen=80)   # letzte 80 Einträge


class _RingHandler(logging.Handler):
    """Schreibt alle Log-Einträge (ab INFO) in den Ring-Buffer."""
    def emit(self, record: logging.LogRecord) -> None:
        import datetime
        ts = datetime.datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
        _LOG_RING.append({
            "ts":    ts,
            "level": record.levelname,
            "name":  record.name,
            "msg":   record.getMessage(),
        })


_ring_handler = _RingHandler()
_ring_handler.setLevel(logging.INFO)
logging.getLogger().addHandler(_ring_handler)

# ── Token-Auto-Refresh ────────────────────────────────────────────────────────

def _token_refresh_loop() -> None:
    """
    Hintergrundthread: erneuert den XSTS-Token alle 6 Stunden proaktiv.
    Läuft unabhängig von Verbindungen – Token ist immer frisch wenn Connect aufgerufen wird.
    """
    import asyncio as _aio
    INTERVAL = 6 * 3600  # 6 Stunden

    while True:
        time.sleep(INTERVAL)
        try:
            loop = _aio.new_event_loop()
            loop.run_until_complete(_load_auth())
            loop.close()
            log.info("Token-Auto-Refresh: erfolgreich erneuert.")
        except Exception as e:
            log.warning("Token-Auto-Refresh fehlgeschlagen: %s", e)


_refresh_thread = threading.Thread(
    target=_token_refresh_loop, daemon=True, name="token-refresh"
)
_refresh_thread.start()

# ── Einstellungen ─────────────────────────────────────────────────────────────

def _load_settings() -> dict:
    if SETTINGS_FILE.exists():
        try:
            return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"keepalive": False}


def _save_settings(patch: dict) -> None:
    try:
        data = _load_settings()
        data.update(patch)
        SETTINGS_FILE.write_text(
            json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception as e:
        log.warning("Einstellungen speichern fehlgeschlagen: %s", e)


# ── Keepalive-Manager ─────────────────────────────────────────────────────────

keepalive_mgr = KeepaliveManager()
_settings = _load_settings()
if _settings.get("keepalive"):
    keepalive_mgr.set_enabled(True)

# Controller-Status-Cache (wird genutzt wenn keepalive nicht aktiv ist)
_ctrl_cache: dict = {"ts": 0.0, "data": {"connected": False, "name": None}}
_CTRL_TTL = 5.0   # Sekunden


def _controller_status() -> dict:
    """Liefert Controller-Status – aus Manager-Cache oder frisch abgefragt."""
    if keepalive_mgr.running:
        return {
            "connected": keepalive_mgr.controller_connected,
            "name": keepalive_mgr.controller_name,
        }
    now = time.monotonic()
    if now - _ctrl_cache["ts"] > _CTRL_TTL:
        try:
            _ctrl_cache["data"] = controller_info()
        except Exception:
            pass
        _ctrl_cache["ts"] = now
    return _ctrl_cache["data"]


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def load_sequences() -> dict:
    if SEQUENCES_FILE.exists():
        return json.loads(SEQUENCES_FILE.read_text(encoding="utf-8"))
    return {}


def save_sequences(data: dict) -> None:
    SEQUENCES_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def execute_sequence(steps: list, repeat: bool) -> None:
    """Läuft in einem eigenen Thread. Führt die Schritte aus."""
    _stop_event.clear()
    while True:
        for step in steps:
            if _stop_event.is_set():
                return
            try:
                if step["type"] == "button":
                    client.send_button(step["button"])
                elif step["type"] == "wait":
                    # In kleinen Schritten warten → sofortiger Stop möglich
                    deadline = time.monotonic() + float(step["seconds"])
                    while time.monotonic() < deadline:
                        if _stop_event.is_set():
                            return
                        time.sleep(0.05)
            except Exception as e:
                log.error("Fehler beim Ausführen von Schritt %s: %s", step, e)
        if not repeat:
            break
    log.info("Sequenz beendet.")


# ── Routen: Xbox ──────────────────────────────────────────────────────────────

@app.get("/api/status")
def status():
    return jsonify({
        "connected":  client.connected,
        "console":    client.console_info,
        "controller": _controller_status(),
        "keepalive":  {"enabled": keepalive_mgr.enabled},
    })


@app.post("/api/keepalive")
def set_keepalive():
    enabled = bool((request.json or {}).get("enabled", False))
    keepalive_mgr.set_enabled(enabled)
    _save_settings({"keepalive": enabled})
    log.info("Keepalive %s.", "aktiviert" if enabled else "deaktiviert")
    return jsonify({"enabled": enabled})


@app.get("/api/logs")
def get_logs():
    """Liefert die letzten Log-Einträge aus dem In-Memory-Ring."""
    return jsonify(list(_LOG_RING))


@app.post("/api/scan")
def scan():
    timeout = request.json.get("timeout", 5) if request.is_json else 5
    try:
        consoles = client.discover(timeout=int(timeout))
        return jsonify({"consoles": consoles})
    except Exception as e:
        log.exception("Scan-Fehler")
        return jsonify({"error": str(e)}), 500


@app.post("/api/connect")
def connect():
    liveid = (request.json or {}).get("liveid")
    if not liveid:
        return jsonify({"error": "liveid fehlt"}), 400
    try:
        info = client.connect(liveid)
        return jsonify(info)
    except Exception as e:
        log.exception("Verbindungs-Fehler")
        return jsonify({"error": str(e)}), 500


@app.post("/api/disconnect")
def disconnect():
    client.disconnect()
    return jsonify({"status": "disconnected"})


@app.post("/api/button")
def button():
    btn = (request.json or {}).get("button")
    if not btn:
        return jsonify({"error": "button fehlt"}), 400
    if not client.connected:
        return jsonify({"error": "Nicht verbunden"}), 400
    try:
        client.send_button(btn)
        return jsonify({"sent": btn})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        log.exception("Button-Fehler")
        return jsonify({"error": str(e)}), 500


# ── Routen: Sequenzen ─────────────────────────────────────────────────────────

@app.get("/api/sequences")
def get_sequences():
    return jsonify(load_sequences())


@app.post("/api/sequences")
def upsert_sequence():
    data = request.json or {}
    name = data.get("name", "").strip()
    steps = data.get("steps")
    if not name:
        return jsonify({"error": "name fehlt"}), 400
    if not isinstance(steps, list):
        return jsonify({"error": "steps muss eine Liste sein"}), 400

    seqs = load_sequences()
    seqs[name] = steps
    save_sequences(seqs)
    return jsonify({"saved": name})


@app.put("/api/sequences/<name>")
def rename_sequence(name: str):
    new_name = (request.json or {}).get("name", "").strip()
    if not new_name:
        return jsonify({"error": "neuer Name fehlt"}), 400
    seqs = load_sequences()
    if name not in seqs:
        return jsonify({"error": "Sequenz nicht gefunden"}), 404
    seqs[new_name] = seqs.pop(name)
    save_sequences(seqs)
    return jsonify({"renamed": new_name})


@app.delete("/api/sequences/<name>")
def delete_sequence(name: str):
    seqs = load_sequences()
    if name not in seqs:
        return jsonify({"error": "Sequenz nicht gefunden"}), 404
    del seqs[name]
    save_sequences(seqs)
    return jsonify({"deleted": name})


# ── Routen: Ausführung ────────────────────────────────────────────────────────

@app.post("/api/run/<name>")
def run_sequence(name: str):
    global _seq_thread
    if not client.connected:
        return jsonify({"error": "Nicht verbunden"}), 400

    seqs = load_sequences()
    steps = seqs.get(name)
    if steps is None:
        return jsonify({"error": f"Sequenz '{name}' nicht gefunden"}), 404

    repeat = (request.json or {}).get("repeat", False)

    # Laufende Sequenz stoppen
    _stop_event.set()
    if _seq_thread and _seq_thread.is_alive():
        _seq_thread.join(timeout=2)

    _seq_thread = threading.Thread(
        target=execute_sequence,
        args=(steps, repeat),
        daemon=True,
    )
    _seq_thread.start()
    return jsonify({"running": name, "repeat": repeat})


@app.post("/api/stop")
def stop_sequence():
    _stop_event.set()
    return jsonify({"status": "stopped"})


@app.get("/api/running")
def is_running():
    running = bool(_seq_thread and _seq_thread.is_alive() and not _stop_event.is_set())
    return jsonify({"running": running})


# ── Frontend-Serving ─────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path: str):
    """Liefert das gebaute React-Frontend aus dem dist/-Verzeichnis."""
    if DIST.exists():
        if path and (DIST / path).exists():
            return send_from_directory(str(DIST), path)
        return send_from_directory(str(DIST), "index.html")
    return "<h2>Frontend nicht gebaut. Bitte <code>npm run build</code> ausführen.</h2>", 503


# ── Start ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80, debug=False)

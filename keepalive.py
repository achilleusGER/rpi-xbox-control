"""
keepalive.py
Hält einen per USB angeschlossenen Xbox Controller wach,
indem alle ~25 Sekunden ein minimales Rumble-Signal gesendet wird.

Verwendung:
  Standalone:  python keepalive.py
  Als Modul:   from keepalive import KeepaliveManager, controller_info
"""

import logging
import sys
import threading
import time

log = logging.getLogger("keepalive")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

PING_INTERVAL  = 25   # Sekunden zwischen Rumble-Pings (Xbox-Timeout ≈ 30 s)
RECONNECT_WAIT = 10   # Sekunden warten, wenn kein Controller gefunden


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def find_xbox_controller():
    """Sucht den ersten Xbox-Controller und gibt ein offenes InputDevice zurück."""
    try:
        from evdev import InputDevice, list_devices
    except ImportError:
        log.error("evdev nicht installiert (nur Linux).")
        return None
    for path in list_devices():
        try:
            dev = InputDevice(path)
            if any(kw in dev.name.lower() for kw in ("xbox", "microsoft", "xpad", "x-box")):
                log.info("Controller gefunden: '%s' @ %s", dev.name, path)
                return dev
            dev.close()
        except Exception:
            continue
    return None


def controller_info() -> dict:
    """
    Schneller Status-Check: öffnet jedes Device kurz, schließt es sofort.
    Gibt {"connected": bool, "name": str|None} zurück.
    Sicher auch ohne laufenden KeepaliveManager aufrufbar.
    """
    try:
        from evdev import InputDevice, list_devices
    except ImportError:
        return {"connected": False, "name": None}
    for path in list_devices():
        try:
            dev = InputDevice(path)
            name = dev.name
            dev.close()
            if any(kw in name.lower() for kw in ("xbox", "microsoft", "xpad", "x-box")):
                return {"connected": True, "name": name}
        except Exception:
            continue
    return {"connected": False, "name": None}


def _upload_rumble_effect(dev):
    from evdev import ecodes, ff
    rumble = ff.Rumble(strong_magnitude=0x0000, weak_magnitude=0x0001)
    effect = ff.Effect(
        ecodes.FF_RUMBLE, -1, 0,
        ff.Trigger(0, 0),
        ff.Replay(300, 0),
        ff.EffectType(ff_rumble_effect=rumble),
    )
    return dev.upload_effect(effect)


# ── KeepaliveManager ──────────────────────────────────────────────────────────

class KeepaliveManager:
    """
    Thread-basierter Keep-Alive-Manager.
    Wird von Flask instanziiert und per set_enabled(True/False) gesteuert.
    Verfolgt zusätzlich den Controller-Verbindungsstatus.
    """

    def __init__(self) -> None:
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._enabled = False
        self._ctrl_connected = False
        self._ctrl_name: str | None = None

    # ── Öffentliche API ──────────────────────────────────────────────────────

    def set_enabled(self, enabled: bool) -> None:
        self._enabled = enabled
        if enabled:
            self._start()
        else:
            self._stop.set()
            self._ctrl_connected = False
            self._ctrl_name = None
            log.info("KeepaliveManager: deaktiviert.")

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    @property
    def controller_connected(self) -> bool:
        return self._ctrl_connected

    @property
    def controller_name(self) -> str | None:
        return self._ctrl_name

    # ── Internes ─────────────────────────────────────────────────────────────

    def _start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop.clear()
            self._thread = threading.Thread(
                target=self._run, daemon=True, name="keepalive"
            )
            self._thread.start()
            log.info("KeepaliveManager: gestartet.")

    def _run(self) -> None:
        try:
            from evdev import ecodes
        except ImportError:
            log.error("evdev nicht verfügbar – KeepaliveManager beendet.")
            return

        dev = None
        effect_id = None

        while not self._stop.is_set():
            # ── Controller suchen ────────────────────────────────────────────
            if dev is None:
                dev = find_xbox_controller()
                if dev is None:
                    self._ctrl_connected = False
                    self._ctrl_name = None
                    for _ in range(RECONNECT_WAIT * 2):
                        if self._stop.is_set():
                            return
                        time.sleep(0.5)
                    continue

                self._ctrl_connected = True
                self._ctrl_name = dev.name

                try:
                    effect_id = _upload_rumble_effect(dev)
                    log.info("KeepaliveManager: '%s' bereit, Ping alle %ds.",
                             dev.name, PING_INTERVAL)
                except Exception as e:
                    log.error("Rumble-Effekt laden: %s", e)
                    try:
                        dev.close()
                    except Exception:
                        pass
                    dev = None
                    self._ctrl_connected = False
                    continue

            # ── Ping senden ──────────────────────────────────────────────────
            try:
                dev.write(ecodes.EV_FF, effect_id, 1)
                log.debug("Keep-Alive Ping.")
            except Exception as e:
                log.warning("Controller getrennt: %s", e)
                try:
                    dev.close()
                except Exception:
                    pass
                dev = None
                effect_id = None
                self._ctrl_connected = False
                self._ctrl_name = None
                continue

            # ── Warten (unterbrechbar) ───────────────────────────────────────
            for _ in range(PING_INTERVAL * 2):
                if self._stop.is_set():
                    break
                time.sleep(0.5)

        # Aufräumen
        self._ctrl_connected = False
        self._ctrl_name = None
        if dev:
            try:
                dev.close()
            except Exception:
                pass
        log.info("KeepaliveManager: gestoppt.")


# ── Standalone-Modus ──────────────────────────────────────────────────────────

def run():
    """Wird aufgerufen wenn das Script direkt gestartet wird."""
    log.info("Keep-Alive Service gestartet.")
    dev = None
    effect_id = None

    while True:
        if dev is None:
            dev = find_xbox_controller()
            if dev is None:
                log.warning("Kein Xbox Controller gefunden. Warte %ds...", RECONNECT_WAIT)
                time.sleep(RECONNECT_WAIT)
                continue
            try:
                effect_id = _upload_rumble_effect(dev)
                log.info("Rumble-Effekt geladen. Sende Keep-Alive alle %ds.", PING_INTERVAL)
            except Exception as e:
                log.error("Fehler beim Laden des Rumble-Effekts: %s", e)
                dev = None
                time.sleep(5)
                continue

        try:
            from evdev import ecodes
            dev.write(ecodes.EV_FF, effect_id, 1)
            log.debug("Keep-Alive Ping gesendet.")
        except Exception as e:
            log.warning("Controller-Verbindung verloren (%s). Reconnect...", e)
            dev = None
            effect_id = None

        time.sleep(PING_INTERVAL)


if __name__ == "__main__":
    if sys.platform != "linux":
        log.error("keepalive.py läuft nur auf Linux (Raspberry Pi).")
        sys.exit(1)
    run()

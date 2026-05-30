"""
keepalive.py
Hält einen per USB angeschlossenen Xbox Controller wach,
indem alle ~25 Sekunden ein minimales Rumble-Signal gesendet wird.
Läuft als eigenständiger Prozess / systemd-Service.
"""

import time
import logging
import sys

log = logging.getLogger("keepalive")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

PING_INTERVAL = 25      # Sekunden zwischen Pings (Xbox-Timeout ≈ 30s)
RECONNECT_WAIT = 10     # Sekunden warten, wenn kein Controller gefunden


def find_xbox_controller():
    """Sucht den ersten Xbox/Microsoft Controller unter /dev/input/."""
    try:
        from evdev import InputDevice, list_devices
    except ImportError:
        log.error("evdev nicht installiert (nur Linux). Keepalive nicht verfügbar.")
        return None

    for path in list_devices():
        try:
            dev = InputDevice(path)
            name_lower = dev.name.lower()
            if any(kw in name_lower for kw in ("xbox", "microsoft", "xpad", "x-box")):
                log.info("Controller gefunden: '%s' @ %s", dev.name, path)
                return dev
        except Exception:
            continue
    return None


def upload_rumble_effect(dev):
    """Lädt einen kaum spürbaren Rumble-Effekt auf den Controller."""
    from evdev import ecodes, ff

    rumble = ff.Rumble(strong_magnitude=0x0000, weak_magnitude=0x0001)
    effect = ff.Effect(
        ecodes.FF_RUMBLE, -1, 0,
        ff.Trigger(0, 0),
        ff.Replay(300, 0),
        ff.EffectType(ff_rumble_effect=rumble),
    )
    return dev.upload_effect(effect)


def run():
    from evdev import ecodes

    log.info("Keep-Alive Service gestartet.")
    dev = None
    effect_id = None

    while True:
        # Controller suchen / neu verbinden
        if dev is None:
            dev = find_xbox_controller()
            if dev is None:
                log.warning("Kein Xbox Controller gefunden. Warte %ds...", RECONNECT_WAIT)
                time.sleep(RECONNECT_WAIT)
                continue

            try:
                effect_id = upload_rumble_effect(dev)
                log.info("Rumble-Effekt geladen. Sende Keep-Alive alle %ds.", PING_INTERVAL)
            except Exception as e:
                log.error("Fehler beim Laden des Rumble-Effekts: %s", e)
                dev = None
                time.sleep(5)
                continue

        # Ping senden
        try:
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

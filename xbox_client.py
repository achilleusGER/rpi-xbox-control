"""
xbox_client.py
Wrapper um xbox-smartglass-core für Discovery, Verbindung und Button-Eingaben.

Design-Entscheidungen:
  - EIN persistenter asyncio-Loop im Hintergrundthread: alle SmartGlass-Objekte
    (UDP-Transport, Protokoll-State, Heartbeats) leben auf diesem Loop.
    Frühere Variante mit new_event_loop() pro Aufruf → Buttons kamen nie an.
  - Authentifizierter Connect (XSTS-Token): anonyme Verbindung erlaubt keinen
    SystemInput-Channel → Gamepad-Befehle werden ignoriert.
  - connected-Property prüft ConnectionState (nicht nur is not None):
    Erkennt Xbox-Disconnect auch wenn self._console noch gesetzt ist.
"""

import asyncio
import logging
import threading
from pathlib import Path
from typing import Optional

from xbox.sg.console import Console
from xbox.sg.enum import ConnectionState, GamePadButton
from xbox.sg.manager import InputManager

log = logging.getLogger(__name__)

# ── Button-Mapping ────────────────────────────────────────────────────────────

BUTTON_MAP: dict[str, GamePadButton] = {
    "A":     GamePadButton.PadA,
    "B":     GamePadButton.PadB,
    "X":     GamePadButton.PadX,
    "Y":     GamePadButton.PadY,
    "Up":    GamePadButton.DPadUp,
    "Down":  GamePadButton.DPadDown,
    "Left":  GamePadButton.DPadLeft,
    "Right": GamePadButton.DPadRight,
    "Menu":  GamePadButton.Menu,
    "View":  GamePadButton.View,
    "Nexus": GamePadButton.Nexu,   # xbox-smartglass-core 1.3.0: Nexu statt Nexus
    "LB":    GamePadButton.LeftShoulder,
    "RB":    GamePadButton.RightShoulder,
}


# ── Authentifizierung ─────────────────────────────────────────────────────────

async def _load_auth() -> tuple[str, str]:
    """
    Lädt gespeicherte Tokens, erneuert sie bei Bedarf.
    Gibt (userhash, xsts_token_string) zurück.
    Wirft RuntimeError wenn keine Tokens vorhanden sind.
    """
    from aiohttp import ClientSession
    from xbox.webapi.authentication.manager import AuthenticationManager
    from xbox.webapi.authentication.models import OAuth2TokenResponse
    from xbox.webapi.scripts import CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, TOKENS_FILE

    tokens_file = Path(TOKENS_FILE)
    if not tokens_file.exists():
        raise RuntimeError(
            f"Keine Tokens gefunden ({tokens_file}). "
            "Bitte zuerst: python xbox_auth.py"
        )

    async with ClientSession() as session:
        mgr = AuthenticationManager(session, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
        mgr.oauth = OAuth2TokenResponse.parse_raw(tokens_file.read_text())
        try:
            await mgr.refresh_tokens()
        except Exception as e:
            raise RuntimeError(
                f"Token-Erneuerung fehlgeschlagen: {e}. "
                "Bitte erneut authentifizieren: python xbox_auth.py"
            ) from e

        # Aktualisierte Tokens zurück auf Disk speichern (hält Refresh-Token frisch)
        try:
            tokens_file.write_text(mgr.oauth.json())
        except Exception as save_e:
            log.warning("Tokens konnten nicht auf Disk gespeichert werden: %s", save_e)

        xsts = mgr.xsts_token
        log.info("Auth-Token geladen (gültig bis %s)", xsts.not_after)
        return str(xsts.userhash), str(xsts.token)


# ── Client-Klasse ─────────────────────────────────────────────────────────────

class XboxClient:
    """
    Verwaltet eine einzelne Verbindung zu einer Xbox-Konsole.
    Alle async-Operationen laufen auf einem persistenten Hintergrundloop.
    """

    def __init__(self) -> None:
        self._console: Optional[Console] = None
        self._discovered: dict[str, Console] = {}
        self._last_liveid: Optional[str] = None   # für Reconnect ohne Neuscan

        # Persistenter Event Loop in eigenem Thread
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever,
            daemon=True,
            name="xbox-asyncio",
        )
        self._loop_thread.start()

        # Lock verhindert parallele Connect-Versuche
        self._connect_lock = asyncio.Lock()

        # Watchdog starten
        asyncio.run_coroutine_threadsafe(self._watchdog(), self._loop)
        log.info("XboxClient: persistenter asyncio-Loop + Watchdog gestartet.")

    # ── Internes ─────────────────────────────────────────────────────────────

    async def _watchdog(self) -> None:
        """
        Hintergrundtask auf dem persistenten Loop.
        Prüft alle 15 s ob die Verbindung noch lebt.
        Setzt self._console = None wenn ConnectionState != Connected —
        so liefert .connected korrekt False und die UI zeigt „getrennt".
        """
        while True:
            await asyncio.sleep(15)
            if self._console is not None:
                try:
                    state = self._console.connection_state
                    if state != ConnectionState.Connected:
                        log.warning(
                            "Watchdog: Verbindung verloren (state=%s) — Console zurückgesetzt.",
                            state,
                        )
                        self._console = None
                except Exception as e:
                    log.warning("Watchdog: Fehler beim Status-Check: %s — Console zurückgesetzt.", e)
                    self._console = None

    def _run(self, coro, timeout: float = 30.0):
        """Übergibt eine Coroutine an den Hintergrundloop und wartet synchron."""
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=timeout)

    # ── Discovery ────────────────────────────────────────────────────────────

    def discover(self, timeout: int = 5) -> list[dict]:
        """Sucht Xbox-Konsolen im LAN per UDP-Broadcast."""
        self._discovered = {}
        consoles: list[Console] = self._run(
            Console.discover(timeout=timeout),
            timeout=timeout + 5,
        )
        for c in consoles:
            self._discovered[c.liveid] = c
            log.info("Gefunden: %s (%s) @ %s", c.name, c.liveid, c.address)

        return [
            {"liveid": c.liveid, "name": c.name, "address": c.address}
            for c in self._discovered.values()
        ]

    # ── Verbindung ───────────────────────────────────────────────────────────

    def connect(self, liveid: str) -> dict:
        """
        Verbindet mit der Xbox.

        Strategie:
          1. Auth-Connect (XSTS-Token) — bis zu 3 Versuche à 25 s.
             Zwischen Versuchen: Re-Discovery für frischen Console-Zustand,
             da ein Timeout den internen Protokoll-State korrumpieren kann.
          2. Anonymer Fallback — nur wenn alle Auth-Versuche scheitern.
             pairing=NotPaired → Xbox ignoriert Gamepad-Input!
        """
        console = self._discovered.get(liveid)
        if console is None:
            raise ValueError(f"Konsole '{liveid}' nicht in Discovery-Ergebnissen.")

        # Vorherige Verbindung sauber trennen
        if self._console is not None:
            log.info("Trenne bestehende Verbindung.")
            try:
                self._run(self._console.disconnect(), timeout=5)
            except Exception as e:
                log.warning("Trennen fehlgeschlagen (ignoriert): %s", e)
            self._console = None

        # Verbindungsoptionen der Xbox loggen
        log.info("Xbox Verbindungsoptionen: anonym=%s  auth=%s  console_users=%s",
                 console.anonymous_connection_allowed,
                 console.authenticated_users_allowed,
                 console.console_users_allowed)

        # Mutable Referenz: kann durch Re-Discovery aktualisiert werden
        _cref = [console]

        async def _do_connect():
            async with self._connect_lock:
                # ── Auth-Connect: bis zu 3 Versuche ──────────────────────────
                for attempt in range(3):
                    c = _cref[0]

                    # Ab Versuch 2: Re-Discovery für frischen Console-Zustand.
                    # Nach einem Timeout kann das Console-Objekt internen State halten
                    # (halb-geöffnete Sockets, Protokoll-Flags) — frische Instanz ist sicher.
                    if attempt > 0:
                        log.info("Re-Discovery für Auth-Retry %d/3 ...", attempt + 1)
                        try:
                            found = await asyncio.wait_for(
                                Console.discover(timeout=3), timeout=8
                            )
                            for fc in found:
                                if fc.liveid == liveid:
                                    _cref[0] = fc
                                    c = fc
                                    log.info("Re-Discovery: frische Console-Instanz erhalten.")
                                    break
                            else:
                                log.warning("Re-Discovery: Konsole '%s' nicht gefunden.", liveid)
                        except Exception as re_err:
                            log.warning("Re-Discovery fehlgeschlagen: %s", re_err)

                    try:
                        log.info("Auth-Connect Versuch %d/3 (Timeout 25 s)...", attempt + 1)
                        uh, xt = await _load_auth()
                        s = await asyncio.wait_for(
                            c.connect(userhash=uh, xsts_token=xt), timeout=25
                        )
                        log.info(
                            "Auth-Connect OK (Versuch %d): state=%s  pairing=%s",
                            attempt + 1, s, c.pairing_state,
                        )
                        return s
                    except asyncio.TimeoutError:
                        log.warning(
                            "Auth-Connect Timeout (Versuch %d/3)%s",
                            attempt + 1,
                            " — weiterer Versuch..." if attempt < 2 else " — gebe auf.",
                        )
                        if attempt < 2:
                            await asyncio.sleep(2)
                    except Exception as e:
                        log.warning(
                            "Auth-Connect Fehler (Versuch %d/3): %s", attempt + 1, e
                        )
                        if attempt < 2:
                            await asyncio.sleep(2)

                # ── Anonymer Fallback ─────────────────────────────────────────
                log.warning(
                    "Alle Auth-Versuche fehlgeschlagen — anonymer Fallback. "
                    "pairing=NotPaired → Gamepad-Buttons werden von der Xbox IGNORIERT!"
                )
                c = _cref[0]
                s = await asyncio.wait_for(c.connect(), timeout=15)
                log.info("Anon-Connect: state=%s  pairing=%s", s, c.pairing_state)
                return s

        # Timeout: 3 × (25 s Auth + 8 s Re-Discovery + 2 s Sleep) + 15 s Anon + Puffer
        state = self._run(_do_connect(), timeout=130)
        if not state:
            raise RuntimeError("Verbindung fehlgeschlagen")
        if state != ConnectionState.Connected:
            raise RuntimeError(f"Verbindung fehlgeschlagen: state={state}")

        # Aktuell gültige Console-Referenz verwenden (ggf. aus Re-Discovery)
        console = _cref[0]

        # InputManager registrieren
        console.add_manager(InputManager)
        # SystemInput-Channel muss von der Xbox bestätigt werden (StartChannelAck).
        # 2 s statt 0,8 s — gibt dem Channel genug Zeit sich vollständig zu öffnen.
        self._run(asyncio.sleep(2.0))

        self._console = console
        self._last_liveid = liveid
        log.info("Verbunden mit: %s  |  pairing=%s", console.name, console.pairing_state)
        return {
            "liveid":  console.liveid,
            "name":    console.name,
            "address": console.address,
            "pairing": console.pairing_state.name,
        }

    def reconnect(self) -> dict:
        """
        Verbindet erneut zur zuletzt bekannten Xbox.
        Führt einen kurzen Scan durch (4 s), dann connect() mit Auth-Retry.
        Kein manueller Scan im UI nötig.
        """
        if not self._last_liveid:
            raise RuntimeError(
                "Keine bekannte Konsole. Bitte zuerst Scan + Verbinden."
            )
        liveid = self._last_liveid
        log.info("Reconnect zu LiveID %s ...", liveid)

        # Kurzer Scan für frische Console-Objekte
        found = self.discover(timeout=4)
        if not any(c["liveid"] == liveid for c in found):
            raise RuntimeError(
                f"Konsole nicht gefunden. Xbox eingeschaltet und im selben Netzwerk?"
            )
        return self.connect(liveid)

    def disconnect(self) -> None:
        if self._console:
            try:
                self._run(self._console.disconnect(), timeout=5)
            except Exception as e:
                log.warning("Fehler beim Trennen: %s", e)
            finally:
                self._console = None

    @property
    def connected(self) -> bool:
        """True nur wenn Verbindung aktiv und ConnectionState == Connected."""
        if self._console is None:
            return False
        try:
            return self._console.connection_state == ConnectionState.Connected
        except Exception:
            return False

    @property
    def console_info(self) -> Optional[dict]:
        if not self._console:
            return None
        return {
            "liveid":  self._console.liveid,
            "name":    self._console.name,
            "address": self._console.address,
        }

    # ── Button senden ────────────────────────────────────────────────────────

    def send_button(self, button_name: str) -> None:
        """Sendet einen einzelnen Button-Druck an die Konsole."""
        if not self.connected:
            raise RuntimeError("Nicht verbunden.")

        btn = BUTTON_MAP.get(button_name)
        if btn is None:
            raise ValueError(
                f"Unbekannter Button: '{button_name}'. "
                f"Gültig: {list(BUTTON_MAP.keys())}"
            )

        console = self._console  # lokale Kopie (Thread-safe)

        async def _press():
            await console.gamepad_input(btn)
            await asyncio.sleep(0.1)                              # kurz gedrückt halten
            await console.gamepad_input(GamePadButton.Clear)      # loslassen

        try:
            self._run(_press())
        except Exception as e:
            # Sende-Fehler = Verbindung tot → Console zurücksetzen damit UI es merkt
            log.warning("Button-Send fehlgeschlagen (%s) — Verbindung als getrennt markiert.", e)
            self._console = None
            raise RuntimeError("Verbindung unterbrochen. Bitte neu verbinden.") from e

        log.info("Button gesendet: %s", button_name)

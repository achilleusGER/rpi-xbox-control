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

        # Persistenter Event Loop in eigenem Thread
        self._loop = asyncio.new_event_loop()
        self._loop_thread = threading.Thread(
            target=self._loop.run_forever,
            daemon=True,
            name="xbox-asyncio",
        )
        self._loop_thread.start()
        log.info("XboxClient: persistenter asyncio-Loop gestartet.")

    # ── Internes ─────────────────────────────────────────────────────────────

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
        Versucht zuerst anonym – das ist schnell und zuverlässig.
        Wenn die Xbox authentifizierte Verbindungen fordert, wird auf XSTS-Auth gewechselt.
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

        # ── Schritt 1: Anonymer Verbindungsversuch ────────────────────────────
        state = None
        if console.anonymous_connection_allowed:
            log.info("Versuche anonyme Verbindung...")
            try:
                state = self._run(console.connect(), timeout=15)
                log.info("Anonymer Connect: state=%s  pairing=%s",
                         state, console.pairing_state)
            except Exception as e:
                log.warning("Anonymer Connect fehlgeschlagen: %s", e)
                state = None

        # ── Schritt 2: Authentifizierter Fallback ─────────────────────────────
        if state != ConnectionState.Connected:
            log.info("Versuche authentifizierten Connect (XSTS)...")
            userhash, xsts_token = self._run(_load_auth())
            state = self._run(
                console.connect(userhash=userhash, xsts_token=xsts_token),
                timeout=90,
            )
            log.info("Auth-Connect: state=%s  pairing=%s", state, console.pairing_state)

        if state != ConnectionState.Connected:
            raise RuntimeError(f"Verbindung fehlgeschlagen: state={state}")

        # InputManager registrieren
        console.add_manager(InputManager)
        # Kurz warten – async. StartChannelResponse-Pakete müssen ankommen
        self._run(asyncio.sleep(0.8))

        self._console = console
        log.info("Verbunden mit: %s  |  pairing=%s", console.name, console.pairing_state)
        return {
            "liveid":  console.liveid,
            "name":    console.name,
            "address": console.address,
            "pairing": console.pairing_state.name,
        }

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

        async def _press():
            await self._console.gamepad_input(btn)
            await asyncio.sleep(0.1)                               # kurz gedrückt halten
            await self._console.gamepad_input(GamePadButton.Clear) # loslassen

        self._run(_press())
        log.info("Button gesendet: %s", button_name)

"""
xbox_client.py
Wrapper um xbox-smartglass-core für Discovery, Verbindung und Button-Eingaben.

WICHTIG – Event-Loop-Design:
  SmartGlass nutzt asyncio intern (UDP-Transport, Heartbeats, Protokoll-State).
  Alle diese Objekte sind an genau EINEN Event Loop gebunden.
  Deshalb läuft hier EIN persistenter Loop in einem Hintergrundthread.
  Alle Operationen werden per asyncio.run_coroutine_threadsafe() dorthin übergeben.
  Früheres Problem: new_event_loop() pro Aufruf → Protokoll-Objekte gehören zum
  alten (geschlossenen) Loop → send_button gibt keinen Fehler, tut aber nichts.
"""

import asyncio
import logging
import threading
from typing import Optional

from xbox.sg.console import Console
from xbox.sg.enum import GamePadButton
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
        """Übergibt eine Coroutine an den Hintergrundloop und wartet auf das Ergebnis."""
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        return future.result(timeout=timeout)

    # ── Discovery ────────────────────────────────────────────────────────────

    def discover(self, timeout: int = 5) -> list[dict]:
        """
        Sucht Xbox-Konsolen im lokalen Netzwerk per UDP-Broadcast.
        Gibt eine Liste von Dicts zurück: [{liveid, name, address}, ...]
        """
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
        """Verbindet mit einer zuvor entdeckten Konsole."""
        console = self._discovered.get(liveid)
        if console is None:
            raise ValueError(f"Konsole '{liveid}' nicht in Discovery-Ergebnissen.")

        self._run(console.connect())

        # InputManager registrieren – stellt gamepad_input() bereit
        console.add_manager(InputManager)

        self._console = console
        log.info("Verbunden mit: %s", console.name)
        return {
            "liveid":  console.liveid,
            "name":    console.name,
            "address": console.address,
        }

    def disconnect(self) -> None:
        if self._console:
            try:
                self._run(self._console.disconnect())
            except Exception as e:
                log.warning("Fehler beim Trennen: %s", e)
            finally:
                self._console = None

    @property
    def connected(self) -> bool:
        return self._console is not None

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
        if not self._console:
            raise RuntimeError("Nicht verbunden.")

        btn = BUTTON_MAP.get(button_name)
        if btn is None:
            raise ValueError(
                f"Unbekannter Button: '{button_name}'. "
                f"Gültig: {list(BUTTON_MAP.keys())}"
            )

        async def _press():
            await self._console.gamepad_input(btn)
            await asyncio.sleep(0.1)                              # kurz gedrückt halten
            await self._console.gamepad_input(GamePadButton.Clear)  # loslassen

        self._run(_press())
        log.info("Button gesendet: %s", button_name)

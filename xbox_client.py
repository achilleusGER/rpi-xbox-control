"""
xbox_client.py
Wrapper um xbox-smartglass-core für Discovery, Verbindung und Button-Eingaben.
"""

import asyncio
import logging
from typing import Optional

from xbox.sg.console import Console
from xbox.sg.enum import GamePadButton

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
    """Verwaltet eine einzelne Verbindung zu einer Xbox-Konsole."""

    def __init__(self) -> None:
        self._console: Optional[Console] = None
        self._discovered: dict[str, Console] = {}   # liveid → Console

    # ── Discovery ────────────────────────────────────────────────────────────

    def discover(self, timeout: int = 5) -> list[dict]:
        """
        Sucht Xbox-Konsolen im lokalen Netzwerk per UDP-Broadcast.
        Gibt eine Liste von Dicts zurück: [{liveid, name, address}, ...]
        """
        self._discovered = {}
        loop = asyncio.new_event_loop()
        try:
            consoles: list[Console] = loop.run_until_complete(
                Console.discover(timeout=timeout)
            )
        finally:
            loop.close()

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

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(console.connect())
        finally:
            loop.close()

        self._console = console
        log.info("Verbunden mit: %s", console.name)
        return {"liveid": console.liveid, "name": console.name, "address": console.address}

    def disconnect(self) -> None:
        if self._console:
            try:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(self._console.disconnect())
                loop.close()
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
            "liveid": self._console.liveid,
            "name":   self._console.name,
            "address": self._console.address,
        }

    # ── Button senden ────────────────────────────────────────────────────────

    def send_button(self, button_name: str) -> None:
        """Sendet einen einzelnen Button-Druck an die Konsole."""
        if not self._console:
            raise RuntimeError("Nicht verbunden.")

        btn = BUTTON_MAP.get(button_name)
        if btn is None:
            raise ValueError(f"Unbekannter Button: '{button_name}'. "
                             f"Gültig: {list(BUTTON_MAP.keys())}")

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self._console.send_gamepad_button(btn))
        finally:
            loop.close()
        log.debug("Button gesendet: %s", button_name)

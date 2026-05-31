"""
xbox_auth.py
Headless-taugliche Xbox-Authentifizierung für den Raspberry Pi.
Gibt die Auth-URL direkt im Terminal aus statt einen Browser zu öffnen.

Verwendung:
  source ~/xbox-ctrl-venv/bin/activate
  python ~/rpi-xbox-control/xbox_auth.py
"""

import asyncio
import os
from pathlib import Path

from aiohttp import ClientSession, web
from xbox.webapi.authentication.manager import AuthenticationManager
from xbox.webapi.authentication.models import OAuth2TokenResponse
from xbox.webapi.scripts import CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, TOKENS_FILE

queue: asyncio.Queue = asyncio.Queue(1)


async def auth_callback(request):
    error = request.query.get("error")
    if error:
        print(f"\n✗ Fehler: {request.query.get('error_description', error)}")
        await queue.put(None)
        return web.Response(text="<h2>Fehler bei der Authentifizierung.</h2>",
                            content_type="text/html")
    asyncio.create_task(queue.put(request.query["code"]))
    return web.Response(
        text="<h2>✓ Authentifizierung erfolgreich! Du kannst diesen Tab schließen.</h2>",
        content_type="text/html",
    )


async def async_main():
    tokens_file = Path(TOKENS_FILE)

    async with ClientSession() as session:
        auth_mgr = AuthenticationManager(session, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

        # Vorhandene Tokens laden und erneuern
        if tokens_file.exists():
            auth_mgr.oauth = OAuth2TokenResponse.parse_raw(tokens_file.read_text())
            try:
                await auth_mgr.refresh_tokens()
                print("✓ Token erfolgreich erneuert.")
            except Exception as e:
                print(f"  Token-Erneuerung fehlgeschlagen: {e} – neu authentifizieren...")
                auth_mgr.oauth = None  # type: ignore

        # Neue Tokens holen wenn nicht vorhanden / abgelaufen
        if not (auth_mgr.xsts_token and auth_mgr.xsts_token.is_valid()):
            auth_url = auth_mgr.generate_authorization_url()
            print("\n" + "═" * 60)
            print("  Xbox-Konto authentifizieren")
            print("═" * 60)
            print("\n  Öffne diese URL auf deinem PC oder Handy:\n")
            print(f"  {auth_url}\n")
            print("═" * 60)
            print("  Warte auf Callback (nach Login automatisch)...\n")

            code = await queue.get()
            if code is None:
                print("✗ Abgebrochen.")
                return

            await auth_mgr.request_tokens(code)

        tokens_file.parent.mkdir(parents=True, exist_ok=True)
        tokens_file.write_text(auth_mgr.oauth.json())
        print(f"✓ Tokens gespeichert: {tokens_file}")


def main():
    aio_app = web.Application()
    aio_app.add_routes([web.get("/auth/callback", auth_callback)])
    runner = web.AppRunner(aio_app)

    loop = asyncio.get_event_loop()
    loop.run_until_complete(runner.setup())
    site = web.TCPSite(runner, "localhost", 8080)
    loop.run_until_complete(site.start())
    print("OAuth-Callback-Server läuft auf http://localhost:8080")
    loop.run_until_complete(async_main())


if __name__ == "__main__":
    main()

# Xbox Controller – Raspberry Pi Automation

Steuert eine Xbox-Konsole über das lokale Netzwerk (SmartGlass-Protokoll),
hält einen per USB angeschlossenen Controller wach und bietet ein Web-Interface
zum Erstellen, Verwalten und Ausführen von Tastensequenzen.

## Projektstruktur

```
xbox-controller/
├── backend/
│   ├── app.py                  # Flask API-Server
│   ├── xbox_client.py          # SmartGlass-Wrapper
│   ├── keepalive.py            # Controller-Keep-Alive (evdev)
│   ├── sequences.json          # Sequenz-Bibliothek (auto-generiert)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Haupt-React-App (Editor)
│   │   └── main.jsx
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── vite.config.js
├── systemd/
│   ├── xbox-webapp.service     # systemd: Web-App
│   └── xbox-keepalive.service  # systemd: Keep-Alive
├── install.sh                  # Einrichtungs-Skript für den Pi
└── README.md
```

## Schnellstart (Raspberry Pi)

```bash
# 1. Repo klonen / Projekt übertragen
cd ~
git clone <dein-repo> xbox-controller   # oder per scp

# 2. Alles installieren
cd xbox-controller
chmod +x install.sh
./install.sh

# 3. Xbox-Konto einmalig authentifizieren
source ~/xbox-ctrl-venv/bin/activate
xbox-authenticate

# 4. Services starten
sudo systemctl start xbox-webapp
sudo systemctl start xbox-keepalive
```

Web-Interface: http://<PI-IP>:8080

## Voraussetzungen Xbox

- Xbox auf **Sleep-Modus** (nicht Energy Saving)
- **Remote Features** aktiviert:
  Einstellungen → Geräte & Verbindungen → Remote-Features → An
- Microsoft-Account (Erwachsenen-Konto, 18+)

## Voraussetzungen Pi

- Raspberry Pi 3B+ oder neuer
- Raspberry Pi OS (Bookworm empfohlen)
- Python 3.10+
- Node.js 18+ (für Frontend-Build)
- Xbox Controller per USB angeschlossen

## Sequenz-Format (sequences.json)

```json
{
  "Mein Ablauf": [
    { "type": "button", "button": "A" },
    { "type": "wait",   "seconds": 2.0 },
    { "type": "button", "button": "B" }
  ]
}
```

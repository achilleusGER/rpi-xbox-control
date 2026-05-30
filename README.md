# Xbox Controller – Raspberry Pi Automation

Steuert eine Xbox-Konsole über das lokale Netzwerk (SmartGlass-Protokoll),
hält einen per USB angeschlossenen Controller wach und bietet ein Web-Interface
zum Erstellen, Verwalten und Ausführen von Tastensequenzen.

## Projektstruktur

```
rpi-xbox-control/
├── App.jsx          # React-Frontend (Smartphone-UI)
├── app.py           # Flask REST-API
├── xbox_client.py   # SmartGlass-Wrapper
├── keepalive.py     # Controller-Keep-Alive (evdev)
├── install.sh       # Einrichtungs-Skript für den Pi
└── README.md
```

## Schnellstart (Raspberry Pi)

```bash
# 1. Repo klonen
cd ~
git clone https://github.com/achilleusGER/rpi-xbox-control
cd rpi-xbox-control

# 2. Alles installieren
chmod +x install.sh
./install.sh

# 3. Xbox-Konto einmalig authentifizieren
source ~/xbox-ctrl-venv/bin/activate
xbox-authenticate

# 4. Services starten
sudo systemctl start xbox-webapp
sudo systemctl start xbox-keepalive

# WICHTIG: Danach neu einloggen (Gruppe 'input' muss aktiv sein)
```

Web-Interface: `http://<PI-IP>:8080`

## Voraussetzungen Xbox

- Xbox auf **Sleep-Modus** (nicht Energy Saving)
- **Remote Features** aktiviert:
  Einstellungen → Geräte & Verbindungen → Remote-Features → An
- Microsoft-Account (Erwachsenen-Konto, 18+)

## Voraussetzungen Pi

- Raspberry Pi 3B+ oder neuer
- Raspberry Pi OS Bookworm (empfohlen)
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

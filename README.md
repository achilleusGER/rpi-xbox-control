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

---

## Verwendete Bibliotheken & Quellen

### Backend (Python)

| Bibliothek | Zweck | Quelle |
|---|---|---|
| **xbox-smartglass-core** | SmartGlass-Protokoll: Discovery, Verbindung, Gamepad-Buttons | [OpenXbox/xbox-smartglass-core-python](https://github.com/OpenXbox/xbox-smartglass-core-python) |
| **Flask** | REST-API-Server | [palletsprojects.com/p/flask](https://palletsprojects.com/p/flask/) |
| **Flask-CORS** | Cross-Origin-Requests vom Frontend erlauben | [github.com/corydolphin/flask-cors](https://github.com/corydolphin/flask-cors) |
| **evdev** | Linux-Input-Geräte ansprechen (Keep-Alive-Rumble) | [github.com/gvalkov/python-evdev](https://github.com/gvalkov/python-evdev) |

### Frontend (JavaScript)

| Bibliothek | Zweck | Quelle |
|---|---|---|
| **React** | UI-Framework | [react.dev](https://react.dev) |
| **Vite** | Build-Tool / Dev-Server | [vitejs.dev](https://vitejs.dev) |

### Design

| Tool | Zweck | Quelle |
|---|---|---|
| **Hallmark** | Anti-AI-Slop Design Skill (OKLCH-Tokens, Smartphone-Layout) | [github.com/Nutlope/hallmark](https://github.com/Nutlope/hallmark) |
| **Space Grotesk** | Display-Schrift | [fonts.google.com/specimen/Space+Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |
| **Inter** | Fließtext-Schrift | [rsms.me/inter](https://rsms.me/inter) |
| **JetBrains Mono** | Monospace-Schrift (Werte, Metriken) | [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/) |

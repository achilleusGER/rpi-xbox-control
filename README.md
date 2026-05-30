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

### Schritt 0 — Einmalig: Git installieren

Auf einem frischen Raspberry Pi OS muss Git zuerst manuell installiert werden,
da es zum Klonen des Repos benötigt wird:

```bash
sudo apt-get update && sudo apt-get install -y git
```

> Alles weitere (Python, pip, Node.js, npm, Flask, …) installiert `install.sh` automatisch.

### Schritt 1 — Repo klonen

```bash
cd ~
git clone https://github.com/achilleusGER/rpi-xbox-control
cd rpi-xbox-control
```

### Schritt 2 — Setup ausführen

```bash
chmod +x install.sh
./install.sh
```

### Schritt 3 — Xbox-Konto einmalig authentifizieren

```bash
source ~/xbox-ctrl-venv/bin/activate
xbox-authenticate
```

→ Öffnet einen Link — im Browser mit dem Microsoft-Account einloggen.

### Schritt 4 — Services starten

```bash
sudo systemctl start xbox-webapp
sudo systemctl start xbox-keepalive
```

### Schritt 5 — Neu einloggen ⚠️

```bash
# Ausloggen und wieder einloggen!
# (Damit die Gruppe 'input' für den USB-Controller aktiv wird.)
```

### Fertig

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

#!/bin/bash
# install.sh – Einrichtungs-Skript für Xbox Controller auf dem Raspberry Pi
set -e

VENV="$HOME/xbox-ctrl-venv"
PROJECT="$HOME/xbox-controller"
NODE_MIN=18

echo "======================================"
echo " Xbox Controller – Setup"
echo "======================================"

# ── System-Pakete ──────────────────────────────────────────────────

echo "[1/6] System-Pakete installieren..."
sudo apt-get update -q
sudo apt-get install -y python3 python3-pip python3-venv git curl

# Node.js prüfen / installieren
if ! command -v node &>/dev/null || [ "$(node -e 'process.stdout.write(process.version.slice(1).split(".")[0])')" -lt "$NODE_MIN" ]; then
  echo "      Node.js $NODE_MIN+ wird installiert..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "      Node $(node --version), npm $(npm --version)"

# ── Python venv + Abhängigkeiten ───────────────────────────────────

echo "[2/6] Python-Umgebung einrichten..."
python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip -q
"$VENV/bin/pip" install -r "$PROJECT/backend/requirements.txt" -q
echo "      Pakete installiert."

# ── Frontend bauen ─────────────────────────────────────────────────

echo "[3/6] Frontend bauen..."
cd "$PROJECT/frontend"
npm install --silent
npm run build
echo "      Build abgeschlossen → backend/static/"

# ── Flask: statische Dateien einbinden ────────────────────────────

# Flask soll den gebauten Frontend-Code auch ohne separaten Webserver ausliefern.
# Dazu wird app.py so konfiguriert, dass /  → backend/static/index.html liefert.
# (Bereits in app.py via static_folder vorbereitet – wird hier nur geprüft.)

# ── systemd Services ───────────────────────────────────────────────

echo "[4/6] systemd Services einrichten..."

for svc in xbox-webapp xbox-keepalive; do
  sudo cp "$PROJECT/systemd/${svc}.service" /etc/systemd/system/
done

sudo systemctl daemon-reload
sudo systemctl enable xbox-webapp xbox-keepalive
echo "      Services registriert."

# ── Controller-Berechtigung ────────────────────────────────────────

echo "[5/6] USB-Controller-Berechtigung (udev-Regel)..."
UDEV_RULE='SUBSYSTEM=="input", ATTRS{idVendor}=="045e", GROUP="input", MODE="0664"'
echo "$UDEV_RULE" | sudo tee /etc/udev/rules.d/99-xbox-controller.rules > /dev/null
sudo udevadm control --reload-rules
sudo usermod -aG input "$USER"
echo "      udev-Regel gesetzt."

# ── Fertig ─────────────────────────────────────────────────────────

echo "[6/6] Fertig!"
echo ""
echo "  Nächster Schritt: Xbox-Konto authentifizieren"
echo "  ─────────────────────────────────────────────"
echo "  source $VENV/bin/activate"
echo "  xbox-authenticate"
echo ""
echo "  Danach Services starten:"
echo "  sudo systemctl start xbox-webapp xbox-keepalive"
echo ""
echo "  Web-Interface: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "  WICHTIG: Danach neu einloggen (Gruppe 'input' aktiv)"

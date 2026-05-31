#!/bin/bash
# install.sh – Einrichtungs-Skript für Xbox Controller auf dem Raspberry Pi
set -e

VENV="$HOME/xbox-ctrl-venv"
PROJECT="$HOME/rpi-xbox-control"
NODE_MIN=18

echo "======================================"
echo " Xbox Controller – Setup"
echo "======================================"

# ── System-Pakete ──────────────────────────────────────────────────

echo "[1/6] System-Pakete installieren..."
# Fehler bei einzelnen Repos nicht abbrechen:
# archive.raspberrypi.com/debian hat noch kein Trixie-Release (Stand 2025).
sudo apt-get update -q || true

sudo apt-get install -y \
  python3-pip python3-setuptools python3-venv build-essential \
  python3-cryptography \
  git curl

# ── Python-Version für das venv ────────────────────────────────────────────
# Python 3.13 (Trixie-Default) ist inkompatibel mit dem alten gevent, das
# xbox-smartglass-core mitbringt (longintrepr.h in Py 3.13 entfernt).
# Python 3.12 hat longintrepr.h noch und piwheels liefert fertige Wheels.
PYTHON=""
for py in python3.12 python3.11; do
  if command -v "$py" &>/dev/null; then
    PYTHON="$py"
    break
  fi
done
if [ -z "$PYTHON" ]; then
  echo "      python3.12 wird installiert..."
  if sudo apt-get install -y python3.12 python3.12-venv python3.12-dev -q 2>/dev/null; then
    PYTHON=python3.12
  else
    echo "      python3.11 wird installiert..."
    sudo apt-get install -y python3.11 python3.11-venv python3.11-dev -q
    PYTHON=python3.11
  fi
fi
# venv + dev-Headers für die gewählte Version sicherstellen
sudo apt-get install -y "${PYTHON}-venv" "${PYTHON}-dev" -q 2>/dev/null || true
echo "      $($PYTHON --version)"

# Node.js prüfen / installieren
if ! command -v node &>/dev/null || [ "$(node -e 'process.stdout.write(process.version.slice(1).split(".")[0])')" -lt "$NODE_MIN" ]; then
  echo "      Node.js $NODE_MIN+ wird installiert..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "      Node $(node --version), npm $(npm --version)"

# ── Python venv + Abhängigkeiten ───────────────────────────────────

echo "[2/6] Python-Umgebung einrichten..."
# Frisches venv ohne --system-site-packages:
# xbox-smartglass-core 1.3.0 pinnt cryptography==3.2.1 (inkompatibel mit apt 38.x).
# Mit --no-deps installieren, dann nur die tatsächlich nötigen Laufzeit-Deps.
# uvicorn==0.12.2 (ungültige Metadaten in pip≥24.1) und fastapi/urwid (CLI-Tools)
# werden absichtlich NICHT installiert – wir nutzen Flask statt fastapi.
rm -rf "$VENV"
$PYTHON -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip setuptools wheel -q -i https://pypi.org/simple
"$VENV/bin/pip" install flask flask-cors -q
"$VENV/bin/pip" install 'xbox-smartglass-core==1.3.0' --no-deps -q
"$VENV/bin/pip" install \
  'construct==2.10.56' \
  'cryptography' \
  'dpkt' \
  'pydantic<2' \
  'xbox-webapi' \
  'aioconsole' \
  'requests' \
  'evdev' \
  --no-build-isolation -q
echo "      Pakete installiert."

# ── Frontend bauen ─────────────────────────────────────────────────

echo "[3/6] Frontend bauen..."
cd "$PROJECT"
npm install --silent
npm run build
echo "      Build abgeschlossen."

# ── systemd Services ───────────────────────────────────────────────

echo "[4/6] systemd Services einrichten..."

for svc in xbox-webapp xbox-keepalive; do
  sudo sed \
    -e "s|__USER__|$(whoami)|g" \
    -e "s|__PROJECT__|$PROJECT|g" \
    -e "s|__VENV__|$VENV|g" \
    "$PROJECT/systemd/${svc}.service" \
    | sudo tee /etc/systemd/system/${svc}.service > /dev/null
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

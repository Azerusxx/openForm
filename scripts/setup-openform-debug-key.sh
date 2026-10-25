#!/usr/bin/env bash
# Run once on YOUR Linux computer, never on GitHub Actions.
# The private key stays OUTSIDE the Git repository. Never upload/share it.
set -euo pipefail
command -v keytool >/dev/null || { echo 'Fehlt: keytool (Java JDK installieren, z. B. openjdk-21-jdk).'; exit 1; }
command -v base64 >/dev/null || { echo 'Fehlt: base64'; exit 1; }
KEY_DIR="$HOME/.config/openform"
KEY_PATH="$KEY_DIR/debug.keystore"
B64_PATH="$KEY_DIR/debug-keystore-base64.txt"
mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"
if [ ! -f "$KEY_PATH" ]; then
  keytool -genkeypair -noprompt \
    -keystore "$KEY_PATH" -storetype PKCS12 \
    -storepass android -keypass android -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname 'CN=openForm Debug,O=openForm,C=AT'
  echo 'Neuer privater Debug-Schluessel angelegt.'
else
  echo 'Vorhandenen Schluessel beibehalten. NICHT ueberschreiben.'
fi
chmod 600 "$KEY_PATH"
base64 -w0 "$KEY_PATH" > "$B64_PATH"
chmod 600 "$B64_PATH"
echo
echo 'Einrichtung fuer GitHub:'
echo '1. GitHub Repo > Settings > Secrets and variables > Actions > New repository secret'
echo '2. Name: OPENFORM_DEBUG_KEYSTORE_B64'
echo "3. Value: kompletter Inhalt von $B64_PATH"
echo '4. Niemals den geheimen Inhalt in Chats, Commits oder Screenshots teilen.'
echo '5. debug.keystore sicher ausserhalb des Repositories sichern (Backup).'

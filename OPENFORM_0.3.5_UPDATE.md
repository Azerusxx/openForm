# openForm 0.3.5 – Update und lokale Daten

**Die bestehende Android-Paket-ID bleibt `app.openform.personal.test`.** Ein älterer, anders signierter Debug-Build kann unter dieser Paket-ID nicht durch eine neue APK überschrieben werden. Das ist keine App-Einstellung, sondern Androids Signaturprüfung.

## Vor jeder Installation
In openForm **Einstellungen → Komplettbackup exportieren** verwenden. Die Datei sicher außerhalb der App aufbewahren; Fotos und Videos separat exportieren. **Nicht deinstallieren, solange die Daten nicht extern gesichert sind.**

## Signatur vergleichen (mit USB-Debugging und Android Platform Tools)
```sh
adb shell pm path app.openform.personal.test
adb pull "$(adb shell pm path app.openform.personal.test | head -1 | sed 's/^package://' | tr -d '\r')" installed-openform.apk
apksigner verify --print-certs installed-openform.apk
```
Den SHA-256-Zertifikat-Fingerabdruck mit dem GitHub-Actions-Schritt **APK-Signatur und Paket-Identität prüfen** vergleichen. Stimmt er nicht überein, ist ein direktes Update **unmöglich**, solange der ursprüngliche Schlüssel nicht wiederverwendet werden kann. Stimmt er überein, Paket-ID und versionCode auf Konflikte prüfen. Das Deinstallieren löscht App-Daten.

## Zusätzlicher Schutz
Beim ersten Öffnen von 0.3.5 speichert die App, wenn Platz vorhanden ist, ein einmaliges unveränderliches Abbild der Rohdaten aus `gym_state_v1` und `openform_nutrition_v1` unter `openform_pre_035_checkpoint`. Beide Originalschlüssel bleiben unangetastet. **Der Checkpoint liegt ebenfalls im App-Speicher und geht beim Deinstallieren verloren.** Er ist kein Ersatz für einen externen Export.

Ernährung wird weiterhin nicht automatisch über die Trainings-Cloud synchronisiert.

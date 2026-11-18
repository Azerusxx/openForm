# openForm: APK-Installation schlägt mit „Paket offenbar ungültig“ fehl

Dieser Hinweis ist eine **generische Android-Meldung**. Ohne die konkrete Antwort des Android PackageManager lässt sich nicht entscheiden, ob ein Downgrade, eine abweichende Signatur, ein Paketproblem oder eine Gerätebeschränkung vorliegt.

## Bereits geprüfte hochgeladene APKs (18.11.2026)
- `app-debug.apk`: Paket `app.openform.personal.test`, `versionName=0.3.7h`, `versionCode=1353`, SHA-256 `7185a386114d7f60855c9b3f2a2bad97b5dc5715cef20987b5d751b530d15976`
- `app-debug(1).apk`: Paket `app.openform.personal.test`, `versionName=0.3.7h`, `versionCode=1344`, SHA-256 `3272803bd65e2b907479bd1f31d02bdebc5d217c21350f1e359d20b1aa6d7c27`
- Beide ZIP-Container sind strukturell lesbar (`ZipFile.testzip() == None`), besitzen einen APK Signature Scheme v2 Block und führen das gleiche Zertifikat. Ein gültiger *Container* allein bestätigt nicht die gesamte Android-Installierbarkeit.
- Beide APKs enthalten noch RepDB-Medien aus älteren Builds und sind **nicht** die angestrebte Fork180-Medienversion.
- **Unbekannt:** Signatur und `versionCode` des **bereits installierten** Pakets auf dem Handy. GitHub Actions kann das nicht lesen.

## Kein Datenverlust: erst Diagnose
Niemals die App auf Verdacht deinstallieren, App-Daten löschen, die Paket-ID wechseln, einen neuen Schlüssel als „Reparatur“ verwenden oder mit `adb install -d` einen Downgrade erzwingen.

Am Linux-PC Android platform-tools installieren und USB-Debugging am Handy freigeben. Die APK in den Projektordner legen oder ihren absoluten Pfad angeben.

```bash
sudo apt install adb
adb devices -l
bash scripts/diagnose-android-install.sh ~/Downloads/app-debug.apk
```

Das obige Kommando liest vorhandene Paketinformationen und validiert den ZIP-Container, **installiert aber noch nichts**. Für einen ausdrücklich gewollten normalen Upgradeversuch ohne Datenlöschung:

```bash
bash scripts/diagnose-android-install.sh ~/Downloads/app-debug.apk --install
```

Das Skript ruft nur `adb install -r -t` auf (keine Deinstallation, kein Datenreset, kein Downgrade). Die Ausgabe des PackageManager identifiziert den tatsächlichen Fehler.

### Interpretation
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`: Die vorhandene App und APK sind unterschiedlich signiert. Nur der **ursprüngliche Signaturschlüssel** kann ein direktes Update ermöglichen. Ohne ihn Backup-Verfahren und gesonderte, explizit freigegebene Migration planen.
- `INSTALL_FAILED_VERSION_DOWNGRADE`: Mit demselben Schlüssel eine neue APK mit **höherem versionCode** bauen. Die sichtbare `versionName` reicht nicht aus.
- `INSTALL_PARSE_FAILED_*`, `NO_CERTIFICATES`, `INVALID_APK`: APK/Manifest/Signatur prüfen; GitHub-Artifact neu erzeugen, nicht mit ZIP-Dateimanagern bearbeiten.
- `INSTALL_FAILED_BLOCKED`, `USER_RESTRICTED`: System- oder Administratorrichtlinien prüfen.
- `Success`: Installation gelungen; A/B/C-Pläne, Historie, Ernährung und eigene Fotos kontrollieren.

## GitHub Actions
Die Workflow-Prüfung kontrolliert Signatur und Paket-ID der **neu gebauten APK**, kann aber nicht die bereits installierte APK vom Nutzerhandy vergleichen. Der neue Diagnosebefehl liefert den fehlenden Android-Fehlercode. Die Debug-App-ID muss weiterhin `app.openform.personal.test` bleiben und das stabile Secret `OPENFORM_DEBUG_KEYSTORE_B64` ist unverändert zu verwenden.

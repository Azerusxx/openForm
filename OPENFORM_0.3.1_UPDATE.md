# openForm 0.3.1 – Ernährung und openGym-Import prüfen

Dieses Paket baut auf openForm 0.3.0 auf. Bitte nur den **0.3.1-Patch** in dein bestehendes lokales GitHub-Repository entpacken, wenn du 0.3.0 bereits hochgeladen hast. Die App nutzt die vorhandenen Speicher- und Trainingsdaten weiter.

## Änderungen

- Essen: Startansicht mit Kalorien/Protein, Tagesbilanz, Schnellaktionen (Barcode, Suche, manuell, Barcode im Foto) und Mahlzeiten; Rezepte, Analyse, Supplements unter „Mehr“.
- Essen: Flammen-Symbol und großer runder Button bleiben unverändert.
- Einstellungen → Daten & Backup: „Altes openGym-Backup importieren“ zeigt **vorher** die Anzahl Trainings, Pläne, Gewichte, Maße und eigene Übungen.
- Leere Backups werden nicht mehr als erfolgreicher Datenimport gemeldet und überschreiben nichts.
- Nach dem Import überprüft die App die Daten sowohl im aktiven Trainingsspeicher als auch im persistenten `gym_state_v1` und meldet genaue Zahlen. Wenn die Trainings nach einer nachgelagerten Änderung wieder verschwinden, erscheint eine Warnung.
- Alte JSON- und ZIP-Backups werden weiterhin vom Original-Importer gelesen. Die neue Prüfung **ersetzt** dessen Importlogik nicht.

## Installation vom Linux-PC

Im **lokalen Repository-Hauptverzeichnis** `~/.../Openform`:

```bash
unzip -o ~/Downloads/openForm-0.3.1-Update-Patch.zip -d .
git status --short
git add .github/workflows/android-apk.yml frontend/package.json frontend/package-lock.json frontend/android/app/build.gradle frontend/src/views/Nutrition.jsx frontend/src/views/Nutrition.css frontend/src/views/Settings.jsx frontend/src/lib/backup-review.js frontend/src/lib/backup-review.test.mjs frontend/src/lib/nutrition-navigation.test.mjs OPENFORM_0.3.1_UPDATE.md
git commit -m "openForm 0.3.1 Essen und Backup-Import prüfen"
git push origin main
```

Auf GitHub `Actions` den **neuesten erfolgreichen** APK-Build wählen. Das Artifact heißt `openForm-0.3.1-debug`. Die zuvor konfigurierte feste Debug-Signatur muss weiterhin im GitHub-Secret `OPENFORM_DEBUG_KEYSTORE_B64` hinterlegt sein. Sonst ist kein APK-Build möglich. Keystore und Secrets niemals ins Repository hochladen.

## Vor einem Import unbedingt

1. Bestehendes openForm-Komplettbackup und vorhandenes Original-openGym-Backup separat aufbewahren.
2. Erst **Altes openGym-Backup importieren** wählen, dann bei der Vorschau prüfen, ob darin die erwarteten Trainingszahlen stehen. `0 Trainings` bei einer erwarteten historischen Trainingsdatei ist **nicht normal**.
3. Nach dem Import auf „Stats“ und „Plan“ gehen. **Nicht deinstallieren**, bevor die Daten sichtbar sind.
4. Wenn die Vorschau zwar z. B. 30 Trainings anzeigt, nach dem Import aber nichts erscheint, das **ursprüngliche openGym-Backup als JSON** (nicht APK oder Bildschirmvideo) zur Analyse bereitstellen; dabei vorher prüfen, ob darin sensible Informationen enthalten sind.

## Verifikation

Die 24 gezielten Node-Tests sind bestanden. JSX wurde im Projekt hier nicht vollständig kompiliert. Der vollständige Web- und Android-Build muss auf GitHub Actions bestätigt werden. Ein echter Wiederherstellungstest mit *deinem* Backup ist noch offen.

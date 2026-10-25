# openForm 0.3.0 – zusammengeführter Stand (einschließlich 0.2.1)

## Enthalten

- Vorheriges 0.2.1: alte Ernährungs-Werbekachel ganz oben auf Home entfernt; Essen = großer orangener Kreis mit Flamme; Training = gleich großer grüner Kreis mit Hantel.
- Neuer kompakter Tagesüberblick auf Home **unter** dem Trainingsbereich: kcal/Protein mit Fortschrittsbalken; Tippen öffnet Essen.
- Ein gemeinsamer Profil-Bildschirm unter **Einstellungen → Profil & Ernährungsziele**: aktuelle Körpergewichte, Zielgewicht und Körpermaße werden direkt aus den bestehenden openGym-Daten gelesen. Ernährungsziele und Aktivitätsniveau bleiben in der Ernährungsspeicherung. Die Aktivität ändert Kalorien nicht automatisch.
- **Einstellungen → Daten & Backup → openForm Komplettbackup (JSON)** exportiert Training und Ernährung in einer Datei.
- **Komplettbackup importieren** liest nur vollständige openForm-JSON-Dateien, bestätigt vor dem Trainingsersatz und führt Ernährungseinträge anhand ihrer IDs zusammen. Alte openGym-Backups können weiterhin über **Import backup** importiert werden.
- Android Debug-APK `versionName 0.3.0` und die stabile Debug-Signatur aus dem 0.2.1-Patch sind enthalten.

## Wichtige Grenzen

- **Auto-Backup und Server-Synchronisierung decken aktuell nur Training ab**. Für eine vollständige Sicherung muss das neue Komplettbackup manuell exportiert werden.
- Fotos/Videos sind **nicht** im gemeinsamen JSON enthalten. Falls du Medien nutzt, zusätzlich das bereits vorhandene Medien-ZIP exportieren.
- Die Android-Signatur braucht die unten beschriebenen einmaligen GitHub-Secrets. Ohne Secret bricht der Build absichtlich ab.
- Der Trainings-Import ersetzt, nach expliziter Bestätigung, den bisherigen lokalen Trainingstand. **VOR JEDEM IMPORT EIN FRISCHES BACKUP EXPORTIEREN.**
- Ein neuer Schlüssel kann eine mit einem anderen Schlüssel signierte APK nicht aktualisieren. In diesem Fall Trainings- und Ernährungsbackups exportieren und erst anschließend die alte App entfernen.

## Auf GitHub hochladen (Linux-Terminal)

1. Sicherstellen, dass du **im Hauptordner des geklonten Repositories** bist (`git remote -v` zeigt Azerusxx/openForm).
2. Lade `openForm-0.3.0-Kombi-Patch.zip` herunter (oder verwende das gesamte Quellcodepaket, wenn dein Repo älter ist als 0.2).
3. Entpacken:

   ```bash
   unzip -o ~/Downloads/openForm-0.3.0-Kombi-Patch.zip -d .
   git status --short
   ```

4. EINMALIG den privaten Schlüssel anlegen: `bash scripts/setup-openform-debug-key.sh`.
   GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `OPENFORM_DEBUG_KEYSTORE_B64`
   - Inhalt: **gesamter** Inhalt von `~/.config/openform/debug-keystore-base64.txt`
   - Geheimen Wert **niemals** in Chat, Commit oder Screenshot teilen.
   - `~/.config/openform/debug.keystore` extern sicher aufbewahren!

5. Erst wenn das Secret vorhanden ist:

   ```bash
   git add -A
   git commit -m "openForm 0.3.0 - Profil, Dashboard, Komplettbackup und stabile APK-Updates"
   git push origin main
   ```

6. GitHub → Actions → neuesten erfolgreichen Lauf öffnen → `openForm-0.3.0-debug` als ZIP herunterladen, entpacken, APK installieren.

**Vorsicht:** Prüfe `git status --short` vor `git add -A`, damit keine privaten Dateien oder Ernährungsbackups ins Repository gelangen.

## Tests

In `frontend`:

```bash
node --test src/lib/nutrition.test.mjs src/lib/nutrition-extra.test.mjs src/lib/openform-backup.test.mjs src/components/TabBar.openform.test.mjs
npm ci
npm run build
```

Die gezielten Node-Tests und eine lokale JSX-Syntaxprüfung liefen hier durch. Der vollständige Frontend/Android-Build wird erst von GitHub Actions bestätigt.

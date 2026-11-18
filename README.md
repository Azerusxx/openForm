# openForm — Alpha 0.1

openForm vereint openGym als technische Basis mit einem neu implementierten Ernährungsmodul (React / Capacitor). Dieser Stand ist ein **Alpha-Prototyp**, nicht fertig getestet.

## Inhalt

- `frontend/`: React, Vite und Capacitor Android einschließlich neuer Ernährungsseite, Mahlzeiten, Tagesmakros, Open Food Facts Barcode-Nachschlagen und lokaler JSON-Backupfunktion.
- `api/`: Backend und Coaching-Bausteine von openGym, auf die Frontend-Module zugreifen können.
- `scripts/`: Katalog- und Wartungshilfen.
- `catalogue/exercises/`, `catalogue/i18n/`, `catalogue/browse/`: Übungsdaten und Übersetzungen.
- `.github/workflows/android-apk.yml`: Android-Debug-APK-Build per GitHub Actions.

### Lizenzhinweis: Übungsmedien

Die originalen Gym-visual-Medien sind **nicht Teil der AGPL-Code-Lizenz**. openGym erlaubt laut seiner [aktuellen NOTICE](https://github.com/DuarteSantos8/openGym/blob/main/NOTICE.md) einem **nichtkommerziellen openGym-Fork**, dessen unveränderte Medien bis maximal **180 × 180 Pixel** zusammen mit dem Rechtehinweis beizubehalten. Größere APK-Medien, kommerzielle Nutzung und Weiterverwendung als KI-Trainings- oder Bildgenerierungsvorlage sind davon nicht abgedeckt. Ob eine spätere Wiederaufnahme entfernter Medien in der eigenständig benannten openForm-App unter die Fork-Ausnahme fällt, sollte mit dem Rechteinhaber schriftlich geklärt werden.

Die offizielle Beta lädt deshalb derzeit **keine** Gym-visual-Dateien nach und baut weiterhin auf RepDB und eigenen Nutzerbildern auf. Ein strikt opt-in-fähiger 180-Pixel-Fork-Import ist vorbereitet, setzt aber eine rechtmäßig vorhandene Quelle und bewusste Lizenzbestätigung voraus. Die Schritte und Einschränkungen stehen in [docs/FORK180_MEDIA_REVIEW.md](docs/FORK180_MEDIA_REVIEW.md).

## Installation / GitHub

Dieses ZIP enthält Dateien **direkt ab der Repository-Wurzel**. Beim Entpacken und Kopieren muss `frontend/package.json` im GitHub-Repository auf oberster Ebene erreichbar sein; kein zusätzlicher `opengym-main`-Ordner darf davor liegen.

Auf GitHub: `Azerusxx/openForm` in GitHub Desktop klonen, Archiv in einen temporären Ordner entpacken, **Inhalt** in den geklonten Repository-Ordner kopieren, `Commit to main` → `Push origin`. Workflow `Actions` → `openForm Android APK`. Erfolgreiches Artifact: `openForm-0.1.0-debug` mit `app-debug.apk`.

**Kein** `npm install` auf dem PC notwendig; GitHub Actions erledigt npm und Gradle. Geheimschlüssel und private Daten nicht einchecken. `.env` und `data/` werden über `.gitignore` ausgeschlossen.

## Grenzen

Das neue Ernährungsmodul verwendet separate lokale Daten; es ist noch nicht Teil der alten openGym-Cloud-Synchronisierung und des gemeinsamen Backups. Vor Nutzung vorhandene Trainingsdaten aus der bisherigen App sichern, getrennte App-ID verwenden. USDA, KI-Fotoanalyse, umfassende Favoriten und der gemeinsame Coach sind noch in Arbeit. Details: `docs/OPENFORM_START.md`.

## Herkunft und Lizenzen

Technische Grundlage: openGym (AGPL-3.0-or-later); `LICENSE`, `NOTICE.md` und Urheberrechtshinweise bleiben bestehen. OpenNutriTracker-Dart-Code wurde nicht kopiert. Die Nutrition-Funktionen sind eine neue React-Implementierung.

## Lizenzhinweis: kostenlose RepDB-Übungsbilder

Die Android-Beta lädt beim Build passende statische WebP-Illustrationen aus dem kostenlosen RepDB-Datensatz. Nur eindeutig nach Übungsname und Gerät zuordenbare Bilder werden eingebaut; Trainingsdaten und IDs bleiben unverändert. Die Bilder sind nicht Teil dieses GitHub-Repositories und die RepDB-Lizenz erlaubt keine Weiterveröffentlichung als eigenständiger Datensatz. Der Import enthält keine bezahlten Animations-Samples.

**Exercise data by [RepDB (repdb.co)](https://repdb.co).** Lizenz: https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md

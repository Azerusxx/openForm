# openForm 0.3.2 – Essen wie OpenNutriTracker

Dies ist ein **Quellcode-Update**, keine vorgefertigte APK. Es baut auf openForm 0.3.1 auf und ersetzt keine Trainingsdaten.

## Essen – neu

- Optisch an die vom Nutzer bereitgestellte OpenNutriTracker-Referenz angelehnte Tagesansicht: Gewicht, Tageswasser, Kalorienbilanz (Ring) und Makrokarten.
- Großer Plus-Button mit Lebensmittelsuche, Barcode, manuellem Eintrag, Foto-Barcode und Rezepten.
- Mahlzeiten nach Frühstück, Mittagessen, Abendessen und Snacks gruppiert. Bestehende ältere Einträge ohne Gruppe landen unter **Weitere Einträge** und bleiben unverändert.
- Aktivität separat und freiwillig als verbrannte Kalorien erfassen, **kein** automatisch geschätzter Workout-Verbrauch. Verbleibende Kalorien = Ziel – aufgenommene Kalorien + manuell erfasste Aktivitätskalorien.
- Tagebuch, Trends, Rezepte, Favoriten, Supplements sowie Ernährungsexport/-import über das Seitenmenü erreichbar. Das Profil bleibt im allgemeinen openForm-Einstellungsbereich; dort ist auch das Wasserziel einstellbar.
- Wasser und Aktivitäten sind abwärtskompatibel im bestehenden Ernährungsspeicher enthalten und werden im Ernährungskomplettbackup mitgesichert.
- Der große orange Essen-Button mit Flamme in der **Hauptnavigation** bleibt unverändert.

## Aktualisierung

1. Zuerst eine Sicherung der bisherigen Daten unter den openForm-Einstellungen anlegen und das JSON an einem sicheren Ort aufheben.
2. Das ZIP **im lokalen Hauptordner des Repositories** entpacken; die angezeigten Dateiänderungen mit `git status --short` prüfen.
3. `git add -A && git commit -m "openForm 0.3.2 Essen-Redesign" && git push origin main`
4. GitHub Actions erstellt aus dem Quellcode die Debug-APK `openForm-0.3.2-debug`. Die bestehende, stabil signierte Debug-APK sollte dann ohne Deinstallation aktualisiert werden können, sofern Paket-ID, Schlüssel und Versionscode weiterhin passen.

### Tests

`node --test frontend/src/lib/nutrition.test.mjs frontend/src/lib/nutrition-extra.test.mjs frontend/src/lib/nutrition-032.test.mjs frontend/src/lib/nutrition-navigation.test.mjs frontend/src/lib/openform-backup.test.mjs frontend/src/lib/openform-integrated-ui.test.mjs frontend/src/lib/backup-review.test.mjs frontend/src/components/TabBar.openform.test.mjs`

Ein Android-Build ist erst mit einem erfolgreichen GitHub Actions-Lauf nachgewiesen. Lokale Paketinstallation/Bau kann in einer isolierten Umgebung ohne npm-Zugriff scheitern, auch wenn die Tests durchlaufen.

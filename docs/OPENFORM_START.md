# openForm – erster Integrationsstand (Alpha 0.1)

## Was bereits geändert wurde

Basis ist die hochgeladene vollständige openGym-Quelle, nicht eine Neuentwicklung. Die vorhandene Trainingsverwaltung und `gym_state_v1` sind unverändert. Dazu kommen eine React-Route `/nutrition`, ein Tab **Essen**, ein Startseitenlink, ein getrenntes lokales Ernährungsdatenmodell sowie deutsche Formulare für:

- Kalorien- und Proteinziele (Startwerte: 2.200 kcal, 150 g Protein), optional KH/Fett
- Manuelles Anlegen, **Bearbeiten** und Löschen von Mahlzeiten
- Mengen in g, ml (Nährwertangabe pro 100 ml) oder Stück mit explizitem Portionsgewicht/-volumen
- Tagesbilanz, Restkalorien und Restprotein
- EAN-/UPC-Barcode-Eingabe, Open Food Facts API v3 (Produkt- und Makronährwerte)
- Kamera über bestehenden Android-ML-Kit-Scanner, Bildimport; Browser-Barcode-Kamera, wenn `BarcodeDetector` verfügbar
- Separater JSON-Export/-Import für die Ernährung, beim Import Zusammenführung ohne Überschreiben vorhandener Einträge

## Wichtige Grenzen dieser Alpha

**Das ist kein final getesteter Android-Build.** Die sechs Node-Datentests sind erfolgreich, und die geänderten React-Dateien sind syntaktisch geprüft. Der vollständige Vite-/Android-Build konnte in der Ausführungsumgebung nicht durchgeführt werden, weil notwendige NPM-Dependencies nicht heruntergeladen werden konnten. Deshalb noch nicht für die Erfassung unverzichtbarer Daten einsetzen.

**Die Ernährung ist noch NICHT Teil der vorhandenen openGym-Synchronisierung, der openGym-Backup-Dateien oder des mobilen Dateispiegels.** Das ist Absicht: Die komplexe Sync- und Konfliktlösung aus `gym_state_v1` würde sonst riskant verändert. Bis zur geprüften Integration Ernährung bitte extra exportieren.

Open Food Facts enthält Community-Daten mit möglichen Fehlern. Die Alpha erlaubt manuelle Korrektur, lehnt Produkte ohne vollständige Hauptmakros ab. Die produktive Einbindung braucht außerdem eine saubere Lösung für die von Open Food Facts verlangte App-Kennung im HTTP-User-Agent; WebViews lassen das Setzen des User-Agent-Headers nicht frei zu. Eine Backend-Proxy-Option und Caching stehen deshalb für den nächsten Meilenstein an. Online-Abfragen hängen von Netz, CORS und API-Erreichbarkeit ab.

**USDA FoodData Central, intelligente Lebensmittelsuche, KI-Fotoanalyse, Rezeptdatenbank, Favoriten, Supplements, Wochenberichte und der kombinierte KI-Coach** sind noch nicht implementiert. Ein USDA-Key darf nicht in einer veröffentlichten APK stehen.

**Android-Appkennung** wurde für den Prototypen auf `app.openform.personal` geändert, damit die Original-openGym-Installation nicht versehentlich ersetzt wird. Die bestehenden Trainingsdaten kommen dadurch nicht automatisch mit: vor Installationsversuchen erst ein openGym-Backup exportieren und separat wieder importieren. Java-Klassen bleiben in der originalen Namespace-Struktur `ch.duartesantos.opengym`; die Android-App-ID darf davon abweichen. Label heißt bereits openForm; Icons und einige upstream Texte sind noch die von openGym.

Originale openGym-Quellbasis ist AGPL-3.0-or-later; relevante Hinweise und Lizenzdateien bleiben erhalten. Aus OpenNutriTracker wurde kein Dart-Code übernommen, sondern nur Funktionalität konzeptionell zum Nachbau vorgemerkt.

## Lokal starten (Entwicklungsrechner)

Voraussetzungen: Node.js und NPM in kompatiblen Versionen; für APK Android Studio, Android SDK und JDK passend zur upstream Gradle-Konfiguration.

```bash
cd frontend
npm ci
npm run dev
```

Dann auf der Startseite den neuen Ernährungsbereich öffnen oder direkt `#/nutrition` wählen. Ohne laufende API können Web-Anmeldung und die Trainingsfunktionen Einschränkungen haben; den vorhandenen openGym-Demo/Gastmodus verwenden. Für die API:

```bash
cd api
npm ci
npm start
```

Android später nach erfolgreichem Vite-Build/Tests:

```bash
cd frontend
npm run build:mobile
cd android
./gradlew assembleDebug
```

Vor produktiver Nutzung zuerst die gleichzeitige Installation, Datensicherung und den realen Barcode-Scan auf einem Android-Gerät testen. Die Befehle hier sind eine Bauanleitung, **kein Nachweis**, dass die Alpha bereits erfolgreich als APK gebaut wurde.

## Tests

```bash
cd frontend
node --test src/lib/nutrition.test.mjs
```

## Nächster sinnvoller Meilenstein

Zuerst reproduzierbar bauen und auf Android testen. Dann Import des bestehenden openGym-Backups in openForm prüfen, robuste separate native Ernährungsdatei und die kombinierte Backup-/Sync-Migration einschließlich Konflikttests umsetzen. Erst danach Food-API-Proxy, USDA, Favoriten, Rezepte und KI-Coach ergänzen.

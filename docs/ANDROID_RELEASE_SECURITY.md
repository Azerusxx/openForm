# openForm Android – Befund und Release-Grenzen (2026-11-13)

## Bestätigt und korrigiert
- Update-Check: `frontend/src/lib/update.js` hatte `DuarteSantos8/openGym` hartkodiert. Er fragt nun **nur** `Azerusxx/openForm` ab. Für ein Update müssen eine eigene openForm-APK sowie die zugehörige `<apk>.sha256` im selben Release vorhanden sein; ohne offiziellen Release wird kein Update angeboten. Ein GitHub-Actions-Debug-Artifact ist **kein** GitHub Release.
- Beta-Vergleich: Versionen wie `0.3.7-rc.8` werden als Präversion behandelt, nicht auf Patch 0 reduziert.
- Test-APK: Das Workflow-Ziel ist `assembleDebug` mit Paket-ID `app.openform.personal.test` und stabilem Debug-Schlüssel. Das ist **kein** produktionsfertiger Release. Ein Release mit `app.openform.personal` installiert sich nicht über `.test`.
- Release-only Hardening: `src/release/res/xml/network_security_config.xml` erlaubt nur System-CAs und HTTPS; `src/release/AndroidManifest.xml` deaktiviert Auto-Backup und Klartext-HTTP. `MainActivity` blockiert Mixed Content für nicht-debuggable Builds. Der lokale Test-Build behält die vorhandenen Einstellungen.
- Health Connect: `WRITE_EXERCISE` und `WRITE_WEIGHT` werden von `HealthConnectPlugin.java` und `lib/health-sync.js` tatsächlich verwendet. Die Berechtigungen werden durch die Nutzeraktion in Einstellungen angefordert, nicht automatisch beim App-Start.

## Vor Veröffentlichung noch prüfen
1. **Merged Manifest** für `release` und `debug` prüfen (`./gradlew processReleaseMainManifest`). Der Quellmanifest-Eintrag ist nicht zwangsläufig identisch mit der endgültigen APK: Bibliotheken können Berechtigungen einbringen, einschließlich `DUMP`. Falls `DUMP` auftaucht, Herkunft prüfen und über `tools:node="remove"` ausschließen.
2. `REQUEST_INSTALL_PACKAGES` ist aktuell für den benutzerbestätigten APK-Updater über `InstallPlugin` relevant. Vor Play-Veröffentlichung entscheiden, ob Sideload-Updates überhaupt noch angeboten werden. Permission nicht blind entfernen, solange die Funktion erreichbar ist. Bei Play-Store-Version Updates über Store statt Side-Loading abwickeln.
3. Ob `allowMixedContent` in `capacitor.config.json` auf `true` bleiben darf, ist eine Produktentscheidung: Es ermöglicht alte HTTP-Private-Server im **Debug**-Build; die Release-WebView verweigert sie bewusst. Die release-eigene Ressource und WebView-Einstellung müssen auf einem echten Gerät überprüft werden.
4. Release-Key sicher außerhalb des Repos hinterlegen, `assembleRelease` mit korrekter Signatur und `apksigner verify` testen, APK-Inhalt und endgültige Berechtigungen mit `apkanalyzer`/`aapt` prüfen; Install-/Upgradepfad und Play Protect gesondert testen.
5. Kein unnötiger Daten-/Paketwechsel: `gym_state_v1`, `opengym-coach.json`, `opengym-health.json` und `opengym-media/` sind bestehende Storage-/Backup-Verträge. Erst mit einer expliziten, rückwärtskompatiblen Migration umbenennen.
6. Der offene Security Review umfasst auch Authentifizierung, Session-/Token-Speicherung, WebView-Content und native Plugins. Dieser Patch ersetzt keinen vollständigen Pentest oder Geräte-Test.

## Regressionen
`frontend/src/lib/android-release-audit.test.mjs` und `frontend/src/lib/update.test.js` sind in `.github/workflows/android-apk.yml` aufgenommen. Der neue CI-Durchlauf muss noch erfolgreich abgeschlossen werden.

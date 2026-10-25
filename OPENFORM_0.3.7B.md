# openForm 0.3.7b – Kreis-Overlay für Satzpausen

Baut auf 0.3.7a auf und bleibt zunächst in einem getrennten Feature-Branch.

**UI:** Der Pausentimer öffnet bei neuer Satzpause eine kreisförmige Restzeitanzeige mit Fortschrittsring und einer gedimmten, leicht unscharfen Trainingsansicht. Direkt im Overlay: Restzeit antippen zum Ändern, ±15 Sekunden, Pause/Fortsetzen, Überspringen. Mit **Einklappen / Weitertrainieren** kehrt der Nutzer zur vollständig bedienbaren Trainingsansicht mit der bisherigen kleinen Leiste zurück. Die Uhr läuft unverändert weiter. Tippen auf die kleine Uhr bringt den Kreis zurück. Wenn die Pause endet, wird automatisch eingeklappt.

**Unverändert:** Native Android-Benachrichtigung, Alarm, Pausenberechnung aus 0.3.7a, Supersätze, Zeitübungs-Timer und Daten/Backups. Die neue Darstellung ist kein autonomer Hintergrundtimer und startet keine zusätzliche Uhr.

## Release-Reihenfolge
0.3.6 integrieren → 0.3.7a integrieren → 0.3.7b integrieren. Debug-APK mit gleichem Paketnamen und stabiler Signatur installieren; vor Tests ein vollständiges Backup exportieren.

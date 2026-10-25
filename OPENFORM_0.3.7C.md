# openForm 0.3.7c – Adaptive Pausen

Feature-Branch baut auf 0.3.7b auf. Die Funktion bleibt unter **Einstellungen → Training → Intelligenter Pausentimer** standardmäßig **AUS**, ohne Datenmigration.

Die Pausenregel beginnt mit 90 Sekunden bei Isolationsübungen und 150 Sekunden bei erkannten Mehrgelenkübungen. 1–5 Wiederholungen ergeben +30 Sekunden. RIR 0–1, RPE 9–10 oder explizit protokolliertes Muskelversagen führen zu einmalig +30 Sekunden. Fallen die Wiederholungen im direkt vorherigen **abgeschlossenen Arbeitssatz bei gleichem Gewicht** um mehr als 15 %, kommen +30 Sekunden hinzu. Das Maximum beträgt 210 Sekunden.

Die optionale Auswahl **0–1 / 2–3 / 4+ RIR** im Pausenkreis ändert nur die laufende Timerempfehlung; sie speichert weder einen RIR-Wert im Satz noch verändert sie Gewicht/Wiederholungen. Manuelle ±15-Sekunden-Eingriffe bleiben erhalten, und ein fast abgelaufener Timer wird nicht durch eine neue Empfehlung übersprungen.

Manuell eingestellte Übungspausen, Aufwärmsätze, Pyramiden, Supersätze, Cardio und Halteübungen behalten ihre Regeln. Android-Benachrichtigungen laufen über dasselbe bestehende Timer-System. Die Zuschläge sind **Heuristiken**, keine gemessene körperliche Erholung.

## Vor Test auf Android
Erst 0.3.6, danach 0.3.7a, 0.3.7b und schließlich 0.3.7c integrieren. Vor einem APK-Update ein externes Backup aus der installierten App exportieren.

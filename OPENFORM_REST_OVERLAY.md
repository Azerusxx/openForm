# Pausentimer – Kreisoverlay (0.3.7a, Testversion)

Die Android-Benachrichtigung bleibt unverändert. Bei normalen Satzpausen im aktiven Training zeigt openForm jetzt einen großen, kreisförmigen Countdown über einem leicht unscharfen Hintergrund. Der Kreis zeigt den **verbleibenden Anteil** der Pause; die Zeit kann durch Antippen bearbeitet werden. -15/+15, Pausieren/Fortsetzen und Überspringen sind direkt zugänglich.

Mit **Training ansehen** wird der Dialog zu einem kleinen, weiterhin laufenden Timer. Ein Tipp auf diesen Mini-Timer öffnet den Kreis wieder. Jede neue Satzpause öffnet den Kreis erneut. Die kurze 10-Sekunden-Seitenwechselpause und zeitgesteuerte Übungen behalten ihr bisheriges Verhalten.

Es wird **kein** Android-Systemoverlay über andere Apps eingebaut: hierfür wären zusätzliche gefährliche Berechtigungen nötig. Der Hintergrund wird ausschließlich *innerhalb openForm* unscharf. Die Benachrichtigung funktioniert weiterhin, wenn openForm nicht im Vordergrund ist.

## Später (nicht Teil dieses Patches)
Eigener Eintrag „Krank“ im Trainingskalender, mit unterscheidbarer Farbe/Legende und vorsichtiger Wiedereinstiegs-Einschätzung nach Symptomende und Belastbarkeit. Keine automatische Aussage „ab Tag X gesund“, keine Diagnosen und keine automatische Trainingsfreigabe.

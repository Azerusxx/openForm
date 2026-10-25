# openForm 0.3.7f – Designfarben in Essen und Krankheitstagen

**Designabhängige Komplementärfarbe:** Unter Einstellungen → Erscheinungsbild bleibt die Auswahl der bereits vorhandenen 8 Akzentfarben, der freien Wunschfarbe und Hell/Dunkel-Modus erhalten. `applyAccent` erzeugt die Darstellung `--illness-color` nun dynamisch als gegenüberliegenden Farbton (+180° im HSL-Farbkreis) mit ausreichendem Kontrast für den gewählten Hintergrund. Bei neutralen Grautönen dient gut unterscheidbares Cyan als Ersatz. Die Farbe wird nicht als zusätzliches Profilfeld gespeichert.

**Kalender und Statistik:** Kalender- und Wochenmarkierungen verwenden weiterhin `--illness-color`. In der 12-Monats-Heatmap gilt: nur Krankmeldung = komplementär gefülltes Kästchen; Krankheit und Training am selben Tag = normaler Trainingsfarbton nach Zeit/Volumen mit ergänzender Komplementär-Umrandung. Zusätzlich werden ältere Tagesnotizen mit dem Kennzeichen `sick` erkannt, ohne sie umzuschreiben. Legende und Tagesbeschreibung erklären beide Varianten.

**Ernährung:** Die Primärfarben im Essen-Bereich, Kalorienring, Wasseranzeigen, Buttons, Makrofortschritt, Home-Ernährungskarte und der große Essen-Navigationsbutton folgen `--food-accent`, der direkt von der gewählten Akzentfarbe abhängt. Die Beschriftung auf gefüllten Buttons verwendet `--food-on-accent` für ausreichenden Kontrast. Die orange App-Systemfarbe bleibt für andere, bewusst semantische Zwecke bestehen.

Keine Datenmigration. Vor dem APK-Update ein vollständiges Backup exportieren.

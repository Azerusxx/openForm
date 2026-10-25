# openForm 0.3.7e – Krankmeldung und Wiedereinstieg

In der Trainingsauswahl gibt es **„Krank melden / Trainingspause“**. Ein Eintrag erfasst Beginn, optional das Ende, eine kurze Notiz und bei Bedarf einen geplanten ersten leichten Trainingstag. Der Kalender zeigt alle betreffenden Tage **türkis** an; Trainingseinträge behalten ihre eigene Darstellung und werden nicht gelöscht. Die Startseite zeigt während einer Krankheit den Zeitraum und danach kurz den selbst gemeldeten Erholungsstatus.

Ein Wiedereinstiegsdatum erscheint nur als **eigene Planung** nach selbst bestätigter Besserung, ausreichender Alltagsbelastbarkeit, Fieberfreiheit und fehlenden Warnzeichen. Es ist **keine ärztliche Freigabe**. Bei Fieber oder deutlicher Erkrankung wird kein Training empfohlen. Bei Brustschmerzen, ungewohnter Atemnot, Herzrasen oder anhaltenden Beschwerden ärztlich abklären, statt auf ein Datum zu vertrauen. Erste Einheit behutsam, kürzer und leichter; bei Rückkehr der Symptome abbrechen.

**Datensicherheit:** `illnessPeriods` ist eine separat pro Eintrag gestempelte Karte (Client und Server kennen das Feld). Löschungen hinterlassen einen Synchronisierungs-Tombstone. Alte `dayNotes`, Trainings, Ernährung, Routinen und Backups behalten ihre Struktur. Bestehende Krank-Tagesnotizen werden weiterhin angezeigt, aber nicht automatisch zu Zeiträumen umgedeutet. Krankmeldungen unterdrücken passende Trainingserinnerungen und Nudge-Meldungen; geplante Routinen werden nicht gelöscht oder verschoben. Vollständiges Backup vor APK-Updates exportieren.

**Release:** Version 0.3.7e. Diese Änderungen gehören erst nach erfolgreichen Tests, Android-Build und Signaturprüfung in `main`.

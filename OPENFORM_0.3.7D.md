# openForm 0.3.7d – Progression bestätigen

Der vorhandene Progressionsmotor in `src/lib/progression.js` berechnet weiterhin lineare, doppelte, dreifache und zeitbasierte Vorschläge aus den Trainingsdaten. Diese Version führt **keine zweite Berechnung** ein.

Im laufenden, regulär gestarteten Training zeigt ein Banner Vorschläge zum Steigern oder Entlasten mitsamt Satzwerten und Begründung. Die bisherigen vorgeschlagenen Werte stehen bereits in den Satzfeldern; **Vorschlag übernehmen** markiert die Entscheidung in der aktiven Sitzung. **Letzte Werte** kann nur bei identischer Anzahl normaler, noch unangetasteter gerader Arbeitssätze die Gewichte und Wiederholungen des letzten abgeschlossenen Trainings wiederherstellen. Warmups, Supersätze mit Seitenhälften, Intensifier und veränderte Satzanzahlen müssen manuell angepasst werden; es gibt dort bewusst keinen automatischen Rückschreibbutton.

Gespeicherte Trainings, Ernährung, Routinen und Backupformat bleiben erhalten. Die App erzeugt keine automatischen Gewichtsänderungen in abgeschlossenen Trainings. Es wird nur das aktuelle aktive Training nach ausdrücklicher Entscheidung verändert. Falls man mit den bereits vorgeschlagenen Werten trainiert, ist dies eine implizite Annahme, nicht ein erzwungener Bestätigungsdialog. Eine umfangreichere Vorabfreigabe vor dem Start ist ein späterer UX-Schritt.

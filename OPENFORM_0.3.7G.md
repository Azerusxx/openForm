# openForm 0.3.7g – Krankheitsbedingte Belastung in der Statistik

Die bestehende Ermüdungskarte in Statistik → Ermüdung beruht weiterhin **nur** auf abgeschlossenen Trainingssätzen. Krankheit erzeugt weder erfundene Muskelbelastung noch Trainingsvolumen. Stattdessen zeigt die App:
- **Krankheitstage der letzten 30 Tage** (mehrere Krankheitszeiträume und einzelne ältere Krank-Notizen, Überlappungen nur einmal gezählt).
- **Allgemeine Belastbarkeit**, während einer gemeldeten Krankheit als eingeschränkt markiert; für bis zu 14 Tage nach einem beendeten Krankheitszeitraum mit vorsichtiger Wiedereinstiegsnotiz. Die 14 Tage sind nur ein Anzeigezeitraum, keine medizinisch begründete Genesungsfrist.
- Ein **separates Hinweisfeld** im Bereich Muskelermüdung: aktuelle Erkrankung, subjektive Erschöpfung (sofern freiwillig erfasst), behutsamer Wiedereinstieg und Link zur Bearbeitung.
- Optional kann im Krankmeldeformular die subjektive Erschöpfung als leicht/mittel/stark dokumentiert werden. Bestehende Einträge ohne diesen Wert bleiben gültig und werden als nicht eingeschätzt angezeigt.

Die Statistik trifft **keine ärztliche Freigabe** oder genaue Prognose. Bei Beschwerden oder Warnzeichen zählt die tatsächliche Belastbarkeit und nötigenfalls medizinische Abklärung. Schweregradangaben sind freiwillige Nutzerangaben und nicht als Diagnose zu verstehen.

Es werden keine gespeicherten Trainingseinträge oder Ernährungsdaten migriert. Das zusätzliche Feld gehört zur vorhandenen, synchronisierten `illnessPeriods`-Struktur und wird in Backups mitgenommen.

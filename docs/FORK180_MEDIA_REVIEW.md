# openForm – originale 180px openGym-Medien

Stand 18. November 2026. Quelle: [DuarteSantos8/openGym](https://github.com/DuarteSantos8/openGym), Commit \`e4a68a94c42a3c17cbd560d66ce2e46a7048ab99\`.

## Medien

Das offizielle Repository enthält \`catalogue/media/still/\` (6.554 WebP-Bilder),
\`catalogue/media/clip/\` (6.554 MP4-Animationen) und \`catalogue/media/NOTICE.md\`.
Zusammen ca. 199 MB. Das Verzeichnis ist in den alten Commits von
\`Azerusxx/openForm\` nicht versioniert. Die Dateien kommen darum aus
dem fest gepinnten ursprünglichen openGym-Repository, nicht aus einer
alten APK, einem Mirror oder einer KI-generierten Bilddatenbank.

Der Android-Workflow checkt nur \`catalogue/media/\` aus dem offiziellen
Upstream-Commit aus und führt \`scripts/catalogue/stage-fork180.mjs\` aus.
Dabei werden nur passende Dateien auf Original-IDs übernommen. Standbilder
bleiben unverändert, müssen maximal 180×180 px haben. Bei Animationen
werden die vorliegenden MP4-Dateien **unverändert** kopiert. Beide
Zuordnungsdateien werden beim Build erzeugt, nicht im Git-Commit gespeichert.
\`NOTICE.md\` wird mit dem Paket kopiert. Die endgültige APK muss nachweislich
jeweils mehrere tausend Bilder und Animationen enthalten, sonst bricht der
Android-Build ab.

## Lizenz

openGym steht unter AGPL-3.0. Bilder und Animationen stammen von
**Gym visual / Aliaksandr Makatserchyk** und sind separat lizenziert.
Der Upstream-Hinweis nennt eine Ausnahme für nichtkommerzielle openGym-Forks,
die unveränderte 180px-Medien samt Hinweis behalten. Nutzerangabe:
openForm wird privat/nichtkommerziell genutzt, und die Nutzung der
früher vorhandenen Originalmedien ist gestattet.

**Wichtig:** Das ist keine OpenAI-Lizenz für Gym-visual-Inhalte.
Bei kommerzieller Nutzung, eigenständigen Apps außerhalb der Fork-Ausnahme
oder anderer Distribution müssen die Rechte erneut konkret geprüft werden.
Keine Originalmedien als Prompt/Trainingsmaterial an KI-Systeme schicken.
Keine Medien außerhalb der dafür autorisierten Anwendung weiterverwerten.

## Datensicherheit und Qualität

Keine ID-Umschreibung, keine Änderungen an Trainings- oder Ernährungsdaten.
Private Übungsfotos haben weiterhin Vorrang. Fehlende Original-Clips fallen
auf das Standbild zurück. Android spielt kurze MP4s im Loop mit lokalem
Cache. Eine erfolgreiche APK-Prüfung und der separate Gerätetest sind
Voraussetzung für die Aussage „wiederhergestellt“.

Weitere Details und die isolierten Fixtures:
\`scripts/catalogue/stage-fork180.test.mjs\`,
\`scripts/catalogue/verify-fork180-bundle.mjs\`.

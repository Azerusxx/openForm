# openForm 0.2.1: UI + Updates ohne Neuinstallation

## Was geändert wurde

- Home: obere Werbung „Ernährung: Kalorien und Protein tracken“ entfernt. Der Zugang bleibt unten.
- Untere Navigation: Essen ist ein genauso großer **runder** Button wie Training, **mit Flamme**. Orange Essen / grün Hantel Training.
- Android-Paket-ID bleibt `app.openform.personal.test` (Debug-APK).
- GitHub Actions verwendet nun einen **dauerhaft gleichen Debug-Signaturschlüssel** aus einem GitHub-Secret statt in jedem Build eines neuen GitHub-Runners einen anderen zu erstellen.
- Android `versionCode` steigt pro Workflow-Lauf automatisch; die angezeigte App-Version ist `0.2.1`.

## Einmaliger Pflichtschritt auf deinem Linux-PC

Im lokalen geklonten `openForm`-Ordner:

```bash
bash scripts/setup-openform-debug-key.sh
```

Fehlt `keytool`, installiere das JDK, z. B. bei Ubuntu/Debian mit `sudo apt install openjdk-21-jdk`.

Danach öffne GitHub `Azerusxx/openForm` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Gib ein:

- Name: `OPENFORM_DEBUG_KEYSTORE_B64`
- Value: gesamten Inhalt von `~/.config/openform/debug-keystore-base64.txt` (ohne abschließenden Zeilenumbruch)

Der Wert ist **geheim**. Er darf niemals in eine Workflow-Datei, in einen Commit oder in einen Chat kopiert werden. Das Programm legt die Datei bewusst außerhalb des Git-Repositories ab. Bewahre `~/.config/openform/debug.keystore` separat und sicher auf. Wird er verloren, sind künftige Updates dieser App nicht mehr mit derselben Signatur möglich.

## Patch hochladen

Entpacke `openForm-0.2.1-Update-Patch.zip` im Hauptordner deines Git-Klons:

```bash
unzip -o ~/Downloads/openForm-0.2.1-Update-Patch.zip -d .
git status --short
git add .github/workflows/android-apk.yml \
  frontend/src/views/Home.jsx frontend/src/components/TabBar.jsx \
  frontend/src/components/TabBar.test.jsx frontend/src/components/TabBar.openform.test.mjs \
  frontend/src/index.css frontend/package.json frontend/package-lock.json \
  frontend/android/app/build.gradle scripts/setup-openform-debug-key.sh \
  OPENFORM_UPDATE_SETUP.md
git commit -m 'openForm 0.2.1: Navigation und signierte Updates'
git push origin main
```

**Reihenfolge:** Zuerst GitHub-Secret einrichten, **dann** pushen. Ohne das Secret bricht die CI absichtlich ab, damit keine neue instabile Debug-Signatur erzeugt wird.

## Einmalige Datenmigration zur neuen stabilen Signatur

Deine *bereits installierten* Debug-APKs wurden voraussichtlich mit flüchtigen Schlüsseln von GitHub-Runnern signiert. Die neue stabile Signatur kann diese Installationen **nicht** direkt aktualisieren. Du musst deshalb wahrscheinlich **ein einziges letztes Mal**:

1. In der alten App die **Trainingsdaten separat sichern/exportieren**.
2. Im Essen-Tab die **Ernährungsdaten separat sichern/exportieren**. Die Backups vorab auf tatsächliche Dateiinhalte prüfen.
3. Die alte Debug-APK deinstallieren (erst NACH Backup!).
4. Die aus dem erfolgreichen GitHub-Actions-Lauf generierte `openForm-0.2.1-debug`-APK installieren.
5. Beide Backups wieder importieren und kontrollieren.

Danach sollten künftige Debug-APK-Versionen mit **gleichem Paketnamen**, **gleichem dauerhaftem Schlüssel** und **steigendem `versionCode`** als Updates installierbar sein, ohne App-Daten durch Deinstallation zu verlieren.

**Achtung:** Eine Debug-APK ist nicht für eine öffentliche Play-Store-Veröffentlichung gedacht. Dafür brauchen wir später einen geschützten Release-Key und Release-Build.

## Weitere wichtige Punkte

- Diese Version ist ein **Quellcode-Patch**, keine APK. Der GitHub-Build muss noch erfolgreich durchlaufen.
- Ein grüner Build bestätigt nicht automatisch, dass Funktionen, Kamera und Datenimport auf dem Handy funktionieren.
- Sicherungen sind vor jeder ersten Installation oder Umstellung empfehlenswert.

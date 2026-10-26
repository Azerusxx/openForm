# openForm Konto & Geräte-Synchronisierung (Vorbereitung)

Der **Account-Betrieb** ist nicht mit dem statischen GitHub-Pages-Build möglich. Die echten Registrierungs-, Passwort-/Passkey- und Trainings-Sync-Endpunkte liegen in `api/server.js`.

Die Dateien in diesem Verzeichnis sind für einen **separaten, dauerhaft laufenden HTTPS-Server**. GitHub Pages bleibt bis zur geprüften Umschaltung in seinem lokalen Browsermodus.

## Voraussetzungen
Ein öffentlich erreichbarer Host oder Heimserver mit Docker Compose, eine eigene Domain/Subdomain, DNS A/AAAA zum Server sowie offene Ports 80/443. Speichere Nutzerdaten auf einem persistenten und regelmäßig gesicherten Volume.

## Start auf dem Server

```sh
git clone https://github.com/Azerusxx/openForm.git
cd openForm
printf 'APP_DOMAIN=form.example.com\n' > deploy-web/.env
docker compose --env-file deploy-web/.env -f deploy-web/compose.yml up -d --build
```

Ersetze `form.example.com` mit deiner eigenen Subdomain. Caddy beantragt HTTPS-Zertifikate. Richte DNS und Firewall vorher ein. Die API selbst ist nicht direkt öffentlich exponiert.

Standardmäßig aktiviert: Passwortanmeldung, Passkeys bei HTTPS, deutsch, keine Gastnutzer. Auf einer frischen Datenbank wird das erste angelegte Konto Admin. **Erstelle es selbst, bevor du die Adresse öffentlich teilst.** Für den späteren Regelbetrieb sind Einladungen sinnvoll.

## Daten & Einschränkungen
Die bestehenden Trainings-Sync-Routen synchronisieren Trainingsdaten. Die Ernährung verwendet derzeit `openform_nutrition_v1` in Browser-LocalStorage. **Dafür existiert in dieser Konfiguration noch keine gleichwertige serverseitige Synchronisierung.** Das gilt auch für einige lokale Medien. Keine automatische oder stille Migration durchführen. Exportiere vorher Backups von Android und Browser.

Android benötigt für Geräte-Sync seine vorhandene Funktion *Connect to my server* / Pairing. Der Web-Login allein verbindet die APK nicht automatisch.

Ein Betrieb auf diesem Server würde unter `https://form.example.com` stattfinden. Die GitHub-Pages-Adresse unter `github.io` kann nicht unmittelbar dieselbe Same-Origin-Anmeldung benutzen. Sichere Daten nicht in einem öffentlichen Repository.

## Noch vor Freigabe prüfen
Registrierung, An- und Abmeldung, Session-Cookies, CSRF- und HTTPS-Einstellungen, Training auf zwei Geräten, Konfliktbehandlung, Datenschutz, Datenbackup/Restore und Erreichbarkeit. Für echte vollständige Synchronisierung muss Ernährung separat eingebunden und getestet werden.

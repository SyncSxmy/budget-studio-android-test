# Budget Studio – Android-Testversion 0.9 (Projekt)

**Wichtig:** Dieses ZIP ist ein **Quellprojekt**, keine fertige APK. Auf dem aktuellen Build-System sind Android SDK/Gradle nicht vorhanden, daher konnten wir keine echte APK erzeugen oder auf Android testen. Die APK kannst du mit den unten beschriebenen Schritten erstellen. Grundlage ist das bestehende Budget Studio **0.8.4**, nicht die künftig geplante Premium-/Bankanbindung.

## Möglichkeit A: APK über GitHub Actions bauen (auch ohne Android Studio)

1. Erstelle bei GitHub am besten ein **neues separates Repository** `budget-studio-android-test`. Die bisherige GitHub-Pages-App bleibt unverändert.
2. ZIP entpacken und **den Inhalt des Projektordners** in dieses Repo hochladen. Besonders wichtig: `.github/workflows/apk-test.yml` muss mit hochgeladen werden. Am einfachsten mit GitHub Desktop oder git, damit die Ordnerstruktur erhalten bleibt.
3. Auf GitHub im neuen Repository zu **Actions** -> **Android Debug APK** gehen. Falls nötig, den Workflow über **Run workflow** starten. Bei einer normalen Aktualisierung auf `main` startet er auch automatisch.
4. Sobald der Lauf erfolgreich beendet ist: den erfolgreichen Lauf öffnen -> unten **Artifacts** -> `Budget-Studio-Android-Test-APK` herunterladen.
5. ZIP-Artifact entpacken. Darin liegt `app-debug.apk` zum Installieren im Android-Emulator (z. B. APK auf Emulatorfenster ziehen oder per `adb install app-debug.apk`).

**Hinweis:** Ein Fehler im ersten Workflow kann auftreten, wenn GitHub/npm/Android-Tool-Versionen oder Berechtigungen angepasst werden müssen. Dann die Fehlermeldung zeigen; wir korrigieren den Build. Debug-APKs sind **nicht** für Google Play geeignet.

## Möglichkeit B: Direkt mit Windows + Android Studio

Benötigt: **Node.js 22 oder neuer**, **Android Studio** inklusive Android SDK und Emulator, Internet für die erste Installation.

1. Dieses Projekt entpacken.
2. Doppelklick auf `ANDROID_LOKAL_STARTEN.bat`.
3. Das Skript installiert Capacitor, erzeugt das Android-Projekt und öffnet Android Studio.
4. Emulator auswählen -> **Run ▶**; die App wird im Emulator installiert.
5. Für eine eigenständige Debug-APK: in Android Studio **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**. Die Datei liegt gewöhnlich in `android/app/build/outputs/apk/debug/app-debug.apk`.

Wenn Node.js oder Android Studio noch nicht eingerichtet sind, ist Möglichkeit A oft einfacher.

## Was jetzt funktioniert / nicht funktioniert

- **Enthalten:** bestehender Finanzmanager, zwölf Designs, Privat-/Geschäftshaushalte, Materialrechner, manuelle Buchungen, PDF/CSV-Banking-Import (als bislang vorhandener Code).
- **Noch nicht:** echte automatische Bankverbindung, App-Store-Käufe, 7-/14-Tage-Lizenzsystem, Cloud-Synchronisierung.
- **Noch nicht auf Android getestet:** PDF-/Foto-Auswahl/OCR, Backup-Export als Dateidownload und systemweite Dateiberechtigungen. Für OCR sind externe Bibliotheken und damit eventuell Internet nötig. Bitte zunächst nur mit **Testdaten** testen.
- **Wichtig:** Die Android-App speichert Daten getrennt von Safari/GitHub Pages. Alten Datenstand in der bisherigen App **als JSON sichern** und später bewusst in der neuen App importieren. Niemals Finanzdaten/Kontoauszüge in das öffentliche GitHub-Repository hochladen.
- **Sicherheit:** Die App ist ein **Prototyp** mit Web-Oberfläche in einer installierten Android-App; noch keine durchgeprüfte Banking-/Finanz-App.

## Später iPhone

Capacitor unterstützt auch iOS. Zum Erstellen und Signieren einer echten iPhone-App ist normalerweise Xcode/macOS (oder eine passende macOS-Cloud-Buildumgebung) nötig. Ein iOS-Simulator läuft nicht regulär unter Windows. Wir testen darum zuerst Android und bauen iOS anschließend auf derselben Codebasis auf.

## Intern

Die Quell-App liegt in `www/`. Für künftige Änderungen: Webdateien ändern -> `npx cap sync android` -> neu bauen. Die verwendete Android-App-ID `de.budgetstudio.preview` ist bewusst eine Testkennung, **keine finale Store-ID**. Die PWA-Service-Worker-Registrierung wurde für Capacitor deaktiviert. Bisherige Geschäftslogik wurde nicht neu geschrieben.

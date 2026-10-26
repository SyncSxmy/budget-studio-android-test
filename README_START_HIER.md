# Budget Studio 0.9.8 – Android-Projekt mit APK-Vollständigkeitsprüfung

Dieses ZIP enthält den gesamten Android-Projektstand **0.9.8** einschließlich des Ordners `www/` und einen korrigierten GitHub-Actions-Workflow.

## Ursache des bisherigen Problems

Die hochgeladene `app-debug.apk` enthielt zwar `index.html` für 0.9.8, aber nur `app.js` und `style.css` als Anwendungsdateien. Neun Skripte (`crypto-extra.js`, `auth-extra.js`, `sync-extra.js`, `media-extra.js`, `business-extra.js`, `finance-engine.js`, `tool-planner.js`, `home-tools.js`, `orders-extra.js`) fehlten. Deshalb kann die Anwendung nicht korrekt starten. Der alte Workflow hat fehlende Assets nicht zuverlässig erkannt.

## GitHub-Anleitung

1. **Wichtig:** Vor einer Aktualisierung ggf. verschlüsselte Datensicherung aus der bisherigen Web-App speichern. Bereits vorhandene Android-App-Daten nicht löschen.
2. ZIP entpacken. Ein **Android-Build-Repository** verwenden (nicht die produktive Web-Seite überschreiben).
3. **Alle** ZIP-Dateien übernehmen. Ordnerstruktur beibehalten, insbesondere `www/`, `scripts/verify_android_bundle.py`, `.github/workflows/apk-test.yml`, `package.json`, `capacitor.config.json`.
4. Sicherstellen, dass in deinem Repository unter `www/` auch `sync-extra.js`, `crypto-extra.js`, `home-tools.js`, `orders-extra.js` vorhanden sind. Nicht bloß `app.js` und `index.html` hochladen.
5. GitHub → Actions → Android Debug APK → Run workflow auf dem aktualisierten Branch. Einen **neuen Lauf** starten, nicht ein altes APK-Artefakt erneut herunterladen.
6. Die Prüfung am Ende muss `OK APK: ... web files present and byte-identical` ausgeben. Sonst scheitert der Build absichtlich und liefert keine vermeintlich vollständige APK.
7. Nur das APK-Artefakt aus genau diesem grünen Lauf herunterladen und in BlueStacks testen.

Die APK selbst wurde in dieser Umgebung **nicht** neu kompiliert. Die lokale Quellcodeprüfung wurde erfolgreich ausgeführt und der Prüfer erkennt nachweislich die fehlenden Module in der vom Nutzer hochgeladenen APK.

**Sicherheit:** Testdaten verwenden. Die Test-App und die verteilte Debug-APK sind nicht für echte Bank-/Kundendaten freigegeben. Eine frühere Defender-Meldung wurde nicht unabhängig aufgeklärt.

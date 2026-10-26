# Budget Studio 0.9.8 – Android-Geräte-Sicherung (Beta)

Dies ist das **Android-Capacitor-Projekt**, noch **keine fertige APK**. Die App verwendet denselben Stand wie die Web-App 0.9.8. **Nur Testdaten** verwenden.

## Aktualisieren und in BlueStacks testen

1. Bisherige Testdaten und Fotos über die Web-/Android-Oberfläche als externe verschlüsselte `.bsafe` sichern.
2. Alle Projektdateien einschließlich **`.github/workflows/apk-test.yml`**, `package.json` und des gesamten **`www/`-Ordners** in dein Android-GitHub-Repository übernehmen.
3. GitHub Actions → **Android Debug APK** starten. Die gebaute APK herunterladen und in BlueStacks installieren. Ein Build wurde in dieser Umgebung nicht gestartet.
4. App-Anmeldung, lokaler Datentresor und **Mehr → Geräte-Sicherung** mit **harmlosen Testdaten** prüfen.
5. Prüfe ausdrücklich, ob das Speichern der lokalen `.bsafe`-Notfallsicherungsdatei innerhalb der Android-WebView tatsächlich funktioniert. Wenn nicht, die Cloud-Wiederherstellung **nicht bestätigen**. Eine spätere native Datei-Sicherung ist noch zu implementieren.

Das bisherige Microsoft-Defender-Signal gegen eine ältere Debug-APK wurde nicht abschließend untersucht. Neue APKs nicht unkontrolliert verteilen oder Schutzmeldungen ungeprüft übergehen.

## Grenzen

Die Funktion ist derzeit ein bewusst manueller, verschlüsselter Austausch des **gesamten** lokalen Datenstands zwischen den Geräten. Kein automatisches Hintergrund-Sync, kein Abgleich einzelner Buchungen, keine Zusammenführung paralleler Änderungen, keine geteilte Freigabe für mehrere Mitarbeiter. Cloud-Passwort und lokales Tresorpasswort müssen separat sicher aufbewahrt werden. Echte Bankverbindungen sind weiterhin nicht integriert.

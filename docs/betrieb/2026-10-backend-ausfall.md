# Backend-Ausfall Oktober bis November 2026

Stand: 14. November 2026. Betrifft das Supabase-Projekt `vitrqkzxkiqvadqfzrcx` (Free-Plan, Frankfurt).

## Was passiert ist

Vom 7. Oktober bis zum 14. November 2026 war das Backend nicht erreichbar. Anmelden, Abgleich und alles, was den Server braucht, gingen in dieser Zeit nicht. Die App selbst lief mit den lokal gespeicherten Daten weiter.

| Zeitpunkt (UTC) | Ereignis |
|---|---|
| 4. Oktober, 11:23 | Letzter erfolgreicher Keep-alive |
| 7. Oktober, 12:08 | Erster fehlgeschlagener Keep-alive: der Hostname des Projekts ließ sich nicht mehr auflösen (`curl` Exit-Code 6) |
| 7. Oktober bis 13. November | Alle 14 geplanten Läufe scheitern mit demselben Fehler |
| 14. November | Dirk stellt das Projekt im Supabase-Dashboard wieder her |
| 14. November, 15:05 | Keep-alive von Hand ausgelöst: erfolgreich |

Nach der Wiederherstellung waren alle Daten vorhanden: 14 Tabellen, 41 Plan-Elemente, 90 Pflanzen, 3 Mitgliedschaften, Migrationen 001 bis 020 auf dem Server wie im Repository.

## Ursache

**Gesichert:** Das Projekt war pausiert. Ein pausiertes Projekt verliert seinen Hostnamen (genau der beobachtete Fehler) und lässt sich im Dashboard wiederherstellen (genau der Weg, der geholfen hat).

**Nicht gesichert:** warum Supabase es pausiert hat, obwohl der Keep-alive lief. Supabase pausiert Projekte im Free-Plan nach etwa einer Woche ohne ausreichende Aktivität und legt nicht offen, was genau als Aktivität zählt. Was dazu bekannt ist:

- Der GitHub-Keep-alive lief alle drei Tage und war am 28. September, 1. Oktober und 4. Oktober erfolgreich. Zwischen dem letzten Erfolg und dem Ausfall lagen höchstens drei Tage.
- Der Ping war eine einzelne anonyme Abfrage auf die Pflanzentabelle. Für anonyme Aufrufer liefert die Tabelle wegen der Zugriffsregeln eine leere Liste.
- Der zweite Weg aus dem Betriebskonzept, ein täglicher Ping vom 24/7-PC (`scripts/keepalive.ps1`), war nie eingerichtet: auf dem PC gibt es keine geplante Aufgabe dafür und keine Log-Datei.
- In den Wochen davor hat niemand die App mit Anmeldung benutzt.

Die wahrscheinlichste Erklärung ist, dass ein leichter anonymer Aufruf alle drei Tage Supabase als Aktivität nicht genügt hat. Belegt ist das nicht. Supabase schickt vor und bei einer Pausierung eine E-Mail an den Projektinhaber; darin steht der Grund. **Offen: diese E-Mail in Dirks Postfach nachlesen und das Ergebnis hier eintragen.**

## Warum es fünf Wochen niemand gemerkt hat

Der Keep-alive ist 14-mal hintereinander fehlgeschlagen, aber nichts hat Dirk darauf gestoßen. GitHub schickt bei fehlgeschlagenen Zeitplan-Läufen zwar eine E-Mail an die Person, die den Zeitplan zuletzt geändert hat; die ist entweder nicht angekommen oder untergegangen. Eine eigene Meldung gab es nicht.

## Was jetzt anders ist (Phase 33)

1. **Täglich statt alle drei Tage.** `supabase-keepalive.yml` läuft jeden Morgen und fragt Datenbank und Anmeldedienst ab, mit drei Versuchen.
2. **Meldung binnen eines Tages.** Scheitert der Lauf, legt er ein GitHub-Issue „Backend nicht erreichbar (Supabase Keep-alive)" an und weist es dem Inhaber des Repositories zu. GitHub benachrichtigt den Zugewiesenen. Solange der Ausfall anhält, kommt täglich ein Kommentar dazu; antwortet das Backend wieder, schließt sich das Issue von selbst.
3. **In der App sichtbar.** Der Speicherstatus sagt, was noch nicht abgeglichen ist, und dass die Sofort-Verbindung fehlt.

Voraussetzung für Punkt 2: In den GitHub-Einstellungen müssen Benachrichtigungen für zugewiesene Issues eingeschaltet sein (Standard: E-Mail und Web).

## Was noch offen ist

- Die E-Mail von Supabase zur Pausierung nachlesen (siehe oben).
- Der tägliche Ping vom PC ist weiterhin nicht eingerichtet. Mit dem täglichen GitHub-Lauf ist er kein Muss mehr, bleibt aber der einzige Weg, der nicht von GitHub abhängt. Einrichtung: Kommentar am Anfang von `scripts/keepalive.ps1`.
- Der GitHub-Zeitplan schaltet sich nach 60 Tagen ohne Aktivität im Repository selbst ab. Wer länger nichts am Code ändert, muss ihn unter Actions wieder einschalten.

## Wenn es wieder passiert

1. Supabase-Dashboard öffnen, Projekt `vitrqkzxkiqvadqfzrcx` wählen, wiederherstellen. Pausierte Projekte hält Supabase nur begrenzte Zeit vor (zum Zeitpunkt dieses Dokuments nennt Supabase 90 Tage), danach bleibt nur ein Backup.
2. Unter Actions den Lauf „Supabase Keep-alive" von Hand starten. Läuft er durch, schließt sich das Issue.
3. In der App den Speicherstatus öffnen: was während des Ausfalls geändert wurde, wird jetzt abgeglichen.

## Backups

Vor der ersten Migration von Phase 33 wurde am 14. November 2026 ein Backup gezogen (Schema und Daten des `public`-Schemas):

- `D:\Backups\spatenstich-vor-033-20261114-schema.sql`
- `D:\Backups\spatenstich-vor-033-20261114-data.sql`

Die Migration `20261114000021_sync_cursor.sql` wurde vor dem Einspielen auf einer Kopie aus genau diesem Backup geprüft.

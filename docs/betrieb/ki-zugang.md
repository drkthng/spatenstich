# KI-Zugang einrichten und betreiben

Stand: 14. November 2026 (Phase 34).

Die App ruft die Claude-API nie selbst auf. Sie fragt die Edge Function `ai` im Supabase-Projekt; nur dort liegt der API-Schlüssel. Jede Anfrage wird im Verbrauchsbuch festgehalten und gegen die Monatsgrenze des Gartens geprüft.

## Einmalig einrichten (nur Dirk)

1. **API-Schlüssel hinterlegen.** In der Anthropic Console einen Schlüssel anlegen und als Secret der Edge Functions speichern. Zwei Wege:
   - Supabase-Dashboard → Projekt `vitrqkzxkiqvadqfzrcx` → Edge Functions → Secrets → `ANTHROPIC_API_KEY`.
   - Oder im Terminal im Repository: `supabase secrets set ANTHROPIC_API_KEY=<Schlüssel>`. Danach die Terminal-Historie nicht teilen; der Schlüssel steht darin.

   Der Schlüssel gehört nirgendwo sonst hin: nicht in `.env`, nicht in eine Datei im Repository, nicht in GitHub-Secrets für den Web-Build.
2. **Grenze beim Anbieter setzen.** In der Anthropic Console für den Schlüssel bzw. das Konto ein Monatslimit von 100 $ einstellen. Das ist die zweite Sicherung, falls die Grenze in der App einmal nicht greift.
3. **Testen.** In der App: Einstellungen → „KI und Verbrauch" → „KI testen". Es erscheint ein Satz als Antwort und ein Eintrag im Verbrauchsbuch. Dasselbe mit dem zweiten Konto.

Solange kein Schlüssel hinterlegt ist, sagt die App: „Die KI ist noch nicht eingerichtet". Alles andere funktioniert.

## Was die Funktion prüft, in dieser Reihenfolge

1. Anmeldung: das Token wird beim Auth-Dienst geprüft. Ohne gültige Anmeldung: abgelehnt.
2. Mitgliedschaft im Garten. Kein Mitglied: abgelehnt.
3. Monatsgrenze des Gartens (Vorgabe 100 $, der Besitzer kann sie in der App ändern, höchstens 1000 $). Erreicht: abgelehnt bis zum Monatswechsel (Monat nach deutscher Zeit).
4. Stundengrenze: 20 Anfragen pro Person und Stunde.
5. Erst dann geht die Anfrage an das Modell (`claude-opus-5-5`).

Die App schickt nur den Namen einer Funktion (bisher: `test`) und deren Eingaben. Prompt, Modell und Token-Grenzen stehen in `supabase/functions/ai/features.ts`. Die Funktion lässt sich also nicht als allgemeiner Zugang zum Schlüssel benutzen.

Lehnt die Sicherheitsprüfung des Modells eine Anfrage ab, versucht die API sie im selben Aufruf auf einem Ausweichmodell (`fallbacks: "default"`). Abgerechnet wird nach dem Modell, das geantwortet hat.

## Verbrauchsbuch und Kosten

Tabelle `ai_usage`: Garten, Person, Funktion, Modell, Token hinein und heraus, Kosten in Dollar, Ergebnis. Beide Mitglieder können sie lesen; schreiben kann nur die Edge Function. Fehlgeschlagene Anfragen stehen mit 0 $ darin und zählen für die Stundengrenze.

Die Kosten rechnet die Funktion aus den Token-Zahlen der API und der Preistabelle in `supabase/functions/ai/pricing.ts`. **Wenn Anthropic die Preise ändert oder ein neues Modell eingestellt wird, muss diese Tabelle angepasst werden.** Ein Modell, das dort fehlt, wird zum teuersten bekannten Satz gerechnet, damit das Buch nie zu wenig zeigt. Maßgeblich für die echte Rechnung bleibt die Anthropic Console.

## Schlüssel-Prüfung in der CI

Vor jedem Deploy läuft `scripts/check-secrets.mjs` über alle Dateien im Repository und über das gebaute Bundle. Es schlägt an bei Anthropic-Schlüsseln, Supabase-Secret-Keys und Service-Role-Tokens. `scripts/check-secrets.test.mjs` legt vorher absichtlich erfundene Schlüssel in ein Test-Verzeichnis und erwartet, dass die Prüfung sie findet; ohne diesen Nachweis startet die eigentliche Prüfung nicht.

Schlägt die Prüfung an: den Schlüssel in der Anthropic Console sofort sperren und neu anlegen. Ein Schlüssel, der einmal in einem öffentlichen Repository stand, gilt als bekannt, auch wenn der Commit wieder entfernt wird.

## Funktion ändern und ausliefern

```
cd supabase/functions/ai
deno check index.ts
deno test
cd ../../..
supabase functions deploy ai --use-api
```

Die Funktion wird nicht automatisch mit der Web-App ausgeliefert.

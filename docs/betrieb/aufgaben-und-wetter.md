# Aufgaben für heute und Wetter

Stand: 15. November 2026 (Phase 36).

## Woher die Liste kommt

Die Liste „Was heute zu tun ist" entsteht auf dem Gerät, ohne Netz, aus:

- dem Plan (Beete, Pflanzen, Rasen, Kompost, Wasserstelle, Baum),
- dem Kalender der Pflanzen im Plan (Vorziehen, Säen, Auspflanzen, Ernten), verschoben nach Klimazone,
- der Jahreszeit (Gießen, Jäten, Beete vorbereiten, Laub, Wasser abstellen, Werkzeug, Anbau planen),
- der zuletzt geladenen Wettervorhersage (Frost, Regen, Hitze),
- eigenen Aufgaben der Mitglieder,
- angenommenen Befunden aus dem Foto-Abgleich, die als Aufgabe vorgemerkt wurden.

Die Regeln stehen in `app/src/lib/tasks/rules.ts`. Gleiche Eingaben ergeben dieselbe Liste in derselben Reihenfolge. Die Zeitfenster und Dauern der Jahreszeit-Aufgaben sind Erfahrungswerte, keine Messwerte; wer sie ändern will, ändert sie dort.

## Was in der Datenbank steht

| Tabelle | Inhalt |
|---|---|
| `garden_tasks` | eigene Aufgaben (einmalig oder alle n Tage) |
| `task_done` | was abgehakt wurde und bis wann es von der Liste bleibt |
| `task_sorts` | die Reihenfolge, die die KI einer Tagesliste gegeben hat |
| `weather_cache` | die Vorhersage je Postleitzahl; nur die Wetter-Funktion liest und schreibt sie |

Die ersten drei werden wie der Plan abgeglichen. Ein abgehakter Eintrag erreicht den Partner über die Live-Verbindung innerhalb von Sekunden.

## KI-Sortierung

Die Edge Function `ai` hat dafür die Funktion `task_sort`. Sie bekommt die Liste (Titel, Ort, Dauer, Dringlichkeit, Begründung der App), das Zeitbudget, den Monat und einen Satz zum Wetter. Zurück kommt nur eine Reihenfolge mit je einem Satz Begründung. Die KI kann keine Aufgabe hinzufügen, weglassen oder ändern; was nicht zur Liste gehört, wird verworfen.

Gefragt wird, sobald jemand die Liste anzeigt und Netz da ist, höchstens einmal je Tag, Zeitbudget und Liste. Die Antwort wird in `task_sorts` gespeichert und gilt für beide Mitglieder. Abhaken ändert die Liste des Tages nicht und löst keine neue Anfrage aus; eine neue eigene Aufgabe oder ein neuer Befund schon. Ohne Netz, bei erreichtem Monatsbudget oder wenn die KI nicht antwortet, bleibt die Grundliste stehen, und die Liste sagt das.

Kosten nach der Preistabelle: eine Sortierung liegt grob bei einem Cent. Bei fünf Zeitbudgets sind das höchstens einige Cent am Tag. Das ist gerechnet, nicht gemessen.

## Wetter

Die Edge Function `weather` liefert die Vorhersage für die Postleitzahl des Gartens (drei Tage: tiefste und höchste Temperatur, Regenmenge). Das Gerät fragt nur diese Funktion, nie einen Wetterdienst direkt.

Die Funktion nutzt zwei öffentliche Dienste ohne Schlüssel:

- `api.zippopotam.us`: Postleitzahl zu Koordinaten, einmal je Postleitzahl.
- `api.open-meteo.com`: Vorhersage für Koordinaten.

Beide bekommen vom Server nur eine Postleitzahl beziehungsweise Koordinaten, keine Angaben zu Person, Konto oder Gerät. Die Vorhersage wird je Postleitzahl drei Stunden lang wiederverwendet. Fällt ein Dienst aus, gibt die Funktion die Vorhersage des letzten Tages mit dem Vermerk „alt" zurück; ist auch die älter, gibt es keine, und die Liste rechnet ohne Wetter.

Diese beiden Dienste gehören in die Datenschutzerklärung (Phase 38).

## Funktionen ausliefern

```
cd supabase/functions/weather
deno check index.ts
deno test
cd ../../..
supabase functions deploy weather --use-api
supabase functions deploy ai --use-api
```

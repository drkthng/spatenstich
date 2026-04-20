---
phase: 02-auth-profile-vereinsregeln
type: human-verify-checkpoint
status: pending
created: 2026-04-20
covers:
  - 2-02-04 (AUTH-05 stopwatch onboarding)
  - 2-04-04 (E2E PDF + Logout + Local→Account migration + edit-fix verification)
resume_cmd: /gsd-progress
---

# Phase 02 — Human-Verify Checkpoint (pending)

**Supabase:** `vitrqkzxkiqvadqfzrcx` (Frankfurt) — Dashboard: https://supabase.com/dashboard/project/vitrqkzxkiqvadqfzrcx

**Status:** Phase 02 ist code-komplett + re-verified (PASS-pending-human-verify). Die letzten Code-Fixes (Supabase-Spalten-Mapping `e6b8c30` + Inline-Edit-Wire `d885901`) sind gemerged. Jetzt müssen die beiden aufgeschobenen Device-QA-Checkpoints manuell durchlaufen werden, bevor Phase 03 (Offline & Sync) startet.

---

## 0. Vorbereitung (einmalig)

- [ ] Edge Function aktiv: Dashboard → Edge Functions → `extract-vereinsregeln` muss **ACTIVE** zeigen.
      Falls nicht deployed: `supabase functions deploy extract-vereinsregeln --project-ref vitrqkzxkiqvadqfzrcx`
- [ ] `CLAUDE_API_KEY` als Supabase-Secret gesetzt: Dashboard → Project Settings → Edge Function Secrets (FOUND-06 — darf NIE im Client-Bundle landen).
      Falls fehlt: `supabase secrets set CLAUDE_API_KEY=sk-ant-... --project-ref vitrqkzxkiqvadqfzrcx`
- [ ] Migration 002 angewendet: Dashboard → Tables → `profiles` und `vereinsregeln` existieren mit RLS aktiv
- [ ] Test-PDF bereit: echte deutsche Vereinssatzung, 1–3 Seiten, < 5 MB

---

## 1. Checkpoint 2-02-04 — Web, Lokal-Modus, AUTH-05 Stoppuhr

**Stoppuhr starten bei Schritt 1.**

1. Terminal: `pnpm --filter app start --web` → im Browser im **Inkognito-Fenster** öffnen
2. **Auth-Wahl-Screen** muss erster Screen sein → "Rechtlicher Hinweis" auf- und zuklappen (NFR-07)
3. "Lokal starten" tippen → landet auf Garten-Plan-Placeholder
4. URL manuell auf `/(auth)` setzen → muss zurück auf `/(app)` umleiten (Guard)
5. Profil öffnen → **3 InlineBanner** (PLZ, Archetyp, Vereinsregeln) + neutrale BKleingG-Badge "Plan noch nicht vorhanden"
6. PLZ-Banner → `12043` eingeben → Badge "Klimazone 4" erscheint **sofort** beim Tippen; speichern → Banner verschwindet
7. Archetyp-Banner → 6-Karten-Grid → "Selbstversorger" wählen → Accent-Border + Check; speichern → Banner verschwindet
8. **Browser neu laden** → UUID + PLZ + Archetyp überleben (localStorage / IndexedDB)

**Stoppuhr stoppen.** Zielzeit: **< 5 Minuten** (AUTH-05).

---

## 2. Checkpoint 2-04-04 A — Web, Vereinsregeln-Checkliste + Lokal→Account-Migration

9. Zurück auf Profil → **Vereinsregeln-Banner** tippen
10. **"PDF hochladen"-Karte muss ausgegraut sein** mit Lock-Icon (Local-Mode-Sperre); drauftippen → Info-Block + "Account erstellen"-Link (**kein Modal!** — Pitfall 4)
11. "Checkliste ausfüllen" tippen → 12 Items als **flache Liste** (keine Kategorien — dokumentierte Abweichung); 3–4 anhaken, Werte eintragen; speichern
12. **Confirm-Screen:**
    - BKleingG-Gruppe **ganz oben**, Einträge mit Lock-Icon, **kein Switch**
    - Save-Button **deaktiviert**
    - Nach unten scrollen → Save **aktiv** → speichern
13. Settings öffnen → "Account erstellen und Daten übertragen"-CTA (kein Logout im Local-Mode)
14. E-Mail `test+migrate-<timestamp>@example.com` + Passwort `Test1234!` → "Übertragen"
15. Umleitung zurück auf `(app)/index` + Settings zeigt jetzt **Logout** (Mode geflippt)
16. Supabase Dashboard → Tables → `profiles` + `vereinsregeln`: Zeilen für neuen `user_id` vorhanden. **Wichtig — verifiziert Fix `e6b8c30`:** Spalte `ist_bkleingg` ist boolean (nicht null, nicht leer); KEIN `istBKleingG`-Feld in der Dashboard-Tabelle.

---

## 3. Checkpoint 2-04-04 B — Native, Account + PDF + Logout

17. Terminal: `pnpm --filter app start` → QR in **Expo Go** (iPhone/Android) scannen
18. Auth-Wahl → "Account erstellen" → neue E-Mail + Passwort → absenden → entweder Verify-Email-Screen oder direkt `(app)/index`
19. Falls Verify-Email: Link aus Mail öffnen, zurück, neu starten → `(app)/index`
20. PLZ + Archetyp eintragen (wie Web 6–7)
21. Vereinsregeln-Einstieg: **beide Karten aktiv** (Account-Mode)
22. "PDF hochladen" → nativer DocumentPicker → Test-Satzung
23. **ExtractionLoader** "Regeln werden extrahiert…" → 10–30 s warten
24. Confirm-Screen: mind. 1 extrahierte Regel im User-Bereich
    - **Eine Regel Stift tippen** → Inline-Editor erscheint → Titel ändern → "Übernehmen" → Änderung sichtbar. **Das verifiziert Fix `d885901`** (SC5 Edit-Capability)
    - Eine Regel via Switch deaktivieren
    - Eine Regel via Mülleimer löschen
    - Nach unten scrollen → Save → zurück zum Profil
25. Profil: Vereinsregeln-Banner weg; TrafficLightBadge bleibt neutral
26. Settings → "Abmelden" → Inline-Expansion "Wirklich abmelden?" (**kein Modal**) → "Ja, abmelden" → Umleitung auf `(auth)/index`
27. Device-Back-Button bzw. Browser-Zurück: **darf nicht** wieder in `(app)` reinkommen

---

## 4. Checkpoint 2-04-04 D — RULES-04 DOM-Spot-Check

28. Confirm-Screen (Web) → React DevTools öffnen
29. BKleingG-Zeile inspizieren → **kein** `Switch` im Subtree, nur `Lock`-Icon + Text
30. User-Zeile inspizieren → `Switch` vorhanden

---

## 5. Checkpoint 2-04-04 E — Abbrechen-Test

31. Native, Account-Mode → "PDF hochladen" → PDF wählen
32. Sobald ExtractionLoader erscheint: **innerhalb von 2 s** "Abbrechen" tippen
33. Erwartung: zurück auf Upload-Einstieg, **kein Error-Toast**, **keine** Navigation zum Confirm-Screen

---

## 6. Akzeptanz-Checkliste (alle 10 müssen ✅)

- [ ] NFR-07 — Haftungsausschluss klappbar auf Auth-Wahl (Web + Native) — Schritt 2 + 17/18
- [ ] AUTH-05 — Local-Onboarding unter 5 Min — Schritt 1–8
- [ ] RULES-04 — BKleingG nicht toggelbar / löschbar — Schritt 12 + 29
- [ ] RULES-05 — TrafficLightBadge neutral im Profil — Schritt 5 + 25
- [ ] Pitfall 4 — Local-Mode PDF-Karte: ausgegraut + Inline-CTA, **kein Modal** — Schritt 10
- [ ] AUTH-04 — Migration-Zeilen in Supabase mit neuem `user_id` — Schritt 16
- [ ] **Column-Mapping** (Fix `e6b8c30`) — Supabase-Zeile hat Spalte `ist_bkleingg` nicht `istBKleingG` — Schritt 16
- [ ] **Edit-Wire** (Fix `d885901`) — Inline-Editor, Titel-Änderung bleibt erhalten — Schritt 24 Mitte
- [ ] RULES-01 — Edge Function liefert ≥ 1 Regel aus PDF in < 55 s — Schritt 23
- [ ] Logout-Guard — Back-Nav blockiert — Schritt 27

---

## 7. Wenn alles grün

Sag Claude:
> "Phase 02 human-verify durch, alle 10 grün. ROADMAP auf done setzen und Phase 03 starten."

Dann macht Claude:
1. `ROADMAP.md` Phase 02 Checkbox → `[x]` + Datum + "Complete" in Progress-Tabelle
2. `STATE.md` → `completed_phases: 2`, `completed_plans: 8` (inklusive CHECKPOINT als impliziten 8.)
3. `/gsd-plan-phase 03` starten (Offline & Sync)

---

## 8. Wenn etwas rot

Schick Claude:
- Schritt-Nummer (1–33)
- Kurze Beschreibung was falsch war
- Screenshot (optional, aber hilfreich)

Claude analysiert gezielt und schlägt Fix vor. Kein Bypass, kein "Workaround" — wir debuggen root-cause.

---

*Datei-Ursprung: zusammengeführt aus `02-02-SUMMARY.md:215-224` (Checkpoint 2-02-04) + `02-04-SUMMARY.md:182-234` (Checkpoint 2-04-04) + zwei neue Verifikations-Items für die post-hoc Fixes `e6b8c30` und `d885901`.*

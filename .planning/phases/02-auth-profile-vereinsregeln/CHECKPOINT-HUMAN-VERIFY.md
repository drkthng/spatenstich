---
phase: 02-auth-profile-vereinsregeln
type: human-verify-checkpoint
status: reduced-pending
created: 2026-04-20
reduced: 2026-04-21
covers:
  - 2-02-04 (AUTH-05 stopwatch onboarding) — AKTIV
  - 2-04-04 Teil Migration + Logout — AKTIV
  - 2-04-04 Teil PDF + Vereinsregeln — DEFERRED zu Phase 9
resume_cmd: /gsd-progress
---

# Phase 02 — Human-Verify Checkpoint (reduziert nach Pivot 2026-04-21)

**Supabase:** `vitrqkzxkiqvadqfzrcx` (Frankfurt) — Dashboard: https://supabase.com/dashboard/project/vitrqkzxkiqvadqfzrcx

**Status:** Phase 02 ist code-komplett. Nach Roadmap-Pivot (Quick 260421-v43) ist die Vereinsregeln-Schicht per Feature-Flag deaktiviert und die zugehörigen Verify-Schritte (22–33) auf Phase 9 (v1.1) verschoben. Nur noch **4 Akzeptanz-Items** müssen manuell bestätigt werden, danach startet Phase 2.5 (Shared Garden Model).

> **⏸ DEFERRED ZU PHASE 9:** Abschnitte 2.2 (Vereinsregeln-Checkliste im Profil), 3 (PDF-Upload-Flow + ExtractionLoader + Confirm-Screen + Edit-Wire-Verifikation), 4 (RULES-04 DOM-Spot-Check), 5 (Abbrechen-Test). Diese Schritte bleiben als Referenz unten stehen, sind aber im MVP nicht zu testen — sie werden in Phase 9 (Vereinsregeln-Aktivierung) abgearbeitet.

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

## 2. Checkpoint 2-04-04 A — Lokal→Account-Migration (reduziert)

> **⏸ Schritte 9–12 DEFERRED zu Phase 9** (Vereinsregeln-Banner + PDF-Karte + Checkliste + Confirm-Screen — Vereinsregeln-Scope ist per Feature-Flag aus).

13. Settings öffnen → "Account erstellen und Daten übertragen"-CTA (kein Logout im Local-Mode)
14. E-Mail `test+migrate-<timestamp>@example.com` + Passwort `Test1234!` → "Übertragen"
15. Umleitung zurück auf `(app)/index` + Settings zeigt jetzt **Logout** (Mode geflippt)
16. Supabase Dashboard → Tables → `profiles` + `vereinsregeln`: Zeilen für neuen `user_id` vorhanden. **Wichtig — verifiziert Fix `e6b8c30`:** Spalte `ist_bkleingg` ist boolean (nicht null, nicht leer); KEIN `istBKleingG`-Feld in der Dashboard-Tabelle.

---

## 3. Checkpoint 2-04-04 B — Native, Account + Logout (reduziert)

17. Terminal: `pnpm --filter app start` → QR in **Expo Go** (iPhone/Android) scannen
18. Auth-Wahl → "Account erstellen" → neue E-Mail + Passwort → absenden → entweder Verify-Email-Screen oder direkt `(app)/index`
19. Falls Verify-Email: Link aus Mail öffnen, zurück, neu starten → `(app)/index`
20. PLZ + Archetyp eintragen (wie Web 6–7)

> **⏸ Schritte 21–25 DEFERRED zu Phase 9** (Vereinsregeln-Einstieg + PDF-Upload + ExtractionLoader + Confirm-Screen + Edit-Wire-Verifikation `d885901` + Profil-Banner — alle Vereinsregeln-Feature-Flag aus im MVP).

26. Settings → "Abmelden" → Inline-Expansion "Wirklich abmelden?" (**kein Modal**) → "Ja, abmelden" → Umleitung auf `(auth)/index`
27. Device-Back-Button bzw. Browser-Zurück: **darf nicht** wieder in `(app)` reinkommen

---

## 4. Checkpoint 2-04-04 D — RULES-04 DOM-Spot-Check ⏸ DEFERRED zu Phase 9

> Kompletter Abschnitt (Schritte 28–30) auf Phase 9 verschoben — RULES-04 betrifft nur die ausgeblendete Vereinsregeln-Confirm-Screen.

---

## 5. Checkpoint 2-04-04 E — Abbrechen-Test ⏸ DEFERRED zu Phase 9

> Kompletter Abschnitt (Schritte 31–33) auf Phase 9 verschoben — testet PDF-Upload-Abbruch (Vereinsregeln-Feature-Flag aus).

---

## 6. Akzeptanz-Checkliste (4 aktive Items im MVP, reduziert nach Pivot 2026-04-21)

**Aktiv (müssen ✅ für Phase 02 Abschluss):**

- [ ] NFR-07 — Haftungsausschluss klappbar auf Auth-Wahl (Web + Native) — Schritt 2 + 17/18
- [ ] AUTH-05 — Local-Onboarding unter 5 Min — Schritt 1–8
- [ ] AUTH-04 — Migration-Zeilen in Supabase mit neuem `user_id` — Schritt 16
- [ ] Logout-Guard — Back-Nav blockiert — Schritt 27

**⏸ DEFERRED zu Phase 9 (v1.1, Vereinsregeln-Aktivierung):**

- RULES-04 — BKleingG nicht toggelbar / löschbar
- RULES-05 — TrafficLightBadge neutral im Profil
- Pitfall 4 — Local-Mode PDF-Karte ausgegraut
- Column-Mapping Fix `e6b8c30` — `ist_bkleingg` statt `istBKleingG` (wird in Phase 9 re-verifiziert)
- Edit-Wire Fix `d885901` — Inline-Editor Titel-Änderung (Phase 9)
- RULES-01 — Edge Function liefert ≥ 1 Regel aus PDF in < 55 s (Phase 9)

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

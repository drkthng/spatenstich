# Requirements: Kleingarten-App (Spatenstich)

**Defined:** 2026-04-15
**Core Value:** Foto rein → Plan und Kalender raus: KI-gestützte Überführung einer realen Parzelle in einen digital planbaren, regelkonformen Kleingarten-Assistenten.

## v1 Requirements

### Foundation (Technische Basis)

- [x] **FOUND-01**: Monorepo mit pnpm workspaces läuft lokal (app/, supabase/, packages/shared)
- [x] **FOUND-02**: StorageAdapter-Interface abstrahiert expo-sqlite (native) und IndexedDB (web) — kein direkter SQLite-Aufruf in Feature-Code
- [x] **FOUND-03**: Supabase-Schema mit Row Level Security auf allen Tabellen aktiviert ab Migration 001
- [x] **FOUND-04**: Feature-Flag-System über Supabase-Tabelle (`feature_flags`) operabel
- [x] **FOUND-05**: EAS Build funktioniert in CI für iOS und Web-Export
- [x] **FOUND-06**: Alle KI-API-Keys (Claude, Pl@ntNet) nur server-seitig in Edge Functions, nie im Client
- [x] **FOUND-07**: pgmq-Queue für asynchrone KI-Jobs eingerichtet (retry-Semantik via visibility timeout)
- [x] **FOUND-08**: KI-Antworten werden vollständig persistiert (roh + geparst) in `ai_results`-Tabelle

### Authentifizierung & Onboarding

- [ ] **AUTH-01**: User kann Account mit E-Mail/Passwort anlegen (Supabase Auth)
- [ ] **AUTH-02**: User kann sich einloggen und bleibt eingeloggt (persistente Session)
- [ ] **AUTH-03**: User kann App ohne Account nutzen ("lokal nutzen"-Modus, Daten nur auf Gerät)
- [x] **AUTH-04**: User kann später aus lokalem Modus in Account-Modus wechseln (Sync bestehender Daten)
- [ ] **AUTH-05**: Onboarding-Flow führt in < 5 Minuten zu erstem nutzbaren Plan: Account/lokal → PLZ → Archetyp → Vereinsregeln (optional) → Garten-Erfassung

### Shared Garden (Phase 2.5 — Pivot 2026-04-21)

- [x] **GARDEN-01**: `gardens`-Tabelle + `garden_members`-Tabelle + RLS-Policies auf Member-Check (`(select auth.uid()) IN (SELECT user_id FROM public.garden_members WHERE garden_id = <row>.garden_id)`) auf allen Phase-2-Tabellen (vereinsregeln, ai_jobs, ai_results) statt direktem `user_id = auth.uid()`-Check. Max 2 Member pro Garten enforced via `BEFORE INSERT TRIGGER` auf `garden_members` (CHECK mit Subquery ist in Postgres nicht erlaubt).
- [x] **GARDEN-02**: 6-stelliger Invite-Code-Flow über Postgres-RPCs (SECURITY DEFINER): `create_invite_for_garden(p_garden_id uuid) → text` (Owner-only, invalidiert alten Code vor Erzeugung — D-11) und `consume_invite_code(p_code text) → uuid` (atomic UPDATE … RETURNING, 24 h TTL, single-use via `consumed_at`-Spalte). Alphabet `123456789ABCDEFGHJKMNPQRSTVWXYZ` (Crockford ohne 0/O/I/L/U). Ergänzend (D-16 Owner-Rights): `delete_garden(p_garden_id uuid)` (nur Owner; blockt wenn weitere Member existieren) + `transfer_ownership(p_garden_id uuid, p_to_user_id uuid)` (atomic Role-Swap zwischen Owner und Ziel-Member).
- [ ] **GARDEN-03**: Migration 003 seeded Default-Garten pro Bestands-`profiles`-Row (`INSERT INTO gardens … FROM profiles`) + Backfill aller vereinsregeln/ai_jobs/ai_results-Rows mit `garden_id` → `SET NOT NULL`. `migrateLocalToAccount.ts` wird erweitert: nach signUp `ensure_default_garden_for_user()` RPC → gardenId im anschließenden profile/vereinsregeln-Upsert mit-einstempeln. Lokal-Modus bleibt single-user (kein Garten-Konzept in StorageAdapter, D-13).
- [x] **GARDEN-04**: LWW-Tracking via `updated_at timestamptz` (BEFORE UPDATE Trigger `public.tg_set_updated_at` aus Migration 001 wiederverwendet) + `updated_by_user_id uuid REFERENCES auth.users(id)` (Client-first fill in `toRow`, BEFORE UPDATE Trigger `tg_set_updated_by_user_id` als Fallback). UI zeigt inline unter garden-scoped Rows "zuletzt bearbeitet von {display_name}, {relative-time}" — Source für Name ist `profiles.display_name` des User mit `id = updated_by_user_id`.

### Profil & Standort

- [ ] **PROF-01**: User kann PLZ eingeben, App ordnet automatisch eine der 7 Klimazonen zu (statische Lookup-Tabelle)
- [ ] **PROF-02**: User kann Garten-Archetyp wählen (6 Optionen: Selbstversorger, Familien-Naschgarten, Mix ausgewogen, Zier- & Erholungsgarten, Biodiversitäts-/Naturgarten, Kräuter-/Apothekergarten)
- [ ] **PROF-03**: Profil-Daten (PLZ, Klimazone, Archetyp) beeinflussen Aussaatdaten und Sortenvorschläge
- [ ] **PROF-04**: User kann Profil jederzeit ändern (Archetyp-Wechsel, PLZ-Korrektur)

### Vereinsregeln

- [ ] **RULES-01**: User kann PDF/Bild der Vereinssatzung hochladen; Claude extrahiert Regeln in strukturiertes JSON (VereinsRegel-Datenmodell)
- [x] **RULES-02**: User kann extrahierte Regeln bestätigen, korrigieren oder löschen
- [x] **RULES-03**: User kann alternativ Vereinsregeln über Checkliste gängiger Regeln eingeben (Heckenmaß, Laubenmaß, Baumverbote etc.)
- [x] **RULES-04**: BKleingG-Grundregeln sind immer aktiv (1/3-Nutzgartenpflicht, Hochstamm-Verbote)
- [x] **RULES-05**: App zeigt Warnung wenn Nutz/Zier-Verhältnis im Plan die 1/3-Nutzgarten-Schwelle unterschreitet

### Garten-Erfassung (M1)

- [ ] **PHOTO-01**: User kann mind. 3 Garten-Fotos aufnehmen oder hochladen (geführter Flow mit Winkel-Anleitung: Übersicht, Nord, Süd)
- [ ] **PHOTO-02**: User gibt Garten-Maße ein (L×B in Metern; Formen: Rechteck, L-Form, Trapez, freie Eckpunkte)
- [ ] **PHOTO-03**: Bilder werden client-seitig auf max. 1.15 MP skaliert vor Upload (Edge Function CPU-Limit-Schutz)
- [x] **PHOTO-04**: Claude Vision analysiert Fotos + Maße server-seitig und gibt strukturiertes JSON zurück (Elemente mit Typ, Position in Metern, Konfidenz)
- [ ] **PHOTO-05**: Erkannte Elemente werden dem User einzeln zur Bestätigung oder Ablehnung angezeigt (Konfidenz-UI)
- [ ] **PHOTO-06**: App rendert schematischen 2D-Plan aus bestätigtem JSON (gezeichneter Stil, nicht fotorealistisch)
- [ ] **PHOTO-07**: Edge Case: nur 1 Foto → Warnung, Analyse trotzdem versucht
- [ ] **PHOTO-08**: Edge Case: keine Elemente erkannt → leere Plan-Vorlage mit eingegebenen Maßen, User baut manuell

### Plan-Editor (M2)

- [ ] **EDIT-01**: Canvas mit Maß-Gitter (1×1 m, ein-/ausblendbar) — implementiert mit @shopify/react-native-skia (GPU-threaded, 60fps)
- [ ] **EDIT-02**: Element-Palette (Seitenleiste/Drawer): Beete, Pflanzen (Gemüse, Kräuter, Blumen, Obstgehölze, Stauden), Infrastruktur (Weg, Zaun, Laube, Kompost, Wasserstelle, Sitzplatz)
- [ ] **EDIT-03**: User kann Elemente per Drag & Drop auf Canvas platzieren (react-native-gesture-handler, nicht PanResponder)
- [ ] **EDIT-04**: User kann Elemente rotieren und skalieren
- [ ] **EDIT-05**: User kann Beete als Polygon zeichnen (Eckpunkte setzen)
- [ ] **EDIT-06**: Koordinaten werden in Gartenmetern gespeichert (nicht Pixel) — Screen-Koordinaten nur für Rendering berechnet
- [ ] **EDIT-07**: Pflanzen-Abstandshinweis erscheint beim Platzieren (aus Sorten-Metadaten, z.B. "Tomate: 60 cm Abstand")
- [ ] **EDIT-08**: Zwei Layer: Infrastruktur (dauerhaft) und Jahresplan (saison-spezifisch, wechselbar)
- [ ] **EDIT-09**: Auto-Save alle 5 Sekunden + manuelles Speichern
- [ ] **EDIT-10**: Vereinsregel-Warnung erscheint inline wenn User regelwidriges Element platziert (z.B. verbotener Baum)
- [ ] **EDIT-11**: Undo/Redo (mind. 20 Schritte, via zundo-Middleware auf Zustand-Store)
- [ ] **EDIT-12**: Plan-Editor läuft mit 60fps bei bis zu 200 Elementen auf echtem iOS-Gerät

### Saatgut-Inventar (M3)

- [ ] **SEED-01**: User kann Samentüten fotografieren; Claude Vision extrahiert Sortenname, Aussaatzeitraum, Haltbarkeitsdatum
- [ ] **SEED-02**: User kann Sorten per Texteingabe hinzufügen (Autocomplete gegen Sorten-DB)
- [ ] **SEED-03**: User kann Inventar-Einträge bearbeiten und löschen
- [ ] **SEED-04**: Sorten-DB enthält 100–150 häufige Kleingartenpflanzen (Gemüse, Kräuter, Blumen, Obstgehölze) mit vollständigen Metadaten
- [ ] **SEED-05**: Sorte nicht in DB → Freitext-Eintrag möglich (wird nicht verworfen)
- [ ] **SEED-06**: Inventar zeigt Haltbarkeits-Status (abgelaufen / läuft bald ab / ok)

### Pflanz- & Aussaatkalender (M4)

- [ ] **CAL-01**: Zeitachse (12 Monate, scrollbar) zeigt Aufgaben-Karten pro Sorte aus Inventar
- [ ] **CAL-02**: Aufgaben-Daten werden klimazonenspezifisch berechnet (Offset ± Wochen vs. Referenz)
- [ ] **CAL-03**: Kalender unterscheidet: Vorkultur (innen/Gewächshaus), Direktsaat, Auspflanzen, Ernte
- [ ] **CAL-04**: Pro Sorte wird ein Platzierungs-Vorschlag auf dem Plan gemacht (freie Beetfläche + Standort-Anforderung)
- [ ] **CAL-05**: User bestätigt oder ändert Platzierungs-Vorschlag → Pflanze landet im Plan, Kalender-Aufgabe wird aktiv
- [ ] **CAL-06**: Einfache Fruchtfolge-Warnung: offensichtliche Fehler (gleiche Pflanzenfamilie wie Vorjahr) werden angezeigt

### Offline & Sync

- [ ] **SYNC-01**: App startet und zeigt letzten Plan ohne Netzverbindung
- [ ] **SYNC-02**: Foto-Queue funktioniert offline (Fotos werden lokal gespeichert, KI-Analyse wird gequeued)
- [ ] **SYNC-03**: Sync-Queue verarbeitet ausstehende Operationen automatisch beim Wiederherstellen der Verbindung (Last-Write-Wins, Single-User)
- [ ] **SYNC-04**: User sieht Sync-Status (ausstehende Operationen, Fehler)

### Nicht-funktionale Anforderungen

- [ ] **NFR-01**: App ist auf iPhone und Desktop-Browser nutzbar, Daten synchron
- [ ] **NFR-02**: KI-Analyse ist asynchron mit Loading-State (kein blockierendes UI)
- [x] **NFR-03**: KI-Budget-Limit: Soft-Warnung bei 50 Claude-Calls/User/Tag, Hard-Stop bei 200/Tag
- [ ] **NFR-04**: Alle Fotos verschlüsselt at-rest (Supabase Storage, EU Frankfurt)
- [ ] **NFR-05**: Geo-Daten (EXIF) nur mit explizitem Opt-in genutzt
- [x] **NFR-06**: UI-Strings zentralisiert in `de.json` (spätere Lokalisierung vorbereitet, nicht umgesetzt)
- [x] **NFR-07**: Haftungsausschluss im UI: "Die App gibt Empfehlungen ohne Gewähr. BKleingG-Compliance liegt in der Verantwortung des Nutzers."
- [x] **NFR-08**: Sentry (EU) für Crash-Reporting eingerichtet

## v2 Requirements

### Pflegeerinnerungen (S1)

- **CARE-01**: Aufgaben-Engine generiert Erinnerungen auf Basis Plan (Zurückschneiden, Ernten, Jäten, Düngen)
- **CARE-02**: Push-Notifications für fällige Aufgaben

### Unkraut-Check per Foto (S2)

- **WEED-01**: User fotografiert Beet, App vergleicht mit Soll-Plan und markiert Fremdgewächse
- **WEED-02**: Kombination Claude Vision (Kontext) + Pl@ntNet (Identifikation)

### AI-Bildvorschau (S3)

- **PREV-01**: Geplanter Garten wird als fotorealistisches Rendering visualisiert

### Fruchtfolge-Assistent (S4)

- **CROP-01**: Mehrjährige Sicht auf Pflanzenfamilien-Rotation pro Beet
- **CROP-02**: Automatischer Vorschlag für optimale Fruchtfolge

### Mischkultur-Check (S5)

- **COMP-01**: Beim Platzieren: gute/schlechte Nachbarn werden angezeigt
- **COMP-02**: Mischkultur-Score pro Beet-Kombination

### Barcode/EAN-Scan (S6)

- **SCAN-01**: Samentüten per EAN-Barcode scannen und automatisch zuordnen

## Out of Scope

| Feature | Grund |
|---------|-------|
| Social features, Community, Chat | Kein Multi-User-Fokus im MVP; lenkt von Kern-USP ab |
| Marktplatz für Samentausch | Außerhalb Kern-Use-Case; eigene Komplexität |
| Eigenes trainiertes ML-Modell | Externe APIs (Claude, Pl@ntNet) reichen für MVP |
| AT/CH-Lokalisierung | Anderes Regelwerk; nach MVP |
| Wetter-Integration (Frost-/Hitzewarnung) | v2+; erhöht API-Abhängigkeiten |
| PDF-Export Jahresplan | v2+; nice-to-have |
| Mehrpersonen-Gärten (Shared Access) | Multi-Tenant-Komplexität; RLS vorbereitet, Feature nicht umgesetzt |
| 3D-Visualisierung / AR | Kein Mehrwert für Kleingarten-Planung; Over-Engineering |
| Krankheits-/Schädlingsdiagnose per Foto | v2+; eigene UX-Komplexität |
| Ernte-Tagebuch / Jahresrückblick | v2+ |
| Sprach-Notizen beim Rundgang | v2+ |
| Vereins-Satzungsdatenbank (Community) | v2+; eigene Moderation nötig |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| FOUND-08 | Phase 1 | Complete |
| NFR-06 | Phase 1 | Complete |
| NFR-08 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Complete (Plan 02-04, commit 2a621bd) |
| AUTH-05 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| PROF-04 | Phase 2 | Pending |
| RULES-01 | Phase 2 | Pending |
| RULES-02 | Phase 2 | Complete (Plan 02-04, commit fc2a665) |
| RULES-03 | Phase 2 | Complete (Plan 02-04, commit fc2a665) |
| RULES-04 | Phase 2 | Complete (Plan 02-04, commits 0dc915a + fc2a665 — three-layer defense: UI + store + repo + DB CHECK) |
| RULES-05 | Phase 2 | Complete (Plan 02-04, neutral TrafficLightBadge render verified in profile) |
| NFR-07 | Phase 2 | Complete (Plan 02-02, inherited; 02-04 preserves Haftungsausschluss on Auth-Wahl) |
| GARDEN-01 | Phase 2.5 | Complete (Plan 02.5-02 + 02.5-03 + 02.5-04, commits d172541 + 5e1eb30 — gardenRepo D-16 Owner-Rights + Mein-Garten-Screen mit Members-List, Leave, Remove-Member, Transfer-Ownership, Delete-Garden; human-verify pending) |
| GARDEN-02 | Phase 2.5 | Complete (Plan 02.5-02 + 02.5-03 + 02.5-04, commits d172541 + 06b3cca — inviteCodeRepo createInviteForGarden/consumeInviteCode/ensureDefaultGardenForUser + join-by-code-Screen mit Crockford-Filter + 3rd AuthChoiceCard + Invite-mint Copy/Share in Mein-Garten; human-verify pending) |
| GARDEN-03 | Phase 2.5 | Schema + Client Complete (Plan 02.5-02 + Plan 02.5-03, commit 85cae92 — migrateLocalToAccount 8-step flow mit ensureDefaultGardenForUser + gardens.update; atomic-tail preserved; 13/13 Jest tests green inkl. 5 Phase-2.5-Extension-Tests.) |
| GARDEN-04 | Phase 2.5 | Complete (Plan 02.5-02 + 02.5-03 + 02.5-04, commits d172541 + 2867c37 + 5e1eb30 — updated_by_user_id DB-Trigger + Client-first fill; UI "zuletzt bearbeitet von {display_name}" Label in Mein-Garten-Screen mit testID settings-garden-lww-label; human-verify pending) |
| SYNC-01 | Phase 3 | Pending |
| SYNC-02 | Phase 3 | Pending |
| SYNC-03 | Phase 3 | Pending |
| SYNC-04 | Phase 3 | Pending |
| NFR-01 | Phase 3 | Pending |
| NFR-04 | Phase 3 | Pending |
| NFR-05 | Phase 3 | Pending |
| PHOTO-01 | Phase 4 | Pending |
| PHOTO-02 | Phase 4 | Pending |
| PHOTO-03 | Phase 4 | Pending |
| PHOTO-04 | Phase 4 | Pending |
| PHOTO-05 | Phase 4 | Pending |
| PHOTO-06 | Phase 4 | Pending |
| PHOTO-07 | Phase 4 | Pending |
| PHOTO-08 | Phase 4 | Pending |
| NFR-02 | Phase 4 | Pending |
| NFR-03 | Phase 4 | Pending |
| EDIT-01 | Phase 5 | Pending |
| EDIT-02 | Phase 5 | Pending |
| EDIT-03 | Phase 5 | Pending |
| EDIT-04 | Phase 5 | Pending |
| EDIT-05 | Phase 5 | Pending |
| EDIT-06 | Phase 5 | Pending |
| EDIT-07 | Phase 5 | Pending |
| EDIT-08 | Phase 5 | Pending |
| EDIT-09 | Phase 5 | Pending |
| EDIT-10 | Phase 5 | Pending |
| EDIT-11 | Phase 5 | Pending |
| EDIT-12 | Phase 5 | Pending |
| SEED-01 | Phase 6 | Pending |
| SEED-02 | Phase 6 | Pending |
| SEED-03 | Phase 6 | Pending |
| SEED-04 | Phase 6 | Pending |
| SEED-05 | Phase 6 | Pending |
| SEED-06 | Phase 6 | Pending |
| CAL-01 | Phase 7 | Pending |
| CAL-02 | Phase 7 | Pending |
| CAL-03 | Phase 7 | Pending |
| CAL-04 | Phase 7 | Pending |
| CAL-05 | Phase 7 | Pending |
| CAL-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 70 total (FOUND×8, AUTH×5, PROF×4, RULES×5, GARDEN×4, PHOTO×8, EDIT×12, SEED×6, CAL×6, SYNC×4, NFR×8)
- Mapped to phases: 70
- Unmapped: 0 ✓

**Note:** Earlier traceability listed 58 requirements. The correct count is 66 — the 8 NFR requirements were previously undercounted in phase assignments. All 66 are now individually mapped. Phase 2.5 pivot (2026-04-21) added 4 GARDEN requirements, bringing the total to 70.

---
*Requirements defined: 2026-04-15*
*Last updated: 2026-04-14 — traceability updated after roadmap creation (7 phases)*

---
phase: 10
slug: aussaatkalender-v1
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-12
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| profileStore.klimazone → kalenderEngine | Unintialisierter/ungültiger numerischer Input (null, NaN, out-of-range) kreuzt in DOY-Arithmetik | Klimazone (1–7), unkritisch |
| addPlantToPlan → gardenPlanRepo.writePlanElement | Schreibpfad kreuzt Local-Storage + Outbox + Supabase-RLS-Grenze | Plan-Element (Garten-Daten, member-scoped) |
| plan_elements provenance → Kalender-Logik | Free-form `Record<string,unknown>` aus Claude.ai-Import oder Editor; plantSlug/polygonPointsM untrusted, rein lesend | Pflanzen-Slugs, Polygon-Geometrie |
| URL-Slug → [slug]-Screen | `useLocalSearchParams().slug` untrusted; via `plants.find` gegen validierte Plant-DB aufgelöst | Routen-Segment |
| activeGardenId-Wechsel → Hook-State | Async-Laden; out-of-order-Antworten könnten falschen Garten anzeigen | Garten-Kalenderdaten |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-10-01 | Tampering | `zoneOffset()` kalenderEngine | mitigate | Guard `if (!klimazone \|\| klimazone < 1 \|\| klimazone > 7) return 0` (kalenderEngine.ts:36); unit-getestet mit Zone 0/99 | closed |
| T-10-02 | Denial of Service | DOY-Arithmetik über Jahresgrenze | mitigate | Clamps `Math.max(1, Math.min(365, …))` + `Math.min(53, kw)` (kalenderEngine.ts:86–90) | closed |
| T-10-03 | Spoofing / Elevation | `addPlantToPlan` Write (CAL-05) | mitigate | Defense-in-Depth: expliziter `mode !== 'account'`-Guard (useKalenderData.ts:180) + `assertAccount` in writePlanElement (gardenPlanRepo.ts:14,37) + Supabase-RLS-Member-Check serverseitig | closed |
| T-10-04 | Tampering | provenance.plantSlug Read | mitigate | `getPlantSlug` Type-Guard `typeof prov.plantSlug === 'string'` (kalenderBeete.ts:17); non-string → null → Element vom Filter ausgeschlossen, kein Crash | closed |
| T-10-05 | Integrity | addPlantToPlan bei leerem Plan | mitigate | Guard `if (!hasBeetImPlan \|\| !dimensions) throw` — kein Write in Plan ohne Beet/Dimensionen; Throw-Test vorhanden | closed |
| T-10-06 | Tampering / Injection | slug in `router.push('/(app)/kalender/' + slug)` | mitigate | slug stammt aus gebundelter, Phase-8-validierter Plant-DB (kein User-Freitext); Expo Router path-encoded; [slug]-Route rendert „nicht gefunden" bei No-Match | closed |
| T-10-07 | Information Disclosure | klimazone==null Render | mitigate | PLZ-InlineBanner + leere wochenAktionen + `klimazone ?? 4` Fallback — kein NaN/undefined im UI | closed |
| T-10-08 | Tampering | slug aus useLocalSearchParams | mitigate | `plants.find(p => p.slug === slug)` ([slug].tsx:51); unbekannter/geforgter Slug → undefined → „nicht gefunden"-Banner, kein Crash, kein Write | closed |
| T-10-09 | Elevation / Spoofing | Detail-CTA „Zu Plan hinzufügen" (CAL-05) | mitigate | Delegiert an addPlantToPlan (T-10-03-Pfad); kein direkter Storage-Zugriff im Screen; non-account → Error-Banner | closed |
| T-10-10 | Integrity | CAL-06 Family-Resolution | mitigate | getPlantSlug Type-Guard + `familyBySlug.get(ps)`; Elemente ohne auflösbaren Slug/Family vor `pruefeEinfacheFruchtfolge` gefiltert | closed |
| T-10-05-01 | Tampering | kalenderEngine Datums-/DOY-Eingabe | accept | Reine Funktion; `now` nur in Tests injiziert, KW/DOY-Clamps begrenzen jeden Wertebereich (siehe Accepted Risks) | closed |
| T-10-05-02 | Denial of Service | GanttStreifen-Render mit Fehl-Fenster | mitigate | Breiten-Guard verhindert negative width → kein Layout-Crash bei degeneriertem Fenster | closed |
| T-10-06-01 | Tampering | provenance.polygonPointsM | mitigate | `Array.isArray(polygonPointsM) && length >= 3` Guard (kalenderBeete.ts:32); degenerierte Polygone fallen auf Rechteck zurück | closed |
| T-10-06-02 | Information Disclosure | Falsche Beet-Zuordnung | mitigate | bbox-CENTER-Konventions-Fix beseitigt (+w/2,+h/2)-Verschiebung — korrekte Beet-Membership verhindert falsch zugeordnete Fruchtfolge-/Beet-Anzeigen | closed |
| T-10-07-01 | Denial of Service | Hook-Count-Instabilität [slug]-Screen | mitigate | Guard nach allen Hooks (CR-01-Fix) → konstante Hook-Anzahl, kein React-Crash | closed |
| T-10-08-RACE | Tampering | Garten-Daten bei activeGardenId-Wechsel | mitigate | cancelled-Flag verhindert Überschreiben durch verspätete Antworten; Reset bei null verhindert Cross-Garden-Datenleck in der Anzeige | closed |
| T-10-06-DATA | Tampering | parentBedId Provenance | accept | parentBedId aus real existierendem Beet gesetzt; findBedForPlant fällt bei fehlendem/gelöschtem Beet auf Point-in-Polygon zurück (siehe Accepted Risks) | closed |
| T-10-09-01 | Tampering | Filter-State-Konsistenz Wochen-View | mitigate | Chip-State als Single-Source an Hook durchgereicht — keine divergierende Doppelfilterung zwischen WochenCard und Jahresübersicht | closed |
| T-10-SC | Tampering | Supply Chain (npm) | accept | Keine neuen Packages in der gesamten Phase 10 inkl. Gap-Closure (RESEARCH §Package Legitimacy Audit); kein Install-Task existiert (siehe Accepted Risks) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-SC | Keine neuen Dependencies in Phase 10 (alle 9 Pläne); Supply-Chain-Fläche unverändert gegenüber Vorphasen | gsd-secure-phase (plan-time disposition) | 2026-06-12 |
| AR-10-02 | T-10-05-01 | Reine Berechnungsfunktion ohne externen Input-Pfad; Produktiv-Default `new Date()`, Wertebereich durch Clamps begrenzt | gsd-secure-phase (plan-time disposition) | 2026-06-12 |
| AR-10-03 | T-10-06-DATA | parentBedId wird nur aus existierenden, nicht-gelöschten Beeten gesetzt; PiP-Fallback deckt fehlende/gelöschte Beete ab (T-09-03-Pattern) | gsd-secure-phase (plan-time disposition) | 2026-06-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-12 | 19 | 19 | 0 | gsd-secure-phase (plan-time register, code spot-check: T-10-01/02/03/04/06-01/08) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-12

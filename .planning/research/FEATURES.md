# Features Research: Kleingarten-App

**Domain:** German allotment garden (Kleingarten/Schrebergarten) planning assistant
**Researched:** 2026-04-14
**Overall confidence:** HIGH for competitive landscape; HIGH for German regulatory context; MEDIUM for AI photo-to-plan capabilities

---

## Competitive Landscape

### Apps Investigated

| App | Origin | Primary Focus | Key Differentiator | Confidence |
|-----|--------|--------------|-------------------|------------|
| **Fryd** | Germany (DE/AT/CH #1) | Bed planner + companion planting | 26 climate zones DE, Saatgut-Manager, community | HIGH |
| **GrowVeg / Garden Planner** | UK/global | Full vegetable garden planner | 5-year crop rotation tracking, 21,400 varieties, email reminders | HIGH |
| **Smart Gardener** | US | Varietal-specific planting | Seed-packet-level data, family-size planting quantities | HIGH |
| **Gardenize** | Sweden | Garden journal / diary | Unlimited garden areas, photo journal, AI care notes | HIGH |
| **Beetplaner** | Germany | AI bed planner | AI garden assistant chatbot, harvest tracker, watering schedules | MEDIUM |
| **Almanac Garden Planner** | US | Layout + calendar | Auto-spacing calculation, "Garden Guru" video suggestions | MEDIUM |
| **Seed to Spoon** | US | Mobile planting tracker | Seed packet photo scan → auto-fill plant details, Growbot AI | MEDIUM |
| **Ogrovision / aigarden.design** | Global | AI garden visualization | Photo → aesthetic rendering (NOT structural 2D plan) | HIGH |

### Critical Gap Finding

**No existing app addresses the German Kleingarten regulatory context.** Neither Fryd nor any competitor tracks:
- BKleingG 1/3 Nutzgartenpflicht compliance
- Vereinssatzung rules (Laubengröße, Heckenmaße, Baumverbote)
- PDF upload of Satzung with AI extraction

Fryd is the closest competitor (German-first, climate zones) but is fundamentally a bed planner, not a Kleingarten compliance assistant.

---

## Table Stakes (Must Have)

Features users expect in any garden planning app. Missing = app feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Visual bed layout / 2D plan editor** | Every major competitor has drag-and-drop layout tool | Medium | GrowVeg, Fryd, Smart Gardener all offer this |
| **Plant database (50–200+ varieties)** | Users need per-plant info without leaving app | Low-Medium | Fryd: 4,000+; GrowVeg: 21,400; MVP can start with 100-150 Kleingarten-relevant varieties |
| **Planting calendar with regional dates** | Location-aware sow/plant/harvest windows are baseline | Medium | Fryd uses 26 DE climate zones; GrowVeg uses frost dates; PLZ-based is at or above baseline |
| **Companion planting guidance** | Every competitor shows "good/bad neighbors" | Low | Can ship as simple warning rather than full matrix for MVP |
| **Crop rotation tracking / warnings** | GrowVeg tracks 5 years; Fryd offers as premium | Medium | MVP: one-season warning on same-family replanting is sufficient |
| **Task / to-do list from plan** | Users expect reminder-style task lists | Low-Medium | Fryd generates automatically; GrowVeg sends email reminders |
| **Mobile + desktop access** | Plans are made on desktop, checked on phone | Low | Expo handles this; users expect cross-device |
| **Seed/inventory list export** | GrowVeg auto-generates "plant list" from plan | Low | At minimum, printable/exportable seed need list from plan |
| **Offline access to existing plan** | Users are in the garden without reliable WiFi | Medium | Most apps are online-only — this is actually a differentiator if done well |
| **Photo documentation / journal** | Gardenize built its brand on this | Low | Basic: attach photo to bed/plant. Advanced: time-lapse comparison |

**Confidence:** HIGH — these features appear across all reviewed competitors.

---

## Differentiators (Kleingarten-App Unique)

Features that no competitor has. These are the competitive moat.

| Feature | Value Proposition | Complexity | Competitor Status |
|---------|-------------------|------------|------------------|
| **Photo → 2D plan (Claude Vision)** | Fastest onboarding: existing garden captured in minutes instead of hours of manual drawing | Very High | No competitor does structural extraction — Ogrovision does aesthetic rendering only. Seed to Spoon scans seed packets (not garden layout). This is genuinely novel. |
| **BKleingG 1/3 Nutzgartenpflicht tracker** | Real-time % display: "You are at 31% Nutzgarten — 2m² below minimum." Prevents lease risk. | Medium | Zero competitors address this. Every Kleingartenpächter needs this. |
| **Vereinssatzung extraction from PDF** | Upload your Vereinssatzung PDF → Claude extracts rules → app enforces them inline in editor | High | No competitor exists. Association bylaws vary by club; no centralized DB. |
| **Inline editor warnings for Satzungs-violations** | "Hecke exceeds 1.2m maximum per your Vereinssatzung" shown during editing | Medium | Dependent on Vereinssatzung extraction feature above |
| **Saatgut-Inventar from seed packet photo** | Photograph seed packet → Claude extracts variety, sowing window, expiry date → added to inventory | High | Seed to Spoon does this (US); no German app does it; Fryd's Saatgut-Manager is manual only |
| **Archetype-driven planning** | "Selbstversorger" vs "Biodiversitäts-Garten" shapes suggestions, not just a preference tag | Medium | Fryd has templates but not structured archetypes linked to regulatory context |
| **PLZ-to-Klimazone (DWD-based, 7 zones)** | More precise than Fryd's 26-zone system for calendar dates relevant to allotment gardening specifically | Low | Fryd uses 26 zones; 7-zone approach is simpler but fits the project's scope. Differentiation is in *integration with plan*, not zone count. |
| **Offline-first with sync queue** | Plan readable and editable without internet; AI calls queued | High | Most apps are online-only. GrowVeg requires subscription server access. Fryd requires connectivity. This is a real gap. |
| **"Lokal nutzen" without account** | Zero-friction start; no email required to see first plan | Low | Most competitors require account creation before value delivery |

**Confidence:** HIGH for regulatory features (confirmed gap via research); MEDIUM for photo-to-plan quality (AI vision for structural extraction is emerging, not proven at consumer quality).

### Differentiator Depth Notes

**Photo → 2D Plan:**
Existing AI garden tools (Ogrovision, DreamzAR, Ideal House) produce *aesthetic visualizations* — photorealistic renderings of redesigned gardens. They do not produce measurement-accurate 2D structural plans with labeled elements and coordinates. Claude Vision extracting structured JSON (elements + approximate coordinates from multiple photos + user-provided dimensions) is a genuinely new approach. Known limitation: building/structure recognition in academic ML treats shapes as rectangles; accuracy of element classification will be imperfect for first release. Manual confirmation step is essential.

**Seed Packet Scanning:**
Seed to Spoon (US) does this well and is the closest analog. However: no German app does it, Fryd's Saatgut-Manager requires manual entry, and German seed packets have German-language fields that English-trained US apps may handle poorly. Using Claude Vision server-side for German packet parsing is a genuine gap-fill.

---

## German-Specific Features

Features unique to the German Kleingarten context that no international app addresses.

| Feature | Regulatory Basis | Implementation Notes | Complexity |
|---------|-----------------|---------------------|------------|
| **1/3 Nutzflächen-Ratio tracker** | BKleingG §1 + §3: min. 1/3 of total area must be "kleingärtnerische Nutzung" (vegetables, fruit, herbs) | Calculate ratio from plan: Nutzpflanzen area / total parcel area. Display as % with minimum threshold. Warn below 33%. | Medium |
| **Nutzpflanzen classification** | Not all plants count: ornamentals, lawn, paths, shed do NOT count. Vegetables, fruit trees (by canopy), berry bushes (1m² each), herbs DO count. | Needs per-element classification in data model: `zähltAlsNutzfläche: boolean` | Low-Medium |
| **Laube size constraint (24m²)** | BKleingG §3(2): max 24m² including covered patio/Veranda | Garden shed element in plan editor should show warning if area exceeds 24m² | Low |
| **Vereinssatzung rule extraction** | Vereinssatzungen vary by club: typical rules include Heckenmaß (e.g., max 1.2m), Laubengröße, Baumverbote (no large trees), Ruhezeiten | PDF upload → Claude extracts structured rules → user confirms → app enforces inline | High |
| **Satzungs-Checkliste fallback** | Many users won't have PDF or rules in digital form | Preset checklist of ~15 typical German allotment rules with free-text overrides | Low |
| **7 DWD Klimazonen via PLZ-Lookup** | DWD publishes climate zone data by postcode; 7 zones used in practice for gardening | Static lookup table PLZ → Klimazone → offset planting dates | Low |
| **Archetyp "Selbstversorger" with 1/3 check** | BKleingG requires kleingärtnerische Nutzung; Selbstversorger archetype auto-allocates to comply | Archetype selection influences default element palette and compliance calculator | Medium |
| **German plant names + sortentypisch varieties** | German gardeners search by German names; Kleingarten-relevant varieties differ from UK/US apps | Plant DB should be bilingual, with German common names primary | Low |
| **Fruchtfolge categories (German groupings)** | German horticultural groupings: Starkzehrer, Mittelzehrer, Schwachzehrer, Gründüngung | Data model must encode these categories for crop rotation warnings | Low |
| **Mischkultur-Datenbank (German tradition)** | Mixed planting (Mischkultur) is deeply culturally embedded in German allotment gardening | More important to include than in UK/US apps | Medium |

**Confidence:** HIGH for regulatory features (based on BKleingG primary sources and legal commentary); MEDIUM for implementation complexity estimates.

### BKleingG Key Rules Summary (for implementation reference)

- **§1**: Kleingarten = garden for non-commercial use, primarily horticulture
- **§3(1)**: Must be for "kleingärtnerische Nutzung" (food/fruit growing)
- **§3(2)**: Laube max 24m² including covered patio; not suitable for permanent residence
- **§3(1) + case law**: Minimum 1/3 of parcel area must be Nutzgarten — enforced by Verein via inspections
- **§3 gap**: BKleingG does not regulate hedge height, fence height, or plant selection — these are set by individual Vereinssatzungen

---

## Anti-Features (Deliberately Excluded)

Features that would bloat MVP without delivering proportionate value for the target user.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Social / community features** | Multi-user complexity; Fryd already has a community; MVP is single-user (Dirk) | Out of scope per PROJECT.md. Defer to v2+. |
| **Marketplace / Samentausch** | E-commerce complexity; regulated (BtMG, seed law); not core value prop | Refer users to existing platforms (Dreschflegel, Fryd Shop) |
| **Own ML model training** | Months of effort, training data collection, GPU costs; Claude API achieves MVP quality | Use Claude API; revisit at scale |
| **Augmented reality (AR) garden visualization** | Impressive demo feature; poor UX on small screens; high dev effort; not useful for planning | The drawn/schematic SVG plan IS the visualization layer |
| **Weather integration / live weather API** | Fryd already does this; adds API dependency and subscription cost; PLZ-based climate zones are sufficient for planting calendars | Use static DWD climate zone data, not live weather |
| **Barcode scanning (seed packets)** | Physical barcode databases for German seed packets are incomplete; unreliable fallback | Photo + Claude Vision is better; barcodes deferred to v1.1 per PROJECT.md |
| **3D garden visualization** | High render complexity; doesn't add planning value over 2D SVG; competitors who do it (Planner5D) are generic design tools | 2D drawn-style SVG is faster, lighter, and more charming |
| **Multi-user / family sharing** | Auth complexity, RLS, conflict resolution; MVP is single-user; RLS prep is sufficient | Single-user with "lokal nutzen" option; sync to v1.1 |
| **Ernte-Tagebuch / harvest diary** | Valuable but not essential for first season; Gardenize covers this well for users who want it | Defer to v2 per PROJECT.md |
| **Schädlingsdiagnose (pest diagnosis)** | Pl@ntNet/Seek already does plant ID; pest diagnosis needs separate training; not harvest-blocking feature | Defer to v2+ per PROJECT.md |
| **PDF export of plan** | Nice to have; not blocking any core use case for MVP | Defer to v2 per PROJECT.md |
| **AT/CH localization** | Different Kleingartenrecht; different climate zones; doubles regulatory surface area | MVP = Germany only |

---

## Feature Dependencies

```
PLZ input (M5/Profil)
  └─> Klimazone-Lookup
        └─> Planting Calendar date offsets (M4)
        └─> Planting suggestions in editor (M2)

Seed Inventory (M3)
  └─> Planting Calendar (M4) — calendar is only useful with seeds in inventory
  └─> Plan suggestions (M4 → M2) — calendar proposes placements based on inventory + free beds

Photo → JSON (M1/Garten-Erfassung)
  └─> 2D Plan (M2) — plan editor pre-populated from M1 output
  └─> Manual fallback — empty canvas with dimensions if M1 fails

Vereinssatzung rules (M5)
  └─> Editor warnings (M2) — inline violations require rules to be loaded
  └─> BKleingG 1/3 check (M5) — ratio calculator needs element classification from M2

Archetype selection (M5)
  └─> Planting suggestions (M4) — suggestions filtered/weighted by archetype
  └─> 1/3 compliance warning (M5) — Selbstversorger gets stronger compliance prompts
```

---

## MVP Prioritization

### Must ship for Saison 2026

1. **Photo → 2D Plan** (M1) — core USP; without it, Kleingarten-App is just a Fryd clone
2. **2D Plan Editor** (M2) — users need to correct and extend the AI-generated plan
3. **BKleingG 1/3 tracker** — lightweight to build; maximum differentiation; no competitor has it
4. **PLZ → Klimazone → Planting Calendar** (M4) — Dirk needs this for Saison 2026
5. **Seed Inventory with photo scan** (M3) — photo scan is the differentiator; list-mode is table stakes

### Defer without regret

- Fruchtfolge assistant (beyond simple warning): v1.1
- Mischkultur full compatibility matrix: v1.1
- Harvest diary: v2
- Community features: v2+
- Barcode scan: v1.1

---

## Sources

- Fryd App Store (DE): [https://apps.apple.com/de/app/gartenplaner-von-fryd/id1492138640](https://apps.apple.com/de/app/gartenplaner-von-fryd/id1492138640) — HIGH confidence
- Fryd 2025 feature announcement: [https://emmamasonpr.co.uk/2025/03/19/sowing-growing-and-harvesting-your-own-veg-now-easier-than-ever-thanks-to-germanys-1-gardening-app/](https://emmamasonpr.co.uk/2025/03/19/sowing-growing-and-harvesting-your-own-veg-now-easier-than-ever-thanks-to-germanys-1-gardening-app/) — HIGH confidence
- Fryd feature review (DE): [https://techsonar.de/2025/02/20/garten-app-fryd-glueck-im-gruenen/](https://techsonar.de/2025/02/20/garten-app-fryd-glueck-im-gruenen/) — HIGH confidence
- GrowVeg feature overview: [https://foodgardening.mequoda.com/daily/garden-design/vegetable-garden-planner-apps/](https://foodgardening.mequoda.com/daily/garden-design/vegetable-garden-planner-apps/) — HIGH confidence
- BKleingG §3 (Laube + Kleingarten definition): [https://www.buzer.de/3_BKleingG.htm](https://www.buzer.de/3_BKleingG.htm) — HIGH confidence (primary legal source)
- 1/3 Nutzgartenpflicht explanation: [https://www.krautundrueben.de/regeln-im-kleingarten-was-faellt-unter-kleingaertnerischen-anbau-3202](https://www.krautundrueben.de/regeln-im-kleingarten-was-faellt-unter-kleingaertnerischen-anbau-3202) — HIGH confidence
- Beetplaner (DE competitor): [https://garten-planer.app/](https://garten-planer.app/) — MEDIUM confidence
- AI garden visualization tools (Ogrovision): [https://aigarden.design/](https://aigarden.design/) — HIGH confidence
- Seed to Spoon seed packet scanning: [https://www.seedtospoon.net/](https://www.seedtospoon.net/) — MEDIUM confidence
- AI photo-to-plan limitations (academic): [https://arxiv.org/html/2408.14700v1](https://arxiv.org/html/2408.14700v1) — MEDIUM confidence
- Vereinssatzung rules and compliance: [https://kleingarten-bund.de/blog/2023/11/29/bundeskleingartengesetz/](https://kleingarten-bund.de/blog/2023/11/29/bundeskleingartengesetz/) — HIGH confidence

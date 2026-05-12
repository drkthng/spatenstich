# Phase 4: Garten-Erfassung (M1) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 04-garten-erfassung-m1
**Areas discussed:** Foto-Capture-Flow, Maße & Grundriss, Element-Bestätigung, Plan-Rendering-Stil

---

## Foto-Capture-Flow

| Option | Description | Selected |
|--------|-------------|----------|
| 3 Einzel-Screens (Empfohlen) | Pro Winkel ein eigener Screen mit Vorschau-Silhouette, Fortschrittsanzeige 1/3, 2/3, 3/3 | ~ |
| Ein Kamera-Screen + Wizard | Kamera bleibt offen, Overlay wechselt nach jeder Aufnahme | |
| Freie Galerie-Auswahl | Kein geführter Flow, User wählt frei | |

**User's choice:** 3 Einzel-Screens als Haupt-Flow, mit Option auf Galerie-Auswahl oder freie Kamera pro Schritt
**Notes:** User wollte explizit die Flexibilität aller drei Optionen — geführt als Standard, aber nicht einschränkend.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, '+Weiteres Foto' (Empfohlen) | Nach 3 Pflichtfotos Übersichts-Screen + Button für weitere | ✓ |
| Nein, nur 3 Fotos | Exakt 3, dann weiter | |
| Claude entscheidet | Researcher wägt Token-Limits ab | |

**User's choice:** Weitere Fotos nach den 3 Pflicht-Aufnahmen erlaubt
**Notes:** Keine Einschränkung der Foto-Anzahl nach den Pflichtaufnahmen.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Text + Beispielbild | Anleitungstext + Referenzfoto pro Schritt | ✓ |
| Nur Text | Text + Silhouetten-Overlay, kein separates Beispiel | |
| Claude entscheidet | UX-Pattern-Entscheidung | |

**User's choice:** Text + Beispielbild als Referenz pro Schritt
**Notes:** —

---

## Maße & Grundriss

| Option | Description | Selected |
|--------|-------------|----------|
| Form-Auswahl + Maßfelder (Empfohlen) | 4 Form-Silhouetten + passende Maßfelder | ~ |
| Interaktives Eckpunkt-Tool | Eckpunkte auf Fläche tippen, Maße eingeben | ~ |
| Nur Rechteck + Maße | Nur L×B, andere Formen deferred | |

**User's choice:** Form-Auswahl mit Maßfeldern als Standard, plus Freihand-Eckpunkt-Tool als zusätzliche Option
**Notes:** User wollte Option 1 + Option 2 kombiniert — Standardformen als schnellen Weg, Freihand für Sonderfälle.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nach den Fotos (Empfohlen) | Fotos als Gedächtnisstütze, Claude bekommt beides zusammen | ✓ |
| Vor den Fotos | Maße zuerst, Claude kann beim Analysieren berücksichtigen | |
| Claude entscheidet | Researcher-Entscheidung | |

**User's choice:** Maße nach den Fotos
**Notes:** —

---

| Option | Description | Selected |
|--------|-------------|----------|
| Eckpunkte auf Raster tippen | Metergitter, Eckpunkte setzen, Maße auto-berechnet | |
| Eckpunkte + manuelle Maße | Grobe Eckpunkte + exakte Maße per Textfeld pro Seite | |
| Claude entscheidet | Researcher/Planner wählt Touch-UX | ✓ |

**User's choice:** Claude's Discretion
**Notes:** —

---

## Element-Bestätigung

| Option | Description | Selected |
|--------|-------------|----------|
| Liste mit Toggles (Empfohlen) | Scrollbarer Screen, Icon + Name + Konfidenz + Toggle pro Element | ✓ |
| Karten einzeln durchblättern | Pro Element eine Detailkarte mit Foto-Ausschnitt | |
| Split-View: Plan + Liste | Plan links/oben + Toggle-Liste rechts/unten | |

**User's choice:** Liste mit Toggles
**Notes:** Passt zum Vereinsregeln-Confirm-Pattern aus Phase 02-04.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Text-Badge (sicher/unsicher) | Grün/orange Badge, unsichere Elemente standardmäßig deaktiviert | |
| Prozent-Anzeige | Prozentwert + Schwelle für auto-accept | |
| Claude entscheidet | Basierend auf tatsächlichem API-Output | ✓ |

**User's choice:** Claude's Discretion
**Notes:** User fragte nach Erklärung was "Konfidenz" bedeutet — nach Klarstellung an Claude delegiert.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Leere Vorlage + Hinweis (Empfohlen) | Leerer Plan mit Gartenmaßen + freundlicher Hinweis | ✓ |
| Retry + leere Vorlage | Hinweis + "Andere Fotos hochladen" Option | |
| Claude entscheidet | Researcher-Entscheidung | |

**User's choice:** Leere Plan-Vorlage mit Gartenmaßen + freundlicher Hinweis
**Notes:** —

---

## Plan-Rendering-Stil

| Option | Description | Selected |
|--------|-------------|----------|
| Skizzenhaft-warm (Empfohlen) | Hand-drawn Look, warme Erdfarben, Papier-Hintergrund | ✓ |
| Geometrisch-clean | Saubere Linien, flache Farben, moderner Architektur-Look | |
| Illustrativ-bunt | Cartoon-Stil, lebendige Farben, verspielte Icons | |

**User's choice:** Skizzenhaft-warm
**Notes:** Passt zu "gezeichnet, warm, nicht-klinisch" aus PROJECT.md.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Einfache Symbole + Label | Simples Symbol pro Element-Typ + kurzes Text-Label | |
| Detaillierte Icons | Aufwendigere Illustrationen pro Typ | |
| Claude entscheidet | Balance Einfachheit/Schönheit | ✓ |

**User's choice:** Claude's Discretion
**Notes:** —

---

| Option | Description | Selected |
|--------|-------------|----------|
| Statisch + Übergang zum Editor (Empfohlen) | Nur statische Vorschau, Interaktivität in Phase 5 | |
| Tap für Element-Details | Tippen zeigt Element-Name/Typ | |
| Claude entscheidet | Scope-Risiko vs. UX-Mehrwert | ✓ |

**User's choice:** Claude's Discretion
**Notes:** —

---

## Claude's Discretion

- Freihand-Eckpunkt-Tool Touch-UX
- Konfidenz-Darstellung
- Element-Symbole und Detailgrad
- Plan-Interaktivität in Phase 4 (statisch vs. Tap-Details)

## Deferred Ideas

None — discussion stayed within phase scope.

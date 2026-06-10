# Backlog — Parking Lot

Feature-Gaps und Ideen, die nicht in den aktuellen Milestone-Scope fallen.

---

## 999.1 — Web-Editor: Properties Panel (Größe + Name editieren)

**Beschreibung:** Im Web-Editor (WebPlanEditor) können Elemente platziert, verschoben und gelöscht werden, aber es fehlt ein Properties-Panel zum Bearbeiten von:
- Element-Name/Label
- Breite/Höhe (widthM/heightM)
- Rotation (future)

**Entdeckt:** Phase 9 UAT (2026-05-17)
**Priorität:** Mittel — aktuell workaround über Import oder Palette-Dropdown
**Betrifft:** `app/src/components/editor/web/WebPlanEditor.tsx`, neues `WebPropertiesPanel.tsx`

**Status:** ✅ Erledigt (Phase 09.1 ElementEditorModal, 2026-05-29) — ElementEditorModal (Doppelklick Web / LongPress Mobile) liefert Name/Breite/Höhe/Rotation/Notiz/Pflanzdatum/Akzentfarbe. Implementiert in 09.1-02-modal-trigger-PLAN.md.

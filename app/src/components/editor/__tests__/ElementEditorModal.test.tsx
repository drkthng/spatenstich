// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 2 GREEN fills.
// Plan 02 GREEN-fill: ElementEditorModal render + Save/Cancel/Delete + ZOrderButtons.
// Pins D-09/D-16/D-17 modal pattern + T-09.1-MODAL-ESC.

describe('ElementEditorModal', () => {
  it.todo('renders modal with testID element-editor-modal when visible=true');
  it.todo('renders title from i18n key editor.elementEditor.title');
  it.todo('renders kern-felder: name, widthCm, heightCm, rotationDeg inputs');
  it.todo('renders ZOrderButtons component');
  it.todo('renders 3-button footer: destructive Löschen / ghost Abbrechen / default Speichern (D-17)');
  it.todo('Speichern button calls updateElement with computed patch and clears editingElementId');
  it.todo('Abbrechen button clears editingElementId without calling updateElement (D-18 verwerfen)');
  it.todo('Löschen button calls deleteElement and clears editingElementId');
  it.todo('More-Fields section default-collapsed (D-11)');
  it.todo('More-Fields counter shows (3) when note + plantedAt + accentColor all set');
});

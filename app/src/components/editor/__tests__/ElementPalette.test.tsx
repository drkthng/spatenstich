// Phase 7 Plan 01 Wave 0: element-palette test scaffold (EDIT-02).
// Per UI-SPEC Toolbar / Palette: 3 tabs — Beete / Pflanzen / Infrastruktur.

describe('ElementPalette (EDIT-02)', () => {
  it.todo('renders 3 tabs with testIDs palette-tab-beete / palette-tab-pflanzen / palette-tab-infrastruktur');
  it.todo('Beete tab renders one PaletteCard with kind="Beet"');
  it.todo('Infrastruktur tab renders Weg/Laube/Zaun/Wasserstelle/Kompost/Baum/Sitzplatz/Sonstiges cards (8 kinds per UI-SPEC)');
  it.todo('Pflanzen tab shows empty-plants hint when no Beete exist yet (i18n key editor.palette.emptyPlants)');
  it.todo('active tab carries the accent green underline (testID-checkable className contains border-[#4A7C59])');
  it.todo('PaletteCard long-press flips the shared dragging value with the correct kind');
});

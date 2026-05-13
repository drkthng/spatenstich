// Phase 7 Plan 01 Wave 0: drafts-tray test scaffold (DRAFT-01, DRAFT-02, DRAFT-03).
// Mocks importRepo.loadPendingDraftsWithImportedAt + draftPromotionRepo.promoteBedDraft.

describe('DraftsTrayBottomSheet > render (DRAFT-01)', () => {
  it.todo('hidden when zero pending drafts (drafts.length === 0)');
  it.todo('collapsed chip shows "Letzte Importe (N)" with count, testID=tray-chip');
  it.todo('expanded panel renders DraftReviewCard for each bed/plant/observation in scroll list');
  it.todo('expanded panel shows three filter chips: Alle / Aktuell / Stale (testID tray-filter-{value})');
});

describe('DraftsTrayBottomSheet > bed-draft drop (DRAFT-02)', () => {
  it.todo('long-press on bed-draft card flips shared dragging.value with { kind:"bed-draft", draftId, importItemId }');
  it.todo('on screen-root pan onEnd, handleBedDraftDrop is called with (draftId, importItemId, xM, yM)');
  it.todo('handleBedDraftDrop calls promoteBedDraft with mode, draft, dims, elements, importItemId, { xM, yM } — finalCoords param (6th arg) carries the drop position');
});

describe('DraftsTrayBottomSheet > plant-draft tap (DRAFT-02 plant path)', () => {
  it.todo('Auf Beet anwenden button opens BedPickerModal with all current Beet elements');
  it.todo('selecting a bed in modal calls promotePlantDraft with the chosen parentBedElement');
});

describe('DraftsTrayBottomSheet > stale badge (DRAFT-03)', () => {
  it.todo('Date.now mocked 31 days after importedAt -> TrafficLightBadge state=amber label=Stale appears in card details slot');
  it.todo('Date.now mocked 29 days after importedAt -> no stale badge');
  it.todo('filter Stale chip excludes fresh drafts (only stale cards visible)');
  it.todo('filter Aktuell chip excludes stale drafts (only fresh cards visible)');
  it.todo('filter Alle shows everything');
});

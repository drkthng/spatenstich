// Phase 7 Plan 01 Wave 0: smoke-mount test for the plan editor screen (EDIT-01).
// Mocks Skia/gesture-handler/reanimated globally via setup.ts. No real native modules.

describe('PlanEditor smoke (EDIT-01)', () => {
  it.todo('renders the editor Canvas, Toolbar, and Palette without throwing in jsdom');
  it.todo('grid is visible by default (showGrid=true) and uses #D6CFC4 at 40% opacity per UI-SPEC');
  it.todo('toggling grid via toolbar button hides the grid Skia group');
  it.todo('shows empty-plan empty-state heading when elements array is empty (i18n key editor.emptyPlan.heading)');
});

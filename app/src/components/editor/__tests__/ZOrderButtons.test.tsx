// Phase 09.1 Wave 0 RED: it.todo() pins; Wave 2 GREEN fills.
// Plan 02 GREEN-fill: ZOrderButtons 4-button cluster render + press dispatch.
// Pins D-12 (Photoshop-style buttons) + Pitfall-5 (provenance spread preserves plantSlug).

describe('ZOrderButtons', () => {
  it.todo('renders 4 buttons with testIDs zorder-front, zorder-forward, zorder-backward, zorder-back');
  it.todo('zorder-front button press calls bringToFront via updateElement provenance patch');
  it.todo('zorder-back button press calls sendToBack via updateElement provenance patch');
  it.todo('Pitfall-5 mitigation: provenance patch spreads previous provenance (preserves plantSlug)');
});

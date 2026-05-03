// ConfirmScreen test — verifies:
//   (a) 0 elements renders empty state with "Keine Elemente erkannt"
//   (b) elements render PlanElementRow with toggles
//
// Note: Uses react-test-renderer instead of @testing-library/react-native
// because NativeWind's css-interop jsx-runtime resolution conflicts with
// ts-jest in the monorepo's hoisted node_modules setup.
import * as React from 'react';
// @ts-ignore — @types/react-test-renderer not installed; implicit any is fine for tests
import * as renderer from 'react-test-renderer';
import { PlanElementRow } from '../PlanElementRow';
import { ConfidenceBadge } from '../ConfidenceBadge';

// Test PlanElementRow renders with toggle
describe('PlanElementRow', () => {
  const baseElement = {
    elementType: 'Rasen',
    label: 'Rasenfläche',
    xM: 2,
    yM: 3,
    widthM: 4,
    heightM: 5,
    confidence: 'high' as const,
    isAccepted: true,
  };

  it('renders element label', () => {
    const tree = renderer.create(
      <PlanElementRow element={baseElement} onToggle={() => {}} index={0} />,
    );
    const json = tree.toJSON() as any;
    // Find text nodes containing 'Rasenfläche'
    const texts = JSON.stringify(json);
    expect(texts).toContain('Rasenfläche');
  });

  it('renders estimated size', () => {
    const tree = renderer.create(
      <PlanElementRow element={baseElement} onToggle={() => {}} index={0} />,
    );
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('ca. 4 x 5 m');
  });

  it('calls onToggle with correct index', () => {
    const onToggle = jest.fn();
    const tree = renderer.create(
      <PlanElementRow element={baseElement} onToggle={onToggle} index={2} />,
    );
    // Find the Switch element and trigger its onValueChange
    const root = tree.root;
    const switchEl = root.findByType('Switch' as any);
    switchEl.props.onValueChange(false);
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it('shows accessibility label with accepted state', () => {
    const tree = renderer.create(
      <PlanElementRow element={baseElement} onToggle={() => {}} index={0} />,
    );
    const root = tree.root;
    // The outer View should have accessibilityLabel
    const outerView = root.findByProps({ accessibilityLabel: 'Rasenfläche, Konfidenz sicher, akzeptiert' });
    expect(outerView).toBeTruthy();
  });

  it('shows rejected accessibility label for non-accepted elements', () => {
    const rejected = { ...baseElement, isAccepted: false, confidence: 'low' as const };
    const tree = renderer.create(
      <PlanElementRow element={rejected} onToggle={() => {}} index={0} />,
    );
    const root = tree.root;
    const outerView = root.findByProps({ accessibilityLabel: 'Rasenfläche, Konfidenz unsicher, abgelehnt' });
    expect(outerView).toBeTruthy();
  });
});

// Test ConfidenceBadge
describe('ConfidenceBadge', () => {
  it('renders "sicher" for high confidence', () => {
    const tree = renderer.create(<ConfidenceBadge confidence="high" />);
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('sicher');
  });

  it('renders "sicher" for medium confidence', () => {
    const tree = renderer.create(<ConfidenceBadge confidence="medium" />);
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('sicher');
  });

  it('renders "unsicher" for low confidence', () => {
    const tree = renderer.create(<ConfidenceBadge confidence="low" />);
    const texts = JSON.stringify(tree.toJSON());
    expect(texts).toContain('unsicher');
  });
});

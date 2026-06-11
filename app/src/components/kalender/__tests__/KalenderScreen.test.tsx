// Phase 10 Plan 09: WR-05 KalenderScreen Tests.
// Verifies that the Filter-Chip "Nur meine Pflanzen" state is correctly passed to useKalenderData,
// and that a user opt-out is not overridden by a useEffect re-enabling the chip.
//
// Tests:
// (a) Chip-Toggle OFF → useKalenderData called with { nurMeinePflanzen: false }
// (b) After opt-out, re-render with larger meinePflanzenslugs → Chip stays OFF (checked === false)
// (c) Regression: Default ON when ≥1 plan plant present on first load (UI-SPEC Filter-Chip-Kontrakt)
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ── Router mock ───────────────────────────────────────────────────────────────
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));

// ── usePlants mock ────────────────────────────────────────────────────────────
jest.mock('@/src/hooks/usePlants', () => ({
  usePlants: jest.fn(),
}));

// ── useKalenderData mock ──────────────────────────────────────────────────────
jest.mock('@/src/hooks/useKalenderData', () => ({
  useKalenderData: jest.fn(),
}));

// ── KalenderWochenCard mock (avoids deep rendering of aktionen) ───────────────
jest.mock('@/src/components/kalender/KalenderWochenCard', () => ({
  KalenderWochenCard: () => null,
}));

// ── PflanzenKalenderZeile mock ────────────────────────────────────────────────
jest.mock('@/src/components/kalender/PflanzenKalenderZeile', () => ({
  PflanzenKalenderZeile: () => null,
}));

// ── Import screen AFTER mocks ─────────────────────────────────────────────────
import { usePlants } from '@/src/hooks/usePlants';
import { useKalenderData } from '@/src/hooks/useKalenderData';
import KalenderScreen from '../../../../app/(app)/kalender/index';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseHookReturn = {
  wochenAktionen: [],
  meinePflanzenslugs: new Set<string>(['tomate']),
  aktuelleKw: 24,
  klimazone: 4 as any,
  elements: [],
  dimensions: null,
  hasBeetImPlan: false,
  loading: false,
  addPlantToPlan: jest.fn(),
  refresh: jest.fn(),
};

const emptyHookReturn = {
  ...baseHookReturn,
  meinePflanzenslugs: new Set<string>(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (usePlants as jest.Mock).mockReturnValue({ data: [] });
  (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn });
});

describe('KalenderScreen — WR-05 Filter-Chip', () => {
  // (a) Chip-Toggle OFF → useKalenderData called with { nurMeinePflanzen: false }
  it('(a) Chip-Toggle OFF → useKalenderData erhält nurMeinePflanzen: false', () => {
    const { getByTestId } = render(<KalenderScreen />);

    // Find the filter chip by testID (added in WR-05 fix)
    const chip = getByTestId('filter-chip-meine-pflanzen');

    // Chip starts ON (meinePflanzenslugs has items)
    expect(chip.props.accessibilityState.checked).toBe(true);

    // Toggle chip OFF
    fireEvent.press(chip);

    // useKalenderData must now be called with nurMeinePflanzen: false
    // The most recent call should have nurMeinePflanzen: false
    const calls = (useKalenderData as jest.Mock).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toMatchObject({ nurMeinePflanzen: false });
  });

  // (b) After opt-out, re-render with larger meinePflanzenslugs → Chip stays OFF
  it('(b) Nach Opt-out bleibt Chip OFF trotz meinePflanzenslugs-Änderung', () => {
    const { getByTestId, rerender } = render(<KalenderScreen />);

    const chip = getByTestId('filter-chip-meine-pflanzen');

    // Toggle chip OFF (user opt-out)
    fireEvent.press(chip);

    // Chip is now OFF
    expect(chip.props.accessibilityState.checked).toBe(false);

    // Simulate: meinePflanzenslugs grows (e.g. user added a plant)
    (useKalenderData as jest.Mock).mockReturnValue({
      ...baseHookReturn,
      meinePflanzenslugs: new Set<string>(['tomate', 'salat', 'karotte']),
    });
    rerender(<KalenderScreen />);

    // Chip MUST still be OFF — useEffect must not re-enable after user opt-out
    expect(chip.props.accessibilityState.checked).toBe(false);
  });

  // (c) Regression: Default ON when ≥1 plan plant present (UI-SPEC Filter-Chip-Kontrakt)
  it('(c) Default-ON: Chip ist ON beim ersten Laden wenn ≥1 Plan-Pflanze vorhanden', () => {
    // meinePflanzenslugs has 1 slug → default ON
    (useKalenderData as jest.Mock).mockReturnValue({ ...baseHookReturn });
    const { getByTestId } = render(<KalenderScreen />);
    const chip = getByTestId('filter-chip-meine-pflanzen');
    expect(chip.props.accessibilityState.checked).toBe(true);
  });

  // (d) Default OFF when no plan plants (meinePflanzenslugs empty)
  it('(d) Default-OFF: Chip ist OFF beim ersten Laden ohne Plan-Pflanzen', () => {
    (useKalenderData as jest.Mock).mockReturnValue({ ...emptyHookReturn });
    const { getByTestId } = render(<KalenderScreen />);
    const chip = getByTestId('filter-chip-meine-pflanzen');
    expect(chip.props.accessibilityState.checked).toBe(false);
  });
});

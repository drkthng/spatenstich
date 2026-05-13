// Phase 7 Plan 04 Wave 3: element-palette tests (EDIT-02).
// Per UI-SPEC Toolbar / Palette: 3 tabs — Beete / Pflanzen / Infrastruktur.

import * as React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ElementPalette } from '../ElementPalette';

function makeShared<T>(initial: T): { value: T } {
  // The editor jest project mocks reanimated's useSharedValue to return { value }.
  // For module-level shared values created outside a component we mimic the shape.
  return { value: initial };
}

describe('ElementPalette (EDIT-02)', () => {
  it('renders 3 tabs with testIDs palette-tab-beete / palette-tab-pflanzen / palette-tab-infrastruktur', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const { getByTestId } = render(
      <ElementPalette
        activeTab="beete"
        onTabChange={() => {}}
        draggingShared={shared as any}
      />,
    );
    expect(getByTestId('palette-tab-beete')).toBeTruthy();
    expect(getByTestId('palette-tab-pflanzen')).toBeTruthy();
    expect(getByTestId('palette-tab-infrastruktur')).toBeTruthy();
  });

  it('Beete tab renders one PaletteCard with kind="Beet"', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const { getByTestId } = render(
      <ElementPalette
        activeTab="beete"
        onTabChange={() => {}}
        draggingShared={shared as any}
      />,
    );
    expect(getByTestId('palette-Beet')).toBeTruthy();
  });

  it('Infrastruktur tab renders Weg/Laube/Zaun/Wasserstelle/Kompost/Baum/Sitzplatz/Sonstiges cards (8 kinds per UI-SPEC)', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const { getByTestId } = render(
      <ElementPalette
        activeTab="infrastruktur"
        onTabChange={() => {}}
        draggingShared={shared as any}
      />,
    );
    const kinds = [
      'Weg',
      'Laube',
      'Zaun',
      'Wasserstelle',
      'Kompost',
      'Baum',
      'Sitzplatz',
      'Sonstiges',
    ];
    for (const k of kinds) {
      expect(getByTestId(`palette-${k}`)).toBeTruthy();
    }
  });

  it('Pflanzen tab shows empty-plants hint when no Beete exist yet (hasAnyBed=false)', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const { getByTestId, queryByTestId } = render(
      <ElementPalette
        activeTab="pflanzen"
        onTabChange={() => {}}
        draggingShared={shared as any}
        hasAnyBed={false}
      />,
    );
    expect(getByTestId('palette-empty-plants')).toBeTruthy();
    // Pflanze card is NOT rendered when no bed exists yet
    expect(queryByTestId('palette-Pflanze')).toBeNull();
  });

  it('Pflanzen tab shows Pflanze card when at least one bed exists (hasAnyBed=true)', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const { getByTestId, queryByTestId } = render(
      <ElementPalette
        activeTab="pflanzen"
        onTabChange={() => {}}
        draggingShared={shared as any}
        hasAnyBed
      />,
    );
    expect(getByTestId('palette-Pflanze')).toBeTruthy();
    expect(queryByTestId('palette-empty-plants')).toBeNull();
  });

  it('tab onPress fires onTabChange with the target tab id', () => {
    const shared = makeShared<{ kind: string; ghostX: number; ghostY: number } | null>(
      null,
    );
    const onTabChange = jest.fn();
    const { getByTestId } = render(
      <ElementPalette
        activeTab="beete"
        onTabChange={onTabChange}
        draggingShared={shared as any}
      />,
    );
    fireEvent.press(getByTestId('palette-tab-infrastruktur'));
    expect(onTabChange).toHaveBeenCalledWith('infrastruktur');
  });
});

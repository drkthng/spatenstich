// Phase 6.5 Plan 04: ImportReview screen — Crit-2 sectioned render + actions.
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).

import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  Stack: { Screen: () => null },
}));

const fixtureBed = {
  id: 'bd-1',
  gardenId: 'g-1',
  importItemId: 'item-b1',
  label: 'Hochbeet 1',
  lengthCm: 200,
  widthCm: 100,
  sunExposure: 'sun',
  soilNotes: null,
  confidence: 0.9,
  status: 'pending',
  promotedAt: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};
const fixturePlant = {
  id: 'pd-1',
  gardenId: 'g-1',
  importItemId: 'item-p1',
  bedDraftId: null,
  commonNameDe: 'Tomate',
  scientificName: null,
  stageEstimate: null,
  healthNotes: null,
  confidence: 0.85,
  status: 'pending',
  promotedAt: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};
const fixtureObs = {
  id: 'od-1',
  gardenId: 'g-1',
  importItemId: 'item-o1',
  bedRefLocalId: null,
  kind: 'pest',
  summary: 'Schnecken im Hochbeet',
  suggestedActions: null,
  confidence: 0.7,
  status: 'pending',
  promotedAt: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};

const mockPromoteBed = jest.fn().mockResolvedValue({});
const mockPromotePlant = jest.fn().mockResolvedValue({});
const mockPromoteObs = jest.fn().mockResolvedValue(undefined);
const mockDismiss = jest.fn().mockResolvedValue(undefined);

jest.mock('@/src/lib/importRepo', () => ({
  loadPendingDrafts: jest.fn().mockResolvedValue({
    beds: [fixtureBed],
    plants: [fixturePlant],
    observations: [fixtureObs],
  }),
}));
jest.mock('@/src/lib/gardenPlanRepo', () => ({
  loadDimensions: jest.fn().mockResolvedValue({
    id: 'dim-1',
    gardenId: 'g-1',
    widthM: 10,
    heightM: 8,
    shape: 'rectangle',
    extraDims: null,
    createdAt: '2026-05-12T00:00:00.000Z',
    updatedAt: '2026-05-12T00:00:00.000Z',
    updatedByUserId: 'user-001',
    deletedAt: null,
  }),
  loadAcceptedElements: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/src/lib/draftPromotionRepo', () => ({
  promoteBedDraft: (...a: unknown[]) => mockPromoteBed(...a),
  promotePlantDraft: (...a: unknown[]) => mockPromotePlant(...a),
  promoteObservationDraft: (...a: unknown[]) => mockPromoteObs(...a),
  dismissDraft: (...a: unknown[]) => mockDismiss(...a),
}));
jest.mock('@/src/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ mode: 'account', activeGardenId: 'g-1' }),
}));
jest.mock('@/src/stores/reviewSettingsStore', () => ({
  useReviewSettingsStore: (sel: any) =>
    sel({
      autoPromote: false,
      autoPromoteThreshold: 0.8,
      setAutoPromote: jest.fn(),
    }),
}));

import ImportReviewScreen from '../../../app/(app)/import/review';

describe('ImportReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders three sections (Beete, Pflanzen, Beobachtungen) with counts', async () => {
    const { findByText } = render(<ImportReviewScreen />);
    await findByText(/Beete \(1\)/);
    await findByText(/Pflanzen \(1\)/);
    await findByText(/Beobachtungen \(1\)/);
  });

  it('clicking Annehmen on a bed-card calls promoteBedDraft', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const acceptBtn = await findByTestId('accept-bd-1');
    fireEvent.press(acceptBtn);
    await waitFor(() => expect(mockPromoteBed).toHaveBeenCalled());
    const args = mockPromoteBed.mock.calls[0];
    expect(args[1]).toEqual(expect.objectContaining({ id: 'bd-1' }));
    expect(args[4]).toBe('item-b1');
  });

  it('clicking Verwerfen on a plant-card calls dismissDraft with plant_drafts', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const dismissBtn = await findByTestId('dismiss-pd-1');
    fireEvent.press(dismissBtn);
    await waitFor(() => expect(mockDismiss).toHaveBeenCalled());
    const args = mockDismiss.mock.calls[0];
    expect(args[1]).toBe('plant_drafts');
  });

  it('clicking Fertig navigates to /(app) via router.replace', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const doneBtn = await findByTestId('review-done-button');
    fireEvent.press(doneBtn);
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
  });

  it('shows empty-state when all draft arrays are empty', async () => {
    const importRepo = require('@/src/lib/importRepo');
    importRepo.loadPendingDrafts.mockResolvedValueOnce({
      beds: [],
      plants: [],
      observations: [],
    });
    const { findByTestId } = render(<ImportReviewScreen />);
    await findByTestId('empty-state');
  });

  it('clicking Verwerfen on a bed-card calls dismissDraft with bed_drafts entity', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const dismissBtn = await findByTestId('dismiss-bd-1');
    fireEvent.press(dismissBtn);
    await waitFor(() => expect(mockDismiss).toHaveBeenCalled());
    expect(mockDismiss.mock.calls[0][1]).toBe('bed_drafts');
  });

  it('clicking Annehmen on an observation-card calls promoteObservationDraft', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const acceptBtn = await findByTestId('accept-od-1');
    fireEvent.press(acceptBtn);
    await waitFor(() => expect(mockPromoteObs).toHaveBeenCalled());
    expect(mockPromoteObs.mock.calls[0][1]).toEqual(expect.objectContaining({ id: 'od-1' }));
  });
});

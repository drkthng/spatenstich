// Phase 6.5 Plan 04: Auto-Promote behavior tests.
// Framework: jest components project (jsdom env). Setup: ./setup.ts (NativeWind mock).
//
// Covers:
//   Crit-5 (Auto-Promote >= 0.8 batch promote: triggers per-draft promoteBedDraft,
//   skips low-confidence, promotes plant >= 0.8).

import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
  Stack: { Screen: () => null },
}));

const highBed = {
  id: 'bd-high',
  gardenId: 'g-1',
  importItemId: 'item-bh',
  label: 'Hochbeet hoch',
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
const lowBed = {
  id: 'bd-low',
  gardenId: 'g-1',
  importItemId: 'item-bl',
  label: 'Hochbeet niedrig',
  lengthCm: 200,
  widthCm: 100,
  sunExposure: 'sun',
  soilNotes: null,
  confidence: 0.7,
  status: 'pending',
  promotedAt: null,
  createdAt: '2026-05-12T00:00:00.000Z',
  updatedAt: '2026-05-12T00:00:00.000Z',
  updatedByUserId: 'user-001',
  deletedAt: null,
};
const midPlant = {
  id: 'pd-mid',
  gardenId: 'g-1',
  importItemId: 'item-pm',
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

const mockPromoteBed = jest.fn().mockResolvedValue({});
const mockPromotePlant = jest.fn().mockResolvedValue({});
const mockPromoteObs = jest.fn().mockResolvedValue(undefined);
const mockDismiss = jest.fn().mockResolvedValue(undefined);
const mockSetAutoPromote = jest.fn();

jest.mock('@/src/lib/importRepo', () => ({
  loadPendingDrafts: jest.fn().mockResolvedValue({
    beds: [highBed, lowBed],
    plants: [midPlant],
    observations: [],
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
      setAutoPromote: mockSetAutoPromote,
    }),
}));

import ImportReviewScreen from '../../../app/(app)/import/review';

describe('ImportReview auto-promote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggling Auto-Promote on calls promoteBedDraft for every pending bed-draft with confidence >= 0.8', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const toggle = await findByTestId('auto-promote-toggle');
    fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(mockPromoteBed).toHaveBeenCalled());
    const calledIds = mockPromoteBed.mock.calls.map((c) => c[1]?.id);
    expect(calledIds).toContain('bd-high');
  });

  it('does NOT promote drafts with confidence < 0.8', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const toggle = await findByTestId('auto-promote-toggle');
    fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(mockPromoteBed).toHaveBeenCalled());
    const calledIds = mockPromoteBed.mock.calls.map((c) => c[1]?.id);
    expect(calledIds).not.toContain('bd-low');
  });

  it('promotes plant draft with confidence >= 0.8', async () => {
    const { findByTestId } = render(<ImportReviewScreen />);
    const toggle = await findByTestId('auto-promote-toggle');
    fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(mockPromotePlant).toHaveBeenCalled());
    const args = mockPromotePlant.mock.calls[0];
    expect(args[1]).toEqual(expect.objectContaining({ id: 'pd-mid' }));
  });
});

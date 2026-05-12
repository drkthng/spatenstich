// Zustand store for capture session state — holds resized photo URIs across screens.
// Reset after completing the capture flow or navigating away.
import { create } from 'zustand';

export interface CaptureState {
  photos: string[]; // resized local URIs
  addPhoto: (uri: string) => void;
  removePhoto: (index: number) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  photos: [],
  addPhoto: (uri) => set((s) => ({ photos: [...s.photos, uri] })),
  removePhoto: (index) =>
    set((s) => ({ photos: s.photos.filter((_, i) => i !== index) })),
  reset: () => set({ photos: [] }),
}));

// app/src/__mocks__/supabase-functions.ts
// Reusable jest mock helper for supabase.functions.invoke() — shared across
// tests that need to stub Edge Function calls without booting the real client.
//
// Usage:
//   jest.mock('../supabase', () => require('../../__mocks__/supabase-functions'));
//   import { mockInvoke } from '../../__mocks__/supabase-functions';
//   mockInvoke.mockResolvedValueOnce({ data: { rules: [...] }, error: null });
//
// Reset between tests with: beforeEach(() => mockInvoke.mockReset());

export const mockInvoke = jest.fn();

export const supabase = {
  functions: {
    invoke: mockInvoke,
  },
};

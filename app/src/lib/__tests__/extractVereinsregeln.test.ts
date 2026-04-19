// app/src/lib/__tests__/extractVereinsregeln.test.ts
// RULES-01 — 7 tests for the client wrapper extractVereinsregeln().
// TDD RED gate: these tests are written before extractVereinsregeln.ts exists.
//
// Covered behaviours (matches Plan 02-03 Task 2-03-03 <behavior>):
//   1) invokes supabase.functions.invoke('extract-vereinsregeln', body) exactly once
//   2) happy path: returns rules on 200 { rules: [...] }
//   3) server error: throws ExtractVereinsregelnError code='server'
//   4) network error: throws ExtractVereinsregelnError code='network'
//   5) internal timeout at 55s: throws code='timeout' (fake timers)
//   6) external AbortSignal.abort(): throws code='cancelled'
//   7) empty storagePath: throws code='invalid_input' before invoking

// Env preload — supabase.ts validates these at module-load time.
process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'http://localhost:54321';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

// Mock the supabase client BEFORE importing the module under test.
jest.mock('../supabase', () => require('../../__mocks__/supabase-functions'));

import { mockInvoke } from '../../__mocks__/supabase-functions';
import {
  extractVereinsregeln,
  ExtractVereinsregelnError,
} from '../extractVereinsregeln';

const VALID_INPUT = {
  storagePath: 'user-123/satzung.pdf',
  userId: 'user-123',
};

beforeEach(() => {
  mockInvoke.mockReset();
});

describe('extractVereinsregeln — client wrapper', () => {
  it('Test 1 — calls supabase.functions.invoke exactly once with name + body', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { rules: [] }, error: null });

    await extractVereinsregeln(VALID_INPUT);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('extract-vereinsregeln', {
      body: { storagePath: VALID_INPUT.storagePath, userId: VALID_INPUT.userId },
    });
  });

  it('Test 2 — returns the rules array on 200 response', async () => {
    const rules = [
      {
        titel: 'Hecke',
        wert: 120,
        einheit: 'cm',
        source: 'pdf_extraction' as const,
        istBKleingG: false as const,
      },
    ];
    mockInvoke.mockResolvedValueOnce({ data: { rules }, error: null });

    const result = await extractVereinsregeln(VALID_INPUT);

    expect(result).toEqual(rules);
  });

  it('Test 3 — throws ExtractVereinsregelnError code="server" on { error } response', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { error: 'forbidden' },
      error: null,
    });

    await expect(extractVereinsregeln(VALID_INPUT)).rejects.toMatchObject({
      name: 'ExtractVereinsregelnError',
      code: 'server',
      message: 'forbidden',
    });
  });

  it('Test 4 — throws ExtractVereinsregelnError code="network" when invoke rejects', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('network down'));

    const err = await extractVereinsregeln(VALID_INPUT).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ExtractVereinsregelnError);
    if (!(err instanceof ExtractVereinsregelnError)) throw new Error('unreachable');
    expect(err.code).toBe('network');
    expect(err.message).toBe('network down');
  });

  it('Test 5 — internal timeout fires at 55s -> throws code="timeout"', async () => {
    jest.useFakeTimers();
    // invoke returns a promise that never resolves
    mockInvoke.mockImplementationOnce(() => new Promise(() => {}));

    const promise = extractVereinsregeln(VALID_INPUT);
    // Swallow the eventual rejection synchronously so Node doesn't flag unhandled.
    const caught = promise.catch((e: unknown) => e);

    jest.advanceTimersByTime(55_001);

    // Hand control back to the microtask queue so the rejection can propagate.
    await Promise.resolve();
    await Promise.resolve();

    const err = await caught;
    expect(err).toBeInstanceOf(ExtractVereinsregelnError);
    if (!(err instanceof ExtractVereinsregelnError)) throw new Error('unreachable');
    expect(err.code).toBe('timeout');

    jest.useRealTimers();
  });

  it('Test 6 — external AbortSignal -> throws code="cancelled"', async () => {
    const controller = new AbortController();
    mockInvoke.mockImplementationOnce(() => new Promise(() => {}));

    const promise = extractVereinsregeln({ ...VALID_INPUT, signal: controller.signal });
    const caught = promise.catch((e: unknown) => e);

    // Abort immediately while invoke is still pending.
    controller.abort();

    // Let the microtask queue flush the rejection.
    await Promise.resolve();
    await Promise.resolve();

    const err = await caught;
    expect(err).toBeInstanceOf(ExtractVereinsregelnError);
    if (!(err instanceof ExtractVereinsregelnError)) throw new Error('unreachable');
    expect(err.code).toBe('cancelled');
  });

  it('Test 7 — throws code="invalid_input" for empty storagePath BEFORE invoking', async () => {
    await expect(
      extractVereinsregeln({ storagePath: '', userId: 'user-123' }),
    ).rejects.toMatchObject({
      name: 'ExtractVereinsregelnError',
      code: 'invalid_input',
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

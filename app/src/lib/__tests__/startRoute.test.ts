// Phase 37 (NAV3-02, NAV3-03): joining by code at sign-up and the way into the first steps.

import {
  inviteProblem,
  isInviteCode,
  isResetCode,
  needsOnboarding,
  normalizeInviteCode,
  parseMetres,
  resolveGarden,
} from '../nav/startRoute';

describe('invite code typed at sign-up (NAV3-03)', () => {
  it('is cleaned up the way the server expects it', () => {
    expect(normalizeInviteCode(' abc-7x9 ')).toBe('ABC7X9');
    expect(isInviteCode('abc7x9')).toBe(true);
    expect(isInviteCode('abc7')).toBe(false);
    expect(isInviteCode('')).toBe(false);
  });

  it('joins the garden of the code and asks for no garden of its own', async () => {
    const ensureDefault = jest.fn().mockResolvedValue('own-garden');
    const consume = jest.fn().mockResolvedValue('shared-garden');
    expect(await resolveGarden({ pendingCode: 'abc7x9', consume, ensureDefault })).toEqual({
      gardenId: 'shared-garden',
      joined: true,
      codeProblem: null,
    });
    expect(consume).toHaveBeenCalledWith('ABC7X9');
    expect(ensureDefault).not.toHaveBeenCalled();
  });

  it('without a code the person gets their own garden', async () => {
    const consume = jest.fn();
    const ensureDefault = jest.fn().mockResolvedValue('own-garden');
    expect(await resolveGarden({ pendingCode: null, consume, ensureDefault })).toEqual({ gardenId: 'own-garden', joined: false, codeProblem: null });
    expect(await resolveGarden({ pendingCode: 'ab', consume, ensureDefault })).toMatchObject({ gardenId: 'own-garden', joined: false });
    expect(consume).not.toHaveBeenCalled();
  });

  it('a code that does not work still leaves the person with a garden, and says why', async () => {
    const ensureDefault = jest.fn().mockResolvedValue('own-garden');
    const failing = (code: string) => jest.fn().mockRejectedValue({ code });
    expect(await resolveGarden({ pendingCode: 'ABC7X9', consume: failing('P9001'), ensureDefault })).toEqual({ gardenId: 'own-garden', joined: false, codeProblem: 'invalid' });
    expect(await resolveGarden({ pendingCode: 'ABC7X9', consume: failing('23514'), ensureDefault })).toMatchObject({ codeProblem: 'full' });
    expect(await resolveGarden({ pendingCode: 'ABC7X9', consume: failing('XX000'), ensureDefault })).toMatchObject({ codeProblem: 'failed' });
    expect(inviteProblem({ code: 'P0002' })).toBe('invalid');
    expect(inviteProblem(null)).toBe('failed');
  });

  it('without a connection nothing is decided: the code is kept for the next try', async () => {
    const ensureDefault = jest.fn();
    const offline = new Error('offline_required');
    await expect(
      resolveGarden({ pendingCode: 'ABC7X9', consume: jest.fn().mockRejectedValue(offline), ensureDefault, isOffline: (e) => e === offline }),
    ).rejects.toBe(offline);
    expect(ensureDefault).not.toHaveBeenCalled();
  });
});

describe('the way into the first steps (NAV3-02)', () => {
  const base = { mode: 'account', gardenId: 'g', firstPullDone: true, hasDimensions: false, segments: ['(app)'] };

  it('a garden without a size leads to the first steps', () => {
    expect(needsOnboarding(base)).toBe(true);
    expect(needsOnboarding({ ...base, segments: ['(app)', 'mehr'] })).toBe(true);
  });

  it('not before the first sync is through: a joined garden brings its size with it', () => {
    expect(needsOnboarding({ ...base, firstPullDone: false })).toBe(false);
  });

  it('not with a size, not without a garden or an account, not while signing in', () => {
    expect(needsOnboarding({ ...base, hasDimensions: true })).toBe(false);
    expect(needsOnboarding({ ...base, gardenId: null })).toBe(false);
    expect(needsOnboarding({ ...base, mode: 'local' })).toBe(false);
    expect(needsOnboarding({ ...base, segments: ['(auth)', 'login'] })).toBe(false);
  });

  it('not when the person is already in the steps or drawing the plan by hand', () => {
    expect(needsOnboarding({ ...base, segments: ['(app)', 'onboarding', 'plz'] })).toBe(false);
    expect(needsOnboarding({ ...base, segments: ['(app)', 'plan', 'new'] })).toBe(false);
    expect(needsOnboarding({ ...base, segments: ['(app)', 'plan', 'edit'] })).toBe(false);
  });
});

describe('what people type', () => {
  it('a garden size in metres, with comma or point, between 1 and 200', () => {
    expect(parseMetres('12,5')).toBe(12.5);
    expect(parseMetres(' 30 ')).toBe(30);
    expect(parseMetres('7.25')).toBe(7.25);
    expect(parseMetres('0')).toBeNull();
    expect(parseMetres('500')).toBeNull();
    expect(parseMetres('zwölf')).toBeNull();
    expect(parseMetres('')).toBeNull();
  });

  it('a reset code is six digits', () => {
    expect(isResetCode(' 123456 ')).toBe(true);
    expect(isResetCode('12345')).toBe(false);
    expect(isResetCode('12a456')).toBe(false);
  });
});

// Phase 33 (SYNC3-04): the live connection. A change event triggers the ordinary pull
// for its table, debounced; without a live connection everything is pulled once a
// minute while the app is visible.

process.env['EXPO_PUBLIC_SUPABASE_URL'] = 'https://test.example';
process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';

jest.mock('../../supabase', () => ({ supabase: {} }));
jest.mock('../SyncWorker', () => ({ getSyncWorker: jest.fn() }));

import {
  startRealtimeBridge,
  REALTIME_TABLES,
  PULL_DEBOUNCE_MS,
  POLL_INTERVAL_MS,
  SAFETY_PULL_MS,
  TICK_MS,
} from '../RealtimeBridge';
import { syncEvents, type SyncEvent } from '../events';

type Handler = () => void;

function makeClient() {
  const handlers = new Map<string, { filter?: string; fire: Handler }>();
  let statusCallback: ((status: string) => void) | null = null;
  interface FakeChannel {
    on: jest.Mock;
    subscribe: jest.Mock;
  }
  const channel: FakeChannel = {
    on: jest.fn((_kind: string, opts: { table: string; filter?: string }, cb: Handler): FakeChannel => {
      handlers.set(opts.table, { filter: opts.filter, fire: cb });
      return channel;
    }),
    subscribe: jest.fn((cb: (status: string) => void): FakeChannel => {
      statusCallback = cb;
      return channel;
    }),
  };
  const client = {
    channel: jest.fn(() => channel),
    removeChannel: jest.fn().mockResolvedValue('ok'),
  };
  return {
    client,
    channel,
    handlers,
    status: (s: string) => (statusCallback as ((status: string) => void) | null)?.(s),
  };
}

function start(overrides: { visible?: boolean } = {}) {
  const fake = makeClient();
  const pull = jest.fn().mockResolvedValue(undefined);
  const pullAll = jest.fn().mockResolvedValue(undefined);
  const push = jest.fn().mockResolvedValue(undefined);
  let visible = overrides.visible ?? true;
  const stop = startRealtimeBridge('garden-1', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: fake.client as any,
    pull,
    pullAll,
    push,
    isVisible: () => visible,
    now: () => Date.now(),
  });
  return { ...fake, pull, pullAll, push, stop, setVisible: (v: boolean) => (visible = v) };
}

beforeEach(() => {
  jest.useFakeTimers();
  syncEvents._reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('RealtimeBridge', () => {
  it('listens on one channel for every synced table, scoped to the garden', () => {
    const b = start();
    expect(b.client.channel).toHaveBeenCalledWith('garden:garden-1');
    expect([...b.handlers.keys()].sort()).toEqual([...REALTIME_TABLES].sort());
    expect(b.handlers.get('plan_elements')?.filter).toBe('garden_id=eq.garden-1');
    expect(b.handlers.get('gardens')?.filter).toBe('id=eq.garden-1');
    expect(b.handlers.get('profiles')?.filter).toBeUndefined();
    b.stop();
  });

  it('a burst of changes leads to one pull of that table', () => {
    const b = start();
    for (let i = 0; i < 5; i++) b.handlers.get('plan_elements')!.fire();
    expect(b.pull).not.toHaveBeenCalled();
    jest.advanceTimersByTime(PULL_DEBOUNCE_MS);
    expect(b.pull).toHaveBeenCalledTimes(1);
    expect(b.pull).toHaveBeenCalledWith('plan_elements');
    b.stop();
  });

  it('a member change also fetches profiles and invite codes', () => {
    const b = start();
    b.handlers.get('garden_members')!.fire();
    jest.advanceTimersByTime(PULL_DEBOUNCE_MS);
    expect(b.pull.mock.calls.map((c) => c[0]).sort()).toEqual(['garden_members', 'invite_codes', 'profiles']);
    b.stop();
  });

  it('reports the connection and catches up after a reconnect, not on the first connect', () => {
    const events: SyncEvent[] = [];
    syncEvents.on((e) => events.push(e));
    const b = start();
    b.status('SUBSCRIBED');
    expect(events).toContainEqual({ type: 'realtime_status', connected: true });
    expect(b.pullAll).not.toHaveBeenCalled();
    b.status('CHANNEL_ERROR');
    expect(events).toContainEqual({ type: 'realtime_status', connected: false });
    b.status('SUBSCRIBED');
    expect(b.pullAll).toHaveBeenCalledTimes(1);
    b.stop();
  });

  it('without a live connection everything is pulled once a minute', () => {
    const b = start();
    b.status('TIMED_OUT');
    jest.advanceTimersByTime(POLL_INTERVAL_MS - TICK_MS);
    expect(b.pullAll).not.toHaveBeenCalled();
    jest.advanceTimersByTime(TICK_MS);
    expect(b.pullAll).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    expect(b.pullAll).toHaveBeenCalledTimes(2);
    b.stop();
  });

  it('with a live connection a full pull still runs every few minutes', () => {
    const b = start();
    b.status('SUBSCRIBED');
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    expect(b.pullAll).not.toHaveBeenCalled();
    jest.advanceTimersByTime(SAFETY_PULL_MS);
    expect(b.pullAll).toHaveBeenCalledTimes(1);
    b.stop();
  });

  it('does nothing while the app is hidden', () => {
    const b = start({ visible: false });
    b.status('TIMED_OUT');
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
    expect(b.pullAll).not.toHaveBeenCalled();
    expect(b.push).not.toHaveBeenCalled();
    b.stop();
  });

  it('every tick gives waiting outbox entries a chance', () => {
    const b = start();
    jest.advanceTimersByTime(TICK_MS * 3);
    expect(b.push).toHaveBeenCalledTimes(3);
    b.stop();
  });

  it('stop removes the channel and cancels what was scheduled', () => {
    const b = start();
    b.handlers.get('plan_elements')!.fire();
    b.stop();
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 2);
    expect(b.client.removeChannel).toHaveBeenCalledWith(b.channel);
    expect(b.pull).not.toHaveBeenCalled();
    expect(b.pullAll).not.toHaveBeenCalled();
  });
});

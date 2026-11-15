// A small in-memory stand-in for the Supabase API with the server rules of
// Migration 021: server_updated_at stamped on every write, updated_at kept as the
// client's edit time, older edits rejected with P9011, removed members invisible.
// It understands exactly the query shapes the SyncWorker sends.

type DbRow = Record<string, unknown>;
type Result = { data: unknown; error: null } | { data: null; error: { code: string; message: string } };

const GUARDED = new Set([
  'gardens', 'profiles', 'garden_dimensions', 'plan_elements',
  'imports', 'bed_drafts', 'plant_drafts', 'observation_drafts',
  'photo_findings', 'garden_plants', 'garden_tasks', 'task_done', 'task_sorts',
]);

/** Microseconds of a timestamp string ("...Z" or "...123456+00:00"). */
export function toMicros(stamp: string): number {
  const m = stamp.match(/^(.*T\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d:\d\d)$/);
  if (!m) return Date.parse(stamp) * 1000;
  return Date.parse(`${m[1]}${m[3]}`) * 1000 + Number((m[2] ?? '').padEnd(6, '0'));
}

function fromMicros(micros: number): string {
  const ms = Math.floor(micros / 1000);
  const rest = String(micros % 1000).padStart(3, '0');
  return new Date(ms).toISOString().replace('Z', `${rest}+00:00`);
}

export class FakeServer {
  readonly tables = new Map<string, Map<string, DbRow>>();
  /** Server clock in microseconds. Every stamp is one microsecond later than the last. */
  clock = Date.parse('2026-11-14T12:00:00.000Z') * 1000;
  offline = false;
  /** Errors to answer the next writes to a table with, in order. */
  readonly writeErrors = new Map<string, { code: string; message: string }[]>();
  /** Who the auth service says is signed in, per client (null: nobody). */
  readonly sessions = new Map<string, string | null>();
  requests = 0;

  table(name: string): Map<string, DbRow> {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map();
      this.tables.set(name, t);
    }
    return t;
  }

  stamp(): string {
    this.clock += 1;
    return fromMicros(this.clock);
  }

  /** Lets time pass on the server. */
  advance(ms: number): void {
    this.clock += ms * 1000;
  }

  nowIso(): string {
    return new Date(Math.floor(this.clock / 1000)).toISOString();
  }

  isMember(gardenId: unknown, userId: string): boolean {
    for (const row of this.table('garden_members').values()) {
      if (row['garden_id'] === gardenId && row['user_id'] === userId && row['deleted_at'] == null) return true;
    }
    return false;
  }

  addMember(gardenId: string, userId: string, role: 'owner' | 'member' = 'member'): void {
    const now = this.stamp();
    this.table('garden_members').set(`${gardenId}:${userId}`, {
      garden_id: gardenId, user_id: userId, role, joined_at: now, updated_at: now,
      updated_by_user_id: userId, deleted_at: null, server_updated_at: now,
    });
  }

  removeMember(gardenId: string, userId: string): void {
    const row = this.table('garden_members').get(`${gardenId}:${userId}`);
    if (row) Object.assign(row, { deleted_at: this.stamp(), server_updated_at: this.stamp() });
  }

  /** A write as the server sees it; returns an error object or null. */
  write(table: string, incoming: DbRow, conflictColumn: string, userId: string): { code: string; message: string } | null {
    const queued = this.writeErrors.get(table);
    if (queued && queued.length > 0) return queued.shift()!;
    if ('garden_id' in incoming && !this.isMember(incoming['garden_id'], userId)) {
      return { code: '42501', message: 'new row violates row-level security policy' };
    }
    const rows = this.table(table);
    const existing = [...rows.values()].find((r) => r[conflictColumn] === incoming[conflictColumn]);
    const now = this.nowIso();
    const row: DbRow = { ...(existing ?? { created_at: now }), ...incoming };
    if (existing && GUARDED.has(table)) {
      if (row['updated_at'] == null) return { code: 'P9010', message: 'lww_guard_missing_updated_at' };
      if (toMicros(String(row['updated_at'])) < toMicros(String(existing['updated_at']))) {
        return { code: 'P9011', message: 'LWW reject: lww_reject_older_write' };
      }
      if (row['updated_at'] === existing['updated_at']) row['updated_at'] = now;
    }
    if (row['updated_at'] == null || toMicros(String(row['updated_at'])) > this.clock + 5 * 60_000_000) {
      row['updated_at'] = now;
    }
    row['server_updated_at'] = this.stamp();
    if (existing) rows.delete(String(existing['id']));
    rows.set(String(row['id']), row);
    return null;
  }

  client(userId: string): unknown {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const server = this;
    if (!server.sessions.has(userId)) server.sessions.set(userId, userId);
    const offlineError = { code: '', message: 'TypeError: Failed to fetch' };

    const query = (table: string) => {
      const filters: ((row: DbRow) => boolean)[] = [];
      const orders: string[] = [];
      let limit: number | null = null;
      let single = false;
      let gardenFilter: unknown = undefined;

      const run = (): Result => {
        server.requests += 1;
        if (server.offline) return { data: null, error: offlineError };
        let rows = [...server.table(table).values()];
        // Row level security: garden rows are visible to members only.
        if (table === 'gardens') rows = rows.filter((r) => server.isMember(r['id'], userId));
        else if (table === 'profiles') rows = rows.filter(() => true);
        else rows = rows.filter((r) => server.isMember(r['garden_id'], userId));
        if (gardenFilter !== undefined && table !== 'gardens') {
          rows = rows.filter((r) => r['garden_id'] === gardenFilter);
        }
        for (const f of filters) rows = rows.filter(f);
        for (const col of [...orders].reverse()) {
          rows.sort((a, b) => {
            const x = String(a[col]);
            const y = String(b[col]);
            if (col.endsWith('_at')) return toMicros(x) - toMicros(y);
            return x < y ? -1 : x > y ? 1 : 0;
          });
        }
        if (limit !== null) rows = rows.slice(0, limit);
        const copies = rows.map((r) => ({ ...r }));
        return { data: single ? copies[0] ?? null : copies, error: null };
      };

      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          if (col === 'garden_id') gardenFilter = val;
          else filters.push((r) => r[col] === val);
          return builder;
        },
        is: (col: string, val: unknown) => {
          filters.push((r) => (r[col] ?? null) === val);
          return builder;
        },
        gt: (col: string, val: string) => {
          filters.push((r) => toMicros(String(r[col])) > toMicros(val));
          return builder;
        },
        or: (expr: string) => {
          const m = expr.match(
            /^server_updated_at\.gt\."([^"]+)",and\(server_updated_at\.eq\."([^"]+)",id\.gt\."([^"]+)"\)$/,
          );
          if (!m) throw new Error(`fakeServer: unsupported or() filter: ${expr}`);
          const stamp = toMicros(m[1]!);
          const id = m[3]!;
          filters.push((r) => {
            const s = toMicros(String(r['server_updated_at']));
            return s > stamp || (s === stamp && String(r['id']) > id);
          });
          return builder;
        },
        order: (col: string) => {
          orders.push(col);
          return builder;
        },
        limit: (n: number) => {
          limit = n;
          return builder;
        },
        maybeSingle: () => {
          single = true;
          return builder;
        },
        then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve().then(run).then(resolve, reject),
        upsert: (payload: DbRow | DbRow[], opts: { onConflict: string }) => {
          server.requests += 1;
          if (server.offline) return Promise.resolve({ data: null, error: offlineError });
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            const error = server.write(table, row, opts.onConflict, userId);
            if (error) return Promise.resolve({ data: null, error });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      return builder;
    };

    return {
      from: (table: string) => query(table),
      rpc: () => Promise.resolve({ data: null, error: { code: 'PGRST202', message: 'no rpc in fakeServer' } }),
      auth: {
        getUser: () => {
          const signedIn = server.sessions.get(userId) ?? null;
          return Promise.resolve(
            signedIn
              ? { data: { user: { id: signedIn } }, error: null }
              : { data: { user: null }, error: { message: 'Auth session missing' } },
          );
        },
      },
    };
  }
}

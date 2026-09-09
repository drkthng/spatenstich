# Phase 1: Foundation - Research

**Researched:** 2026-04-16
**Domain:** Monorepo-Infrastruktur, Supabase-Schema + pgmq, EAS-CI, StorageAdapter-Abstraction, Sentry
**Confidence:** MEDIUM-HIGH (Kernstack verifiziert, EAS+pnpm-Kompatibilität bekannte Problemzone)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migration 001 scaffolds ONLY foundation tables: `feature_flags`, `ai_jobs`, `ai_results`. Alle anderen Tabellen (garden_plans, seed_inventory usw.) kommen in separaten Migrations der jeweiligen Phase.
- **D-02:** RLS ist auf allen Tabellen ab Migration 001 aktiv. Jede Tabelle bekommt `user_id` FK + `auth.uid()` Policy.
- **D-03:** Supabase auf Supabase Cloud, EU-Region Frankfurt. Kein Self-Hosting.
- **D-04:** packages/shared enthält: (1) TypeScript-Types (Supabase Codegen + Domain-Interfaces), (2) Constants & Config (Klimazonen-Lookup, Archetyp-Definitionen, pgmq-Queue-Namen, Feature-Flag-Keys), (3) Pure Utility Functions (framework-agnostisch), (4) i18n-Strings (de.json).
- **D-05:** Kein geteilter Supabase-DB-Client. app/ und supabase/ (Edge Functions) initialisieren `@supabase/supabase-js` jeweils eigenständig.
- **D-06:** EAS Builds (iOS + Web) laufen nur bei Merge auf main. PRs: nur schnelle Checks (lint, TypeScript, unit tests). Spart EAS Free-Tier Build-Minuten.
- **D-07:** Zwei Environments: `dev` (lokales Supabase via Docker + EAS Preview-Profil) und `prod` (Supabase Cloud Frankfurt + EAS Production-Profil). Kein Staging-Environment für MVP.
- **D-08:** StorageAdapter in Phase 1: CRUD only — `get`, `set`, `delete`, `list`. Transaktionen und komplexere Queries: Phase 3.
- **D-09:** Lokale Schema-Migrationen mit Versionsnummer + up-migration-Pattern. StorageAdapter speichert Schema-Version; beim App-Start prüft er ob Migrationen nötig sind und führt sie in Reihenfolge aus.

### Claude's Discretion

- Geteilter DB-Client: nicht enthalten (Deno / React Native Runtime-Inkompatibilität — jedes Package initialisiert unabhängig).
- Transaction-Support im StorageAdapter: auf Phase 3 verschoben wenn Offline-Sync-Anforderungen den Transaktionsmodel klar machen.

### Deferred Ideas (OUT OF SCOPE)

Keine Deferred Ideas aus der Diskussion.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | pnpm Monorepo mit app/, supabase/, packages/shared läuft lokal | Monorepo-Konfiguration (pnpm-workspace.yaml, nodeLinker, metro.config.js) |
| FOUND-02 | StorageAdapter-Interface abstrahiert expo-sqlite (native) und IndexedDB (web) | Adapter-Pattern, Platform.select, COOP/COEP-Header für Web |
| FOUND-03 | Supabase-Schema mit RLS auf allen Tabellen ab Migration 001 | Migration-DDL-Pattern, auth.uid() Policy-Vorlage |
| FOUND-04 | Feature-Flag-System via Supabase-Tabelle (`feature_flags`) operabel | RLS-Policy für feature_flags, useFlag()-Hook-Pattern |
| FOUND-05 | EAS Build in CI für iOS und Web-Export | GitHub Actions Workflow, eas.json Profile, EXPO_TOKEN |
| FOUND-06 | Alle KI-API-Keys nur server-seitig in Edge Functions, nie im Client | pgmq-Consumer-Pattern, Edge Function Deno-Initialisierung |
| FOUND-07 | pgmq-Queue für asynchrone KI-Jobs (retry via visibility timeout) | pgmq SQL-Funktionen, Supabase pgmq_public Schema |
| FOUND-08 | KI-Antworten persistiert in `ai_results`-Tabelle | Migration-DDL für ai_results, Edge Function Persistence-Pattern |
| NFR-06 | UI-Strings zentralisiert in de.json (packages/shared) | i18n-Struktur in packages/shared |
| NFR-08 | Sentry (EU) für Crash-Reporting eingerichtet | @sentry/react-native Expo-Plugin, EU-DSN-Konfiguration |
</phase_requirements>

---

## Summary

Phase 1 ist reine Infrastruktur — keine sichtbaren Features, aber jede Entscheidung hier beeinflusst alle sieben Phasen. Die drei größten Risiken sind: (1) pnpm + EAS Build Kompatibilität (bekannte offene Issues seit 2025), (2) expo-sqlite im Web-Target (benötigt COOP/COEP-Header, sonst SharedArrayBuffer-Fehler), und (3) die korrekte Supabase pgmq-Einrichtung (pgmq_public Schema vs. pgmq Schema).

Der Stack ist weitgehend bestätigt. Expo SDK 55 unterstützt pnpm-Monorepos nativ via `expo/metro-config`, allerdings ist `nodeLinker: hoisted` in `pnpm-workspace.yaml` notwendig, und EAS Build hat bekannte Tücken mit pnpm-Workspace-Erkennung. Ein früher EAS-Build-Test (vor viel Produktionscode) ist kritisch.

pgmq in Supabase ist vollständig über `pgmq_public` Schema via `supabase-js` RPC-Aufrufe erreichbar — kein separates Paket nötig. Edge Functions laufen in Deno 2.x und können `@supabase/supabase-js` via npm: Import verwenden. Sentry ist mit `@sentry/react-native` + Expo-Plugin für EU-Hosting konfigurierbar.

**Primäre Empfehlung:** EAS Build + pnpm früh validieren (Wave 0/1), nicht erst am Ende der Phase. Alle anderen Infrastruktur-Komponenten folgen etablierten Patterns.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 10.33.0 | Package Manager + Workspaces | [VERIFIED: npm registry] Aktuelle stabile Version; Expo-Monorepo-Guide empfiehlt pnpm |
| Expo SDK | 55.0.15 | Universal App Framework | [VERIFIED: npm registry] Stabile Feb 2026 Version, bundelt RN 0.83 + React 19.2 |
| expo-router | 55.0.12 | File-based Routing + Web-SSR | [VERIFIED: npm registry] Via SDK 55 |
| @supabase/supabase-js | 2.103.2 | Postgres + Auth + Storage Client | [VERIFIED: npm registry] >= 2.49.5 wegen Metro-ES-Module-Bug nötig; aktuelle: 2.103.2 |
| supabase (CLI) | 2.91.2 | Lokale DB + Migrations + Type-Gen | [VERIFIED: npm registry] Für `supabase migration new`, `db push`, `gen types` |
| eas-cli | 18.7.0 | EAS Build + Submit CLI | [VERIFIED: npm registry + lokal installiert] |
| expo-sqlite | 55.0.15 | Lokale Persistenz (native) | [VERIFIED: npm registry] Bundled SDK 55 |
| expo-file-system | 55.0.16 | Foto-Queue offline | [VERIFIED: npm registry] |
| expo-secure-store | 55.0.13 | Token-Storage für Auth | [VERIFIED: npm registry] |
| @sentry/react-native | 8.7.0 | Crash-Reporting (NFR-08) | [VERIFIED: npm registry] Ersetzt deprecated sentry-expo ab SDK 50 |
| TypeScript | 6.0.2 | Type-Safety | [VERIFIED: npm registry] |
| Zustand | 5.0.12 | Global State | [VERIFIED: npm registry] |
| TanStack Query | 5.99.0 | Server State / Supabase Fetching | [VERIFIED: npm registry] |
| NativeWind | 4.2.3 | Tailwind Styling | [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb | latest | IndexedDB-Abstraction für Web | StorageAdapter Web-Implementierung |
| expo-crypto | latest | UUID-Generierung (lokal-Modus) | Benötigt in Phase 2, aber Interface-Design in Phase 1 |

### Alternativen (zurückgewiesen)
| Statt | Alternativ | Begründung |
|-------|-----------|------------|
| pnpm hoisted | pnpm isolated (default) | Isolated-Mode bricht React Native Native-Builds; SDK 53+ empfiehlt hoisted |
| @supabase/supabase-js 2.103.x | < 2.49.5 | Metro ES-Module-Fehler beim `ws` Import blockiert alle Supabase-Calls |
| @sentry/react-native | sentry-expo | sentry-expo ist deprecated seit SDK 50 |

**Installation (Monorepo-Root):**
```bash
npm install -g pnpm@latest
pnpm install
```

**Supabase CLI (global):**
```bash
npm install -g supabase
```

**Versionsverifikation:**
```bash
npm view pnpm version          # 10.33.0 [VERIFIED: 2026-04-16]
npm view expo version          # 55.0.15 [VERIFIED: 2026-04-16]
npm view @supabase/supabase-js version  # 2.103.2 [VERIFIED: 2026-04-16]
npm view expo-sqlite version   # 55.0.15 [VERIFIED: 2026-04-16]
npm view @sentry/react-native version   # 8.7.0 [VERIFIED: 2026-04-16]
npm view eas-cli version       # 18.7.0 [VERIFIED: 2026-04-16]
```

---

## Architecture Patterns

### Empfohlene Projektstruktur
```
/ (monorepo root)
├── pnpm-workspace.yaml          # packages + app workspace config
├── package.json                 # root scripts (build, lint, test)
├── tsconfig.base.json           # shared TS config
├── .github/
│   └── workflows/
│       ├── ci.yml               # PR: lint + typecheck + unit tests
│       └── eas-build.yml        # main: EAS iOS + Web build
│
├── app/                         # Expo React Native App
│   ├── package.json
│   ├── app.config.ts            # Expo config mit Sentry plugin
│   ├── metro.config.js          # COOP/COEP + wasm resolver
│   ├── eas.json                 # EAS Build Profiles
│   ├── app/                     # Expo Router file-based routes
│   │   └── _layout.tsx          # Sentry.wrap(RootLayout)
│   └── src/
│       ├── storage/
│       │   ├── StorageAdapter.ts        # Interface (CRUD: get/set/delete/list)
│       │   ├── SqliteAdapter.ts         # expo-sqlite Native-Implementierung
│       │   ├── IndexedDbAdapter.ts      # idb Web-Implementierung
│       │   └── index.ts                 # Platform.select Export
│       ├── lib/
│       │   └── supabase.ts              # Supabase-Client (app/)
│       └── hooks/
│           └── useFlag.ts               # Feature-Flag Hook
│
├── supabase/                    # Supabase-Projekt
│   ├── config.toml
│   ├── migrations/
│   │   └── 20260416000001_foundation.sql  # Migration 001
│   ├── functions/
│   │   └── ai-job-consumer/
│   │       └── index.ts         # pgmq Consumer Edge Function
│   └── seed.sql                 # Test-Daten (feature flags, test jobs)
│
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        ├── src/
        │   ├── types/
        │   │   ├── database.ts          # Supabase Codegen Output
        │   │   └── domain.ts            # GardenPlan, SeedEntry usw.
        │   ├── constants/
        │   │   ├── queues.ts            # QUEUE_AI_JOBS = 'ai_jobs'
        │   │   ├── flags.ts             # FLAG_EXAMPLE = 'example_flag'
        │   │   └── klimazonen.ts        # PLZ -> Klimazone Lookup
        │   ├── utils/
        │   │   └── index.ts             # Reine Utility-Funktionen
        │   └── i18n/
        │       └── de.json              # NFR-06: Alle UI-Strings
        └── index.ts                     # Barrel-Export
```

### Pattern 1: pnpm Workspace Konfiguration

**Was:** Monorepo mit pnpm Workspaces, hoisted nodeLinker für React Native Kompatibilität.

**pnpm-workspace.yaml (Root):**
```yaml
# Source: https://docs.expo.dev/guides/monorepos/
packages:
  - 'app'
  - 'packages/*'
  - 'supabase'

nodeLinker: hoisted
```

**Root package.json:**
```json
{
  "name": "spatenstich-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm --filter app run build",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "test": "pnpm -r run test"
  }
}
```

**app/metro.config.js:**
```javascript
// Source: https://docs.expo.dev/guides/monorepos/ + expo-sqlite COOP/COEP requirement
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../');

const config = getDefaultConfig(projectRoot);

// pnpm Monorepo: watch packages/shared
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// expo-sqlite Web: WASM + SharedArrayBuffer
config.resolver.assetExts.push('wasm');
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
```

### Pattern 2: StorageAdapter Interface (FOUND-02)

**Was:** Plattform-abstraktes CRUD-Interface. Native: expo-sqlite. Web: IndexedDB (idb). Kein direkter SQLite-Aufruf in Feature-Code.

```typescript
// Source: Adapter-Pattern, kombiniert aus expo-sqlite-Docs + idb-Pattern [ASSUMED: Code-Struktur]

// packages/shared/src/types/storage.ts
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
}

// app/src/storage/index.ts
import { Platform } from 'react-native';
import { SqliteAdapter } from './SqliteAdapter';
import { IndexedDbAdapter } from './IndexedDbAdapter';
import type { StorageAdapter } from '@spatenstich/shared';

export const storage: StorageAdapter = Platform.select({
  web: new IndexedDbAdapter('spatenstich-db'),
  default: new SqliteAdapter('spatenstich.db'),
})!;
```

**Migration-Bootstrapping (D-09):**
```typescript
// app/src/storage/migrations.ts [ASSUMED: Pattern]
const MIGRATIONS: Array<{ version: number; up: (adapter: StorageAdapter) => Promise<void> }> = [
  { version: 1, up: async (adapter) => { /* Phase 1 schema */ } },
];

export async function runMigrations(adapter: StorageAdapter): Promise<void> {
  const currentVersion = await adapter.getSchemaVersion();
  const pending = MIGRATIONS.filter(m => m.version > currentVersion);
  for (const migration of pending) {
    await migration.up(adapter);
    await adapter.setSchemaVersion(migration.version);
  }
}
```

### Pattern 3: Supabase Migration 001 (FOUND-03, D-01, D-02)

**Was:** Foundation-Tabellen mit RLS-Policies. auth.uid() als Sicherheitsnetz.

```sql
-- Source: supabase.com/docs/guides/database/postgres/row-level-security [CITED]
-- supabase/migrations/20260416000001_foundation.sql

-- Feature Flags (D-04: per-user flags oder global)
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = global flag
  flag_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

-- Alle authentifizierten User können ihre eigenen + globale Flags lesen
create policy "feature_flags: read own and global" on public.feature_flags
  for select using (
    auth.uid() = user_id or user_id is null
  );

-- Nur Service-Role kann Flags schreiben (kein Client-seitiges Erstellen)
create policy "feature_flags: service role insert" on public.feature_flags
  for insert with check (auth.role() = 'service_role');

-- AI Jobs Queue (FOUND-07: wird in pgmq gespiegelt, diese Tabelle für Tracking)
create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,  -- 'photo_analysis' | 'seed_extraction' | 'rules_extraction'
  status text not null default 'queued',  -- 'queued' | 'processing' | 'done' | 'failed'
  payload jsonb not null default '{}',
  pgmq_msg_id bigint,  -- Referenz auf pgmq Message-ID
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_jobs enable row level security;

create policy "ai_jobs: read own" on public.ai_jobs
  for select using (auth.uid() = user_id);

create policy "ai_jobs: insert own" on public.ai_jobs
  for insert with check (auth.uid() = user_id);

-- AI Results (FOUND-08)
create table public.ai_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.ai_jobs(id) on delete cascade,
  raw_response jsonb not null,   -- vollständige Claude-Antwort
  parsed_result jsonb,           -- strukturiertes Ergebnis (nach Validierung)
  model_used text,               -- z.B. 'claude-opus-4-5'
  created_at timestamptz not null default now()
);

alter table public.ai_results enable row level security;

create policy "ai_results: read own" on public.ai_results
  for select using (auth.uid() = user_id);

-- pgmq Extension aktivieren und Queue erstellen (FOUND-07)
create extension if not exists pgmq;
select pgmq.create('ai_jobs');
```

### Pattern 4: pgmq Edge Function Consumer (FOUND-06, FOUND-07, FOUND-08)

**Was:** Deno Edge Function liest pgmq-Jobs, ruft Claude API auf, persistiert Ergebnisse. API-Key bleibt server-seitig.

```typescript
// Source: supabase.com/docs/guides/queues/consuming-messages-with-edge-functions [CITED]
// supabase/functions/ai-job-consumer/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

// FOUND-06: API-Keys nur aus Deno.env — nie im Client-Bundle
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const claudeKey = Deno.env.get('CLAUDE_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface PgmqMessage {
  msg_id: bigint;
  read_ct: number;
  vt: string;
  enqueued_at: string;
  message: { job_id: string; job_type: string; payload: unknown };
}

Deno.serve(async (_req) => {
  // Read bis 5 Messages; visibility_timeout=30s (retry nach 30s bei Crash)
  const { data: messages, error } = await supabase
    .schema('pgmq_public')
    .rpc('read', { queue_name: 'ai_jobs', sleep_seconds: 30, n: 5 });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  for (const msg of messages as PgmqMessage[]) {
    try {
      // Hier: Claude API Call mit claudeKey (nie im Client)
      const rawResponse = { /* Claude API response */ };

      // FOUND-08: Persistierung in ai_results
      await supabase.from('ai_results').insert({
        user_id: /* aus job lookup */,
        job_id: msg.message.job_id,
        raw_response: rawResponse,
        parsed_result: null, // Parsing in separatem Schritt
      });

      // Erfolgreich: Message archivieren (Audit-Trail)
      await supabase.schema('pgmq_public').rpc('archive', {
        queue_name: 'ai_jobs',
        msg_id: msg.msg_id,
      });
    } catch (err) {
      // Fehler: Message bleibt in Queue (visibility timeout = retry)
      console.error(`Failed job ${msg.message.job_id}:`, err);
    }
  }

  return new Response(JSON.stringify({ processed: messages.length }), { status: 200 });
});
```

**Wichtig: Supabase nutzt `pgmq_public` Schema (nicht `pgmq` direkt) für client-seitige Calls.** [CITED: supabase.com/docs/guides/queues/consuming-messages-with-edge-functions]

### Pattern 5: Feature Flag Hook (FOUND-04)

```typescript
// app/src/hooks/useFlag.ts [ASSUMED: Hook-Struktur]
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FLAG_KEYS } from '@spatenstich/shared/constants/flags';

export function useFlag(flagKey: string): boolean {
  const { data } = useQuery({
    queryKey: ['feature_flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .maybeSingle();
      if (error) return false;
      return data?.enabled ?? false;
    },
    staleTime: 5 * 60 * 1000, // 5 Min Cache
  });
  return data ?? false;
}
```

### Pattern 6: EAS Build CI (FOUND-05)

**eas.json (in app/):**
```json
{
  "cli": { "version": ">= 18.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "ENVIRONMENT": "dev" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "env": { "ENVIRONMENT": "prod" },
      "ios": { "image": "macos-sonoma-14.6-xcode-16.1" }
    }
  }
}
```

**GitHub Actions Workflow (.github/workflows/eas-build.yml):**
```yaml
# Source: docs.expo.dev/build/building-on-ci/ [CITED]
name: EAS Build (iOS + Web)
on:
  push:
    branches: [main]

jobs:
  build:
    name: EAS Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: pnpm install
        working-directory: .
      - name: Build iOS on EAS
        run: eas build --platform ios --non-interactive --no-wait
        working-directory: app
      - name: Build Web (export)
        run: pnpm expo export --platform web
        working-directory: app

jobs-pr:
  name: PR Checks (lint + typecheck + test)
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v6
      with: { node-version: 22, cache: npm }
    - run: npm install -g pnpm && pnpm install
    - run: pnpm -r run typecheck
    - run: pnpm -r run lint
    - run: pnpm -r run test
```

**Web-Export:** `pnpm expo export --platform web` erzeugt statische Dateien. Kein separates EAS-Web-Build nötig — EAS Build ist für iOS/Android. [CITED: Expo Docs]

### Pattern 7: Sentry Setup (NFR-08)

```typescript
// app/app.config.ts
export default {
  expo: {
    plugins: [
      ['@sentry/react-native/expo', {
        url: 'https://sentry.io/',
        project: 'spatenstich',
        organization: '<org-slug>',
      }],
    ],
  },
};

// app/app/_layout.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, // EU-DSN aus Sentry Dashboard
  environment: process.env.ENVIRONMENT ?? 'dev',
  tracesSampleRate: 1.0,
});

export default Sentry.wrap(RootLayout);
```

**EU-DSN:** Beim Erstellen der Sentry-Organisation EU-Region wählen. Die generierte DSN zeigt dann automatisch auf EU-Endpoint (de.sentry.io). [MEDIUM: basierend auf Sentry EU-Regions-Diskussion, nicht offizielle Docs direkt verifiziert]

### Anti-Patterns zu vermeiden

- **pnpm isolated mode ohne hoisted:** React Native Native-Builds brechen mit Symlink-Fehlern. Immer `nodeLinker: hoisted` in pnpm-workspace.yaml.
- **eas build vom Monorepo-Root:** EAS Build muss aus dem `app/`-Verzeichnis ausgeführt werden, nicht aus dem Monorepo-Root. CI working-directory entsprechend setzen.
- **Direkte SQLite-Calls in Feature-Code:** Verletzt FOUND-02. Immer via StorageAdapter-Interface.
- **pgmq direkt via `pgmq` Schema (nicht `pgmq_public`):** Der Supabase-Client nutzt `pgmq_public` für RPC-Calls (nicht das interne `pgmq`-Schema direkt).
- **Sentry-Expo (deprecated):** `sentry-expo` nicht verwenden. `@sentry/react-native` ist der richtige Weg ab SDK 50.
- **`@supabase/supabase-js < 2.49.5`:** Bricht unter Metro ES-Module-Resolution (ws-Stream-Import-Fehler).

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Queue mit retry-Semantik | Eigene DB-basierte Queue | pgmq via Supabase | Visibility-Timeout, Archive, Metrics — fertig ausgebaut |
| TypeScript DB-Types | Manuelle Typen schreiben | `supabase gen types typescript` | Bleibt mit Schema synchron; CI-automatisierbar |
| Feature Flags Store | Custom Flag-Service | Supabase `feature_flags` Tabelle | Reusable, testbar, kein Deploy für Flag-Toggle |
| IndexedDB-API | Raw IndexedDB | `idb` Library | IDB-API ist fehleranfällig; idb macht Promise-Wrapper |
| Crash-Reporting | Custom Logger | Sentry `@sentry/react-native` | Source Maps, Session Replay, Alerting |
| Monorepo-Task-Runner | Shell-Scripts | pnpm -r (recursive) | Native pnpm-Workspace-Unterstützung |

**Kernaussage:** pgmq, Supabase Codegen und Sentry lösen exakt die Probleme, für die man sonst Wochen braucht. Custom-Lösungen in diesen Bereichen zu bauen würde das MVP-Timing gefährden.

---

## Common Pitfalls

### Pitfall 1: pnpm + EAS Build Lock-File-Erkennung

**Was schiefläuft:** EAS Build erkennt pnpm-Workspaces nicht korrekt und behandelt es wie Yarn. CI schlägt fehl mit "lock file not found" oder falscher Package-Manager-Erkennung.
**Warum:** EAS CLI issue #3247 (November 2025): EAS Build scheitert in Monorepos mit pnpm wenn `app/` in einem Unterverzeichnis liegt. Issue #2978: EAS verwechselt pnpm mit Yarn bei corepack.
**Wie vermeiden:** (1) EAS-Commands aus `app/`-Verzeichnis ausführen (nicht Monorepo-Root). (2) `nodeLinker: hoisted` in pnpm-workspace.yaml. (3) Früh testen — bereits in Wave 1, nicht erst am Phase-Ende.
**Warnsignale:** "Cannot find lockfile", "yarn.lock not found", Build startet aber findet packages/shared nicht.
**Fallback:** Wenn pnpm-EAS-Probleme unüberwindlich sind: `shamefully-hoist=true` in `.npmrc` + `config.resolver.unstable_enableSymlinks = true` in metro.config.js als Alternative zu nodeLinker. [CITED: community workaround]

### Pitfall 2: expo-sqlite Web ohne COOP/COEP-Header

**Was schiefläuft:** `SharedArrayBuffer is not defined` Fehler im Web-Build. expo-sqlite WASM-Backend benötigt SharedArrayBuffer, das COOP+COEP-HTTP-Header erfordert.
**Warum:** Browser blockieren SharedArrayBuffer ohne Cross-Origin-Isolation-Header (issue #38481).
**Wie vermeiden:** metro.config.js mit `enhanceMiddleware` (COEP: credentialless, COOP: same-origin). Im EAS Hosting: Headers in app.config.ts via expo-router-Plugin konfigurieren.
**Warnsignale:** App funktioniert nativ, bricht aber im Web-Build mit `SharedArrayBuffer`-Fehler.

### Pitfall 3: pgmq Schema-Verwechslung

**Was schiefläuft:** Direkter Aufruf auf `pgmq`-Schema schlägt fehl. Supabase-Client nutzt `pgmq_public` für client-seitige Calls.
**Warum:** Supabase exposed pgmq über ein separates `pgmq_public`-Schema mit eingeschränkten Berechtigungen für Sicherheit.
**Wie vermeiden:** Immer `.schema('pgmq_public').rpc('read', ...)` statt direktem SQL auf `pgmq.read(...)`.

### Pitfall 4: Doppelte React Native Instanzen im Monorepo

**Was schiefläuft:** Runtime-Fehler "invalid hook call" oder Build-Fehler wegen doppelter React/React-Native-Pakete.
**Warum:** pnpm Monorepo kann mehrere Versionen desselben Pakets hoisten.
**Wie vermeiden:** `pnpm why --depth=10 react-native` prüfen. Nur eine Version darf vorhanden sein. Pinnen in Root-package.json via `pnpm.overrides`.

### Pitfall 5: Supabase Types Out of Sync

**Was schiefläuft:** TypeScript-Kompilierung schlägt nach Schema-Änderungen fehl oder worse: läuft durch aber produziert Laufzeitfehler.
**Warum:** Manuelle Typen in packages/shared werden nicht automatisch aktualisiert.
**Wie vermeiden:** `supabase gen types typescript --project-id <ref> > packages/shared/src/types/database.ts` als Post-Migration-Step in CI einbinden.

### Pitfall 6: Claude API Key im Client-Bundle

**Was schiefläuft:** Security-Breach — API-Key in JavaScript-Bundle, lesbar via Bundle-Inspection.
**Warum:** Versehentliches Importieren von Server-Konfiguration in App-Code.
**Wie vermeiden:** (1) `CLAUDE_API_KEY` nur in `Deno.env` der Edge Function. (2) CI-Check: `grep -r "CLAUDE_API_KEY" app/` darf keinen Treffer geben. (3) Niemals `process.env.CLAUDE_API_KEY` in app/-Code.
**Erfolgs-Verifikation:** `npx expo export --platform web` + Bundle-Grep auf 'claude' und 'sk-ant'.

---

## Code Examples

### Supabase Job Enqueuing (Client-seitig, FOUND-07)

```typescript
// Source: supabase.com/docs/guides/queues/quickstart [CITED]
// app/src/lib/enqueueAiJob.ts

async function enqueueAiJob(payload: { job_type: string; data: unknown }) {
  // Schritt 1: Job-Tracking in ai_jobs-Tabelle
  const { data: job, error: jobError } = await supabase
    .from('ai_jobs')
    .insert({ job_type: payload.job_type, payload: payload.data })
    .select()
    .single();

  if (jobError) throw jobError;

  // Schritt 2: In pgmq-Queue einreihen
  const { error: queueError } = await supabase
    .schema('pgmq_public')
    .rpc('send', {
      queue_name: 'ai_jobs',
      message: { job_id: job.id, job_type: payload.job_type, payload: payload.data },
      sleep_seconds: 0,
    });

  if (queueError) throw queueError;
  return job;
}
```

### Supabase Type Generation

```bash
# Source: supabase.com/docs/guides/api/rest/generating-types [CITED]
# Ausführen nach jeder Migration

supabase gen types typescript \
  --project-id <your-project-ref> \
  > packages/shared/src/types/database.ts
```

### packages/shared Export-Struktur

```typescript
// packages/shared/src/constants/queues.ts [ASSUMED: Struktur]
export const QUEUES = {
  AI_JOBS: 'ai_jobs',
} as const;

// packages/shared/src/constants/flags.ts [ASSUMED]
export const FLAGS = {
  EXAMPLE: 'example_flag',
} as const;

// packages/shared/index.ts
export * from './types/database';
export * from './types/domain';
export * from './constants/queues';
export * from './constants/flags';
export * from './constants/klimazonen';
export * from './utils';
// i18n separat importiert: import de from '@spatenstich/shared/i18n/de.json'
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Wann geändert | Impact |
|--------------|-----------------|---------------|--------|
| sentry-expo | @sentry/react-native + Expo Plugin | SDK 50 (2024) | sentry-expo deprecated; neues Package direkt verwenden |
| Expo Webpack | Metro + Expo Router Web | SDK 52 (2024) | Webpack nicht mehr unterstützt; nur Metro für Web |
| pnpm .npmrc `shamefully-hoist=true` | pnpm-workspace.yaml `nodeLinker: hoisted` | SDK 53/54 (2024) | Neue empfohlene Methode laut Expo-Docs |
| pgmq direkt via SQL | pgmq_public Schema via supabase-js RPC | Supabase Queues GA (2025) | Dashboard-Integration + RLS-Unterstützung |
| manuell geteilte TS-Types | `supabase gen types typescript` | Supabase CLI 1.x | Automatisch synchron mit DB-Schema |

**Deprecated/Outdated:**
- `sentry-expo`: Durch `@sentry/react-native` ersetzt ab SDK 50; nicht verwenden.
- `Expo Webpack`: Entfernt aus Expo SDK 52+. Metro ist der einzige Web-Pfad.
- `react-native-reanimated v4`: Noch nicht stabil mit NativeWind v4 auf SDK 55. Bei v3 bleiben.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | StorageAdapter Interface-Struktur (get/set/delete/list + Schema-Version-Methods) | Pattern 2: StorageAdapter | Gering — Interface kann in Phase 1 angepasst werden ohne Downstream-Impact |
| A2 | idb Library als IndexedDB-Abstraction für Web-Implementierung | Standard Stack / Pattern 2 | Gering — idb ist etablierte Bibliothek; bei Problemen: native IndexedDB-API verwenden |
| A3 | Sentry EU-DSN zeigt auf de.sentry.io wenn EU-Organisation gewählt | Pattern 7: Sentry | Mittel — wenn EU-Region nicht korrekt DSN zuweist, müssen Sentry-Docs manuell konsultiert werden |
| A4 | GitHub Actions Workflow-Struktur (pr vs. main triggers) | Pattern 6: EAS Build CI | Gering — Workflow kann iteriert werden; kritischer ist der EAS-Build-Erfolg selbst |
| A5 | feature_flags Tabelle: null user_id = globaler Flag (shared für alle User) | Pattern 3: Migration 001 | Mittel — alternativ: separate global_flags Tabelle oder andere Unterscheidung; Entscheidung betrifft Phase-4-Feature-Flag-Usage |

---

## Open Questions

1. **pnpm + EAS Build Lock-File-Detection (Issue #3247)**
   - Was wir wissen: Issue geöffnet November 2025, noch offen; betrifft Monorepos mit Unterverzeichnis-Apps
   - Was unklar ist: Ob in EAS CLI 18.7.0 (aktuelle Version) gepatcht
   - Empfehlung: EAS Build als erste Wave in Phase 1 testen; bei Blockierung früh eskalieren statt Workaround zu verschleppen

2. **expo-sqlite Web-Status auf EAS Hosting (vs. lokalem Dev-Server)**
   - Was wir wissen: COOP/COEP-Header nötig; lokal via metro.config.js lösbar; EAS Hosting: via app.config.ts expo-router-Plugin konfigurierbar
   - Was unklar ist: Ob EAS Hosting (vs. Netlify/Vercel) COOP/COEP-Header korrekt ausliefert in der aktuellen SDK-55-Version
   - Empfehlung: Web-Export mit expo-sqlite testen (Phase 1 Akzeptanztest); bei Problemen: Phase 2 StorageAdapter-Regressions-Test einplanen

3. **NativeWind v4 + Reanimated v3 Kompatibilität auf SDK 55**
   - Was wir wissen: In STATE.md als offene Frage vermerkt; Reanimated v4 nicht stabil mit NativeWind v4
   - Was unklar ist: Ob SDK 55 diesen Konflikt behebt (noch nicht verifiziert)
   - Empfehlung: Basis-Styling-Spike in Phase 1 (ein Screen mit NativeWind + Reanimated); scheitert er, Reanimated v3 explizit pinnen

4. **Supabase Cron-Trigger für Edge Function Consumer**
   - Was wir wissen: pgmq Consumer läuft als HTTP-triggered Edge Function; für automatisches Polling ist pg_cron nötig
   - Was unklar ist: Ob Phase 1 einen Cron-Job für den Consumer einrichten soll oder ob der Consumer für Phase 1 manuell per HTTP-Call getriggert wird
   - Empfehlung: Phase 1 Akzeptanztest (manuelles Triggern) reicht; Cron-Setup in Phase 4 wenn AI-Jobs produktiv werden

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + CLI | ✓ | v24.14.0 | — |
| npm | Package install | ✓ | 11.9.0 | — |
| pnpm | Monorepo | ✗ | — | `npm install -g pnpm` (Wave 0) |
| git | Version control | ✓ | 2.40.0 | — |
| eas-cli | iOS/Web Build | ✓ | 18.7.0 (global) | — |
| supabase CLI | Migrations + Type-Gen | ✗ | — | `npm install -g supabase` (Wave 0) |
| Deno | Edge Function Dev | ✗ | — | `npm install -g deno` oder via Supabase CLI |
| Docker | Lokales Supabase | ✗ | — | Supabase Cloud direkt für Dev (D-03: kein Self-Hosting) |
| Expo Account | EAS Build | ✓ (via eas-cli) | — | — |
| Supabase Project | Backend | Needs setup | — | Supabase Cloud erstellen |

**Fehlende Dependencies ohne Fallback:**
- Docker: Für lokales Supabase (`supabase start`) nötig. **Aber:** D-03 bestätigt kein Self-Hosting — Supabase Cloud Frankfurt wird direkt verwendet. Docker für lokale Dev-Umgebung ist optional. Wenn kein Docker: direkt gegen Supabase Cloud dev-Projekt entwickeln.

**Fehlende Dependencies mit Setup-Schritt (Wave 0):**
- pnpm: `npm install -g pnpm@latest`
- supabase CLI: `npm install -g supabase`
- Deno: `winget install DenoLand.Deno` (Windows) oder via Supabase CLI für Edge-Function-Tests

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Noch nicht installiert — Wave 0 richtet ein |
| Empfehlung | Jest + ts-jest (via `expo install jest`) für Unit-Tests; Expo empfiehlt Jest |
| Config file | `jest.config.js` (Wave 0 erstellen) |
| Quick run command | `pnpm -r run test` |
| Full suite command | `pnpm -r run test --coverage` |

### Phase Requirements → Test Map

| Req ID | Verhalten | Test-Typ | Automatisierter Command | Datei vorhanden? |
|--------|----------|---------|------------------------|------------------|
| FOUND-01 | pnpm install + build erfolgreich | smoke | `pnpm install && pnpm -r run typecheck` | ❌ Wave 0 |
| FOUND-02 | StorageAdapter: get/set/delete/list korrekt | unit | `jest tests/storage/StorageAdapter.test.ts` | ❌ Wave 0 |
| FOUND-02 | IndexedDbAdapter verhält sich wie SqliteAdapter | unit | `jest tests/storage/adapters.test.ts` | ❌ Wave 0 |
| FOUND-03 | RLS: User A sieht nicht Rows von User B | integration (Supabase) | manuell via Supabase Dashboard / SQL-Test | manual-only |
| FOUND-04 | useFlag() gibt richtigen Wert zurück | unit | `jest tests/hooks/useFlag.test.ts` | ❌ Wave 0 |
| FOUND-05 | EAS Build iOS + Web erfolgreich | e2e | EAS Build CI (kein schneller Test) | manual-only |
| FOUND-06 | CLAUDE_API_KEY nicht im Web-Bundle | smoke | `grep -r "sk-ant" dist/` nach `expo export` | ❌ Wave 0 (CI-Schritt) |
| FOUND-07 | pgmq enqueue + read funktionieren | integration | manuell via Supabase SQL Editor | manual-only |
| FOUND-08 | Edge Function persistiert in ai_results | integration | manuell via Edge Function Invoke | manual-only |
| NFR-06 | de.json enthält alle Strings | unit | `jest tests/i18n/completeness.test.ts` | ❌ Wave 0 |
| NFR-08 | Sentry initialisiert ohne Fehler | smoke | App startet ohne Sentry-Init-Error | manual-only |

### Sampling Rate
- **Per Task Commit:** `pnpm -r run typecheck && pnpm -r run lint`
- **Per Wave Merge:** `pnpm -r run test`
- **Phase Gate:** Full suite green + manuelle Akzeptanztests (FOUND-03, FOUND-05, FOUND-07, FOUND-08) vor `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `app/jest.config.js` — Jest-Setup für Expo
- [ ] `packages/shared/jest.config.js` — Jest für shared Package
- [ ] `app/tests/storage/StorageAdapter.test.ts` — FOUND-02
- [ ] `app/tests/hooks/useFlag.test.ts` — FOUND-04
- [ ] `packages/shared/tests/i18n/completeness.test.ts` — NFR-06
- [ ] CI-Schritt: `grep -r "sk-ant\|CLAUDE_API_KEY" dist/ || exit 0` — FOUND-06

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Nein (Phase 2) | Supabase Auth (Phase 2) |
| V3 Session Management | Nein (Phase 2) | expo-secure-store (Phase 2) |
| V4 Access Control | Ja | Supabase RLS + auth.uid() auf allen Tabellen |
| V5 Input Validation | Ja (partial) | Zod für Edge Function Payload-Validierung |
| V6 Cryptography | Ja (API-Keys) | Deno.env — niemals in Client-Bundle |

### Known Threat Patterns für diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API-Key Leakage im Client-Bundle | Information Disclosure | Deno.env only; Bundle-Grep in CI (FOUND-06) |
| RLS-Bypass via SQL-Fehler | Elevation of Privilege | RLS auf allen Tabellen; service_role nur server-seitig |
| pgmq Job Injection (böser Payload) | Tampering | Edge Function validiert Payload vor Claude-API-Call (Zod) |
| Fehlende RLS auf neuer Tabelle | Elevation of Privilege | Migration-Checkliste: `alter table ... enable row level security` immer Pflicht |

---

## Project Constraints (from CLAUDE.md)

Folgende Direktiven aus CLAUDE.md sind für Phase 1 bindend:

| Direktive | Impact auf Phase 1 |
|-----------|-------------------|
| Expo SDK 55 | Zielversion; nicht auf 54 oder 53 bauen |
| `@supabase/supabase-js >= 2.49.5` | Aktuelle Version 2.103.2 erfüllt dies |
| `react-native-reanimated` nur v3 (nicht v4) | Relevant ab Phase 5; Phase 1 installiert NativeWind-Stack |
| pnpm workspaces 9.x / 10.x | Aktuell: 10.33.0 [VERIFIED] |
| Deno 2.x für Edge Functions | Supabase Edge Functions Runtime ist Deno 2.x |
| expo-sqlite OHNE direkte Aufrufe im Feature-Code | StorageAdapter-Interface ist Pflicht (D-08, FOUND-02) |
| Kein Redux Toolkit, kein Jotai, kein SWR, kein Tamagui | Nicht in Phase 1 installieren |
| EAS Build für iOS und Web | Beide Plattformen in CI — nicht nur iOS |
| pnpm workspaces NodeLinker: hoisted | In pnpm-workspace.yaml konfigurieren |

---

## Sources

### Primary (HIGH confidence)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/) — pnpm hoisted config, Metro monorepo setup [CITED]
- [Supabase Queues API](https://supabase.com/docs/guides/queues/api) — pgmq SQL-Funktionen [CITED]
- [Supabase pgmq Edge Function Consumer](https://supabase.com/docs/guides/queues/consuming-messages-with-edge-functions) — vollständiges TypeScript-Beispiel [CITED]
- [Supabase pgmq Extension](https://supabase.com/docs/guides/queues/pgmq) — SQL DDL, Funktions-Signaturen [CITED]
- [Supabase Local Development](https://supabase.com/docs/guides/local-development/overview) — Migration-Workflow [CITED]
- [Sentry React Native Expo Setup](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) — @sentry/react-native Plugin-Konfiguration [CITED]
- [EAS Build CI](https://docs.expo.dev/build/building-on-ci/) — GitHub Actions Workflow [CITED]
- npm registry: expo@55.0.15, @supabase/supabase-js@2.103.2, expo-sqlite@55.0.15, @sentry/react-native@8.7.0, pnpm@10.33.0, eas-cli@18.7.0 [VERIFIED: 2026-04-16]

### Secondary (MEDIUM confidence)
- [expo-sqlite SharedArrayBuffer Issue #38481](https://github.com/expo/expo/issues/38481) — COOP/COEP Header Requirement [CITED]
- [EAS CLI Issue #3247](https://github.com/expo/eas-cli/issues/3247) — pnpm Lockfile Detection Problem [CITED]
- [EAS CLI Issue #2978](https://github.com/expo/eas-cli/issues/2978) — pnpm vs. Yarn Verwechslung [CITED]
- [Supabase JS Metro Issue #1403](https://github.com/supabase/supabase-js/issues/1403) — ws-Stream-Fehler RN 0.79+ [CITED]
- [byCedric expo-monorepo-example](https://github.com/byCedric/expo-monorepo-example) — pnpm Monorepo Referenz-Implementierung [CITED]

### Tertiary (LOW confidence)
- WebSearch: EAS Build pnpm Workaround (.npmrc shamefully-hoist) — Community-Posts, nicht offiziell verifiziert
- WebSearch: Sentry EU DSN de.sentry.io — aus GitHub-Diskussion, nicht offizielle Docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Package-Versionen via npm registry verifiziert
- pnpm + EAS Integration: MEDIUM — bekannte offene Issues, Workarounds dokumentiert
- pgmq Integration: HIGH — offizielle Supabase-Dokumentation mit Code-Beispielen
- StorageAdapter Interface: MEDIUM — Pattern klar, Implementierungs-Details [ASSUMED]
- Sentry EU Setup: MEDIUM — EU-Region-Konzept bestätigt, DSN-Details nicht direkt verifiziert
- EAS Build CI: MEDIUM — Standard-Workflow bekannt, pnpm-Anpassung teilweise [ASSUMED]

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (pnpm/EAS-Issues sind aktiv; vor Umsetzung nochmals Issue-Status prüfen)

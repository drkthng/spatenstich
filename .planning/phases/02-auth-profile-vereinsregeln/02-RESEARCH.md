# Phase 2: Auth, Profile & Vereinsregeln – Research

**Researched:** 2026-04-19
**Domain:** Supabase Auth + Expo Router v4 Protected Routes + NativeWind v4 + Local-Modus-UUID + Vereinsregeln-Extraktion via Claude
**Confidence:** MEDIUM-HIGH (Supabase + Expo Router patterns: HIGH; NativeWind/SDK 53-Kompatibilität: MEDIUM wegen aktiver Bugs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Kein Pflicht-Wizard. Freie Navigation nach Auth-Wahl — User kann PLZ, Archetyp, Vereinsregeln überspringen.
- **D-02:** Ein Pflichtschritt: beim ersten App-Start MUSS der User "Account erstellen" oder "Lokal nutzen" wählen. Garantiert eine `user_id` (Supabase UID oder lokale UUID via expo-secure-store).
- **D-03:** Beide Auth-Pfade (Account und Lokal) nutzen dieselben Profil-Screens (gleiche UI, verschiedene Storage-Backends).
- **D-04:** Fehlende-Daten-Hinweise: kontextuelle Inline-Banner pro Feature (nicht globale Checkliste).
- **D-05:** Expo Router File Groups: `(auth)/` für Auth-Wahl/Login/Register, `(app)/` für alle geschützten Screens. Root `_layout.tsx` prüft Session/lokale-UUID und leitet entsprechend weiter.
- **D-06:** Nach Auth: User landet direkt auf dem Garten-Plan-Placeholder-Screen (innerhalb `(app)/`).
- **D-07:** PDF/Bild-Upload → Claude-Extraktion läuft SYNCHRON (kein pgmq-Queue in Phase 2) mit Lade-Screen. Timeout → Fehler + Retry.
- **D-08:** Bestätigungs-UI: Scrollbare Liste, per-Regel Toggle/Edit, "Speichern"-Button.
- **D-09:** Checklisten-Alternative: ~10–15 vordefinierte Regeln mit Checkboxen + numerischen Eingaben. BKleingG-Grundregeln grau/nicht-togglebar oben.
- **D-10:** BKleingG 1/3-Warnung ist PLACEHOLDER in Phase 2 (Ampel-Indikator, "Plan noch nicht vorhanden"-Zustand).
- **D-11:** Lokal-Modus → StorageAdapter (SQLite/IndexedDB). Account-Modus → Supabase direkt (kein lokaler Cache in Phase 2).
- **D-12:** Migration lokal → Account: "Account erstellen und Daten übertragen"-Button im Profil.

### Claude's Discretion
- **Haftungsausschluss (NFR-07):** Wann und wie "Die App gibt Empfehlungen ohne Gewähr..." angezeigt wird.
- **PDF-Upload im Lokal-Modus:** Nicht verfügbar (kein Supabase Auth Token). Lokal-Nutzer werden zur Checklisten-Alternative geleitet — genaue UX ist Claude's Entscheidung.
- **Lade-Screen-Design** für PDF-Extraktion (Animations-Stil, Zeithinweis, Abbrechen-Option).
- **Inline-Banner-Design** für fehlende Profildaten (Icon, Farbe, Dismiss-Verhalten).

### Deferred Ideas (OUT OF SCOPE)
- **Multi-User / gemeinsamer Garten:** Eigene Phase nach MVP.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Beschreibung | Research-Grundlage |
|----|-------------|-------------------|
| AUTH-01 | Account mit E-Mail/Passwort anlegen (Supabase Auth) | Abschnitt "Supabase Auth" + Schema-Migration |
| AUTH-02 | Login + persistente Session nach Neustart | LargeSecureStore-Pattern + persistSession |
| AUTH-03 | App ohne Account nutzen (Lokal-Modus, UUID via SecureStore) | Abschnitt "Local UUID Mode" |
| AUTH-04 | Wechsel lokal → Account mit Datenmigration | Abschnitt "Local-to-Account Migration" |
| AUTH-05 | Onboarding < 5 Minuten | D-01/D-02/D-05 Navigation + Stack.Protected |
| PROF-01 | PLZ → Klimazone (statische Lookup-Tabelle) | `klimazonen.ts` bereits vorhanden |
| PROF-02 | Archetyp-Auswahl (6 Optionen) | `archetypes.ts` bereits vorhanden |
| PROF-03 | Profildaten beeinflussen Downstream-Features | UserProfile-Typ + Store-Struktur |
| PROF-04 | Profil jederzeit änderbar | StorageAdapter CRUD + Supabase upsert |
| RULES-01 | PDF/Bild-Upload → Claude extrahiert Regeln als JSON | Edge Function + Files API (Beta) |
| RULES-02 | Extrahierte Regeln bestätigen/korrigieren/löschen | Bestätigungs-UI-Pattern |
| RULES-03 | Checklisten-Alternative für manuelle Eingabe | VereinsregelChecklist-Datenmodell |
| RULES-04 | BKleingG-Grundregeln immer aktiv (nicht-togglebar) | Konstanten + UI-Constraint |
| RULES-05 | Warnung bei 1/3-Verstoss (Placeholder Phase 2) | D-10: Ampel-UI ohne echte Berechnung |
| NFR-07 | Haftungsausschluss im UI | Claude's Discretion: Ort/Design |
</phase_requirements>

---

## Summary

Phase 2 baut die komplette Onboarding-Grundlage auf Basis der Phase-1-Infrastruktur. Der zentrale technische Knoten ist die **Expo Router v4 Protected-Routes-Architektur** mittels `Stack.Protected` in Verbindung mit einem React-Context, der entweder eine Supabase-Session oder eine lokal generierte UUID hält. Beide Pfade (Account / Lokal) müssen dieselbe `user_id`-Schnittstelle nach unten propagieren.

Die grösste Komplexität liegt bei zwei Themen: (1) dem **Supabase-Session-Speicher** für React Native, der wegen der 2048-Byte-Grenze von `expo-secure-store` einen Wrapper (`LargeSecureStore`) braucht — in Phase 1 wurde `persistSession: true` bereits konfiguriert, aber der Storage-Adapter fehlt noch. (2) **NativeWind v4 auf Expo SDK 53**: NativeWind `>=4.2.0` ist mit Expo SDK 53 inkompatibel. Die Lösung ist ein expliziter Pin auf `nativewind@4.1.23` plus `react-native-reanimated@3.17.4`.

Die **Vereinsregeln-Extraktion** erfolgt via Claude Files API (Beta, `files-api-2025-04-14`): die App lädt das PDF zu Supabase Storage hoch, die Edge Function lädt es von dort herunter, verwendet die Files API um es bei Anthropic hochzuladen, und ruft anschliessend `claude-sonnet-4-6` mit strukturiertem Output auf. Dies ist ein direkter (synchroner) HTTP-Call — keine pgmq-Queue.

**Primärempfehlung:** Session-Kontext direkt in `_layout.tsx` via `Stack.Protected`, kein zusätzlicher Router-Wrapper. `LargeSecureStore` von der offiziellen Supabase-Expo-Doku übernehmen. NativeWind auf `4.1.23` pinnen.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth-Wahl (Account/Lokal) | Frontend App (Client) | — | Reine Client-seitige Entscheidung, kein Server-Roundtrip |
| Supabase signUp/signIn | Supabase Auth (Backend) | Frontend App | Supabase Auth verwaltet Tokens, App initiiert |
| Session-Persistenz (Account) | Frontend App (SecureStore) | Supabase Auth | LargeSecureStore hält Token lokal; Supabase autoRefreshToken |
| Lokale UUID-Persistenz | Frontend App (SecureStore) | — | `expo-secure-store` auf Native, `localStorage` auf Web |
| PLZ → Klimazone-Lookup | Frontend App (Client) | — | Statische Lookup-Tabelle in `packages/shared` — kein Netzaufruf |
| Archetyp-Auswahl | Frontend App (Client) | — | Statische Konstanten in `packages/shared` |
| Profil-Persistenz (Lokal) | StorageAdapter (SQLite/IndexedDB) | — | D-11: Lokal-Modus nutzt nur lokale Adapters |
| Profil-Persistenz (Account) | Supabase Postgres | — | D-11: Account-Modus direkt zu Supabase, kein Cache Phase 2 |
| PDF-Upload | Supabase Storage | expo-document-picker | Nur Account-Modus; Lokal-Modus hat keinen Auth-Token |
| Vereinsregeln-Extraktion | Supabase Edge Function (Deno) | Claude API | FOUND-06: KI-Keys nie im Client |
| Regelbestätigung/Edit | Frontend App (Client) | — | Lokale State-Mutation vor dem finalen `set()` / `upsert()` |
| BKleingG-Warnung (Placeholder) | Frontend App (Client) | — | D-10: Nur UI-Placeholder, keine Berechnung |
| Lokal→Account-Migration | Frontend App (Client) | Supabase Postgres | Client liest StorageAdapter, schreibt nach Supabase in einer Operation |

---

## Standard Stack

### Core (Phase 2)

| Library | Version | Zweck | Warum Standard |
|---------|---------|-------|----------------|
| `expo-secure-store` | `~14.0.0` (bereits installiert) | UUID-Persistenz (Lokal), Session-Key für LargeSecureStore | Offizielles Expo-Paket; iOS Keychain / Android Keystore |
| `nativewind` | `4.1.23` (**PIN — nicht >=4.2.0**) | Tailwind-Styling für Native + Web | 4.2.x inkompatibel mit Expo SDK 53 |
| `tailwindcss` | `^3.4.17` | CSS-Basis für NativeWind v4 | NativeWind v4 erfordert Tailwind v3 (nicht v4) |
| `react-native-reanimated` | `3.17.4` (**PIN**) | Animationen, NativeWind-Dependency | Expo SDK 53 unterstützt nur 3.17.x; v4 ist noch nicht stabil |
| `expo-document-picker` | `~13.0.0` | PDF/Bild auswählen für Vereinsregeln-Upload | SDK 53 kompatibel; `copyToCacheDirectory: true` erforderlich |
| `@react-native-async-storage/async-storage` | `^2.1.0` | LargeSecureStore-Basis (AES-Entschlüsselung + Zwischenspeicher) | Supabase-Expo-Doku-empfohlen |
| `aes-js` | `^3.1.2` | AES-256-Verschlüsselung für LargeSecureStore | Leichtgewichtig, im offiziellen Supabase-Tutorial verwendet |
| `react-native-get-random-values` | `^1.11.0` | UUID-Generierung (crypto.randomUUID Polyfill) | Pflicht auf React Native für UUID-Generierung |

### Supporting

| Library | Version | Zweck | Wann verwenden |
|---------|---------|-------|----------------|
| `react-native-reusables` | über CLI (`npx shadcn@latest add ...`) | Kopier-basierte Komponenten-Primitiven (shadcn/ui für RN) | Für Input, Checkbox, RadioGroup, Switch — Code wird ins Repo kopiert |
| `@rn-primitives/slot` | `1.4.0` (transitive Dep von reusables) | Headless Primitiven-Grundlage | Nur indirekt via reusables |
| `expo-file-system` | `~18.0.0` (bereits installiert) | Datei-URI lesen vor Upload | Bereits Phase-1-Dependency |

### Nicht installieren (Abgelehnte Alternativen)

| Statt | Nicht verwenden | Grund |
|-------|----------------|-------|
| `nativewind@4.1.23` | `nativewind@4.2.x` | `react-native-worklets/plugin` fehlt auf Expo SDK 53 |
| `react-native-reanimated@3.17.4` | `react-native-reanimated@4.x` | Nicht stabil mit NativeWind v4 auf SDK 53 (CLAUDE.md-Constraint) |
| AsyncStorage + aes-js (LargeSecureStore) | expo-secure-store direkt für Session | Session > 2048 Bytes — überschreitet iOS SecureStore-Limit |
| `supabase.functions.invoke()` | direkter `fetch()` für Edge Functions | `supabase-js` setzt Auth-Header automatisch |

**Installation:**
```bash
# NativeWind + Tailwind (PIN auf 4.1.23)
pnpm --filter app add nativewind@4.1.23 react-native-reanimated@3.17.4
pnpm --filter app add -D tailwindcss@^3.4.17

# LargeSecureStore Dependencies
pnpm --filter app add @react-native-async-storage/async-storage aes-js react-native-get-random-values

# Dokument-Picker für Vereinsregeln-Upload
pnpm --filter app add expo-document-picker
```

**Versionsverifikation (npm registry):**
- `nativewind@4.1.23` — [VERIFIED: npm registry] — letzte stabile Version vor dem 4.2.0-Bruch mit SDK 53
- `react-native-reanimated@3.17.4` — [VERIFIED: npm registry] — von Expo SDK 53 offiziell unterstützte Version
- `tailwindcss` latest: `4.2.2` — aber NativeWind v4 braucht `^3.4.17` — [VERIFIED: nativewind.dev Doku]
- `expo-document-picker` latest: `55.0.13` (via Expo SDK 55) — für SDK 53 `~13.0.0` verwenden

---

## Architecture Patterns

### System Architecture Diagram

```
App-Start (kalt)
     │
     ▼
_layout.tsx (Root)
├─ SplashScreen.preventAutoHideAsync()
├─ AuthProvider initialisiert
│     ├─ SecureStore.getItemAsync('local_uuid')  → Lokal-UUID vorhanden?
│     └─ supabase.auth.getSession()              → Supabase-Session vorhanden?
│
├─ [Kein Identity]
│     └─ Stack.Protected guard={false}
│           └─ (auth)/index.tsx ← Pflicht-Screen "Account oder Lokal?"
│
└─ [Identity vorhanden (UUID oder Session)]
      └─ Stack.Protected guard={true}
            └─ (app)/index.tsx ← Garten-Plan-Placeholder
                  │
                  ├─ (app)/profile/ ← PLZ, Archetyp, Vereinsregeln
                  └─ (app)/settings/ ← Logout / Migration-Button

Vereinsregeln-Extraktion (Account-Modus):
  Expo-App
     │ expo-document-picker → lokale PDF-URI
     │ expo-file-system → read ArrayBuffer
     │ supabase.storage.from('vereinsregeln').upload(...)
     │ supabase.functions.invoke('extract-vereinsregeln', { body: { storagePath } })
     │              │
     │     Edge Function (Deno)
     │              ├─ supabase.storage.download(storagePath)
     │              ├─ anthropic.beta.files.upload(pdfBlob)
     │              ├─ anthropic.beta.messages.create({ type: 'document', file_id })
     │              └─ return VereinsRegel[]
     │
     ▼
  Bestätigungs-UI (D-08): scrollbare Liste, Toggle/Edit pro Regel, "Speichern"
```

### Recommended Project Structure (Phase 2 additions)

```
app/
├─ app/
│   ├─ _layout.tsx           ← Erweitern: AuthProvider + Stack.Protected
│   ├─ (auth)/
│   │   ├─ _layout.tsx       ← Kein Guard (immer zugänglich)
│   │   ├─ index.tsx         ← Auth-Wahl: "Account erstellen" | "Lokal nutzen"
│   │   ├─ register.tsx      ← E-Mail/Passwort Registrierung
│   │   └─ login.tsx         ← E-Mail/Passwort Login
│   └─ (app)/
│       ├─ _layout.tsx       ← Tab/Stack Layout für geschützte Screens
│       ├─ index.tsx         ← Garten-Plan-Placeholder (D-06)
│       └─ profile/
│           ├─ index.tsx     ← Profil-Übersicht + Inline-Banner
│           ├─ plz.tsx       ← PLZ-Eingabe → Klimazone
│           ├─ archetype.tsx ← Archetyp-Auswahl
│           └─ vereinsregeln/
│               ├─ index.tsx    ← Upload/Checkliste Einstieg
│               ├─ upload.tsx   ← PDF/Bild Upload + Lade-Screen
│               ├─ confirm.tsx  ← Bestätigungs-UI (D-08)
│               └─ checklist.tsx ← Manuelle Eingabe (D-09)
├─ src/
│   ├─ lib/
│   │   ├─ supabase.ts       ← Erweitern: LargeSecureStore-Adapter einbauen
│   │   └─ auth.ts           ← NEU: AuthContext, SessionProvider, useAuth-Hook
│   ├─ stores/
│   │   ├─ authStore.ts      ← NEU: Zustand-Store für Session/LocalUUID
│   │   └─ profileStore.ts   ← NEU: Zustand-Store für PLZ/Klimazone/Archetyp/Regeln
│   ├─ storage/              ← Phase 1 (unverändert)
│   └─ hooks/
│       ├─ useFlag.ts        ← Phase 1 (unverändert)
│       └─ useProfile.ts     ← NEU: Hook für Profildaten (reads profileStore)
supabase/
├─ functions/
│   └─ extract-vereinsregeln/
│       ├─ deno.json
│       └─ index.ts          ← NEU: synchrone Extraktion via Claude Files API
└─ migrations/
    └─ 20260419000002_profiles.sql ← NEU: profiles + vereinsregeln Tabellen
packages/shared/
└─ src/
    ├─ types/
    │   └─ domain.ts         ← NEU: UserProfile, VereinsRegel, VereinsregelChecklist
    ├─ constants/
    │   ├─ klimazonen.ts     ← ERWEITERN: vollständige PLZ-Lookup-Tabelle
    │   └─ vereinsregeln.ts  ← NEU: Standard-Checklisten-Regeln (D-09)
    └─ i18n/de.json          ← ERWEITERN: auth.*, profile.*, rules.*-Keys
```

### Pattern 1: Stack.Protected mit AuthProvider

**Was:** `Stack.Protected` in Expo Router v4 nutzt einen `guard: boolean`-Prop. Wenn `guard={false}`, wird der Screen gesperrt und der User zum Anchor-Screen umgeleitet (Index des Stacks). Dies funktioniert auch bei Deeplinks.

**Wann:** Immer wenn Auth-basierter Routenschutz gebraucht wird — ersetzt `useSegments`/`useRouter`-Redirect-Muster.

```typescript
// Source: https://docs.expo.dev/router/advanced/protected/
// app/app/_layout.tsx (erweitert)
import { Stack, SplashScreen } from 'expo-router';
import { useAuth } from '@/src/lib/auth';

SplashScreen.preventAutoHideAsync();

function SplashController() {
  const { isLoading } = useAuth();
  if (!isLoading) {
    SplashScreen.hide();
  }
  return null;
}

function RootLayout() {
  const { identity } = useAuth(); // null | { type: 'account'|'local', userId: string }
  return (
    <AuthProvider>
      <SplashController />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={identity === null}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={identity !== null}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </AuthProvider>
  );
}
```

**Wichtig:** `SplashScreen.preventAutoHideAsync()` MUSS aufgerufen werden, bevor die Auth-Prüfung abgeschlossen ist, sonst gibt es einen kurzen Flash des geschützten Inhalts.

### Pattern 2: LargeSecureStore für Supabase-Session

**Was:** Expo SecureStore ist auf 2048 Bytes begrenzt. Supabase-Sessions überschreiten diese Grenze. Der offizielle Workaround: AES-256-Schlüssel in SecureStore, verschlüsselte Session in AsyncStorage.

```typescript
// Source: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
// app/src/lib/supabase.ts (erweitert)
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decrypted = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decrypted);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this._decrypt(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? new LargeSecureStore() : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Pattern 3: Lokale UUID-Identität

**Was:** Lokal-Modus-User bekommen eine UUID, die in `expo-secure-store` gespeichert wird. Diese UUID dient als `user_id` in allen StorageAdapter-Keys.

```typescript
// Source: expo-secure-store Doku + [ASSUMED] Best-Practice-Pattern
// app/src/lib/auth.ts
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';

const LOCAL_UUID_KEY = 'spatenstich_local_uuid';

export async function getOrCreateLocalUUID(): Promise<string> {
  let uuid = await SecureStore.getItemAsync(LOCAL_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    await SecureStore.setItemAsync(LOCAL_UUID_KEY, uuid);
  }
  return uuid;
}

export async function clearLocalUUID(): Promise<void> {
  await SecureStore.deleteItemAsync(LOCAL_UUID_KEY);
}
```

**Hinweis Web:** `expo-secure-store` ist auf iOS/Android verfügbar. Auf Web gibt es kein direktes Äquivalent mit Keychain-Niveau. Für Web: `localStorage` mit Key-Präfix genügt für Lokal-Modus (kein hochsensibles Datum — nur eine UUID).

### Pattern 4: NativeWind v4 Setup (SDK 53-sicher)

```typescript
// Source: https://www.nativewind.dev/docs/getting-started/installation
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // WICHTIG: react-native-reanimated/plugin NUR wenn Reanimated v3 verwendet wird.
    // NativeWind 4.2+ erfordert react-native-worklets/plugin — NICHT vorhanden in SDK 53.
    // Mit 4.1.23 entfällt diese Abhängigkeit.
  };
};

// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });

// global.css (im app/-Verzeichnis)
@tailwind base;
@tailwind components;
@tailwind utilities;

// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};

// nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

**Bekanntes Windows-Problem:** Auf Windows kann die Metro-Cache-Datei `global.css.web.css` nicht gefunden werden (Issue #1492). Workaround: `npx expo start --clear` nach jeder Konfigurations-Änderung. Alternativ: Entwicklung primär auf macOS/Linux.

### Pattern 5: Edge Function für Vereinsregeln-Extraktion

**Was:** Synchroner HTTP-Call (kein pgmq) — Edge Function empfängt Supabase-Storage-Pfad, lädt PDF, nutzt Claude Files API.

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/files
// supabase/functions/extract-vereinsregeln/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const { storagePath, userId } = await req.json();

  // 1. PDF von Supabase Storage holen
  const { data: fileData, error } = await supabase
    .storage.from('vereinsregeln')
    .download(storagePath);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  // 2. Bei Anthropic hochladen (Files API Beta)
  const uploaded = await anthropic.beta.files.upload({
    file: new File([await fileData.arrayBuffer()], 'satzung.pdf', { type: 'application/pdf' }),
  }, { headers: { 'anthropic-beta': 'files-api-2025-04-14' } });

  // 3. Claude-Extraktion mit strukturiertem Output
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: EXTRACTION_PROMPT },
        { type: 'document', source: { type: 'file', file_id: uploaded.id } },
      ],
    }],
    // [ASSUMED] structured JSON output via tool_use oder system-prompt-basierte Ausgabe
  });

  // 4. Anthropic-Datei löschen (nicht persistent nötig)
  await anthropic.beta.files.delete(uploaded.id,
    { headers: { 'anthropic-beta': 'files-api-2025-04-14' } }
  );

  const rules = parseRules(response.content[0].text);
  return new Response(JSON.stringify({ rules }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

**Timeout-Risiko:** Supabase Edge Functions haben ein Timeout von 60 Sekunden (Standard). Bei grossen PDFs kann das knapp werden. D-07 erfordert Retry-UI — kein Problem wenn der Client-seitige Timeout >30 Sek ist.

### Pattern 6: Zustand Store-Struktur

```typescript
// Source: https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data + [ASSUMED]
// app/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthMode = 'account' | 'local' | null;

interface AuthState {
  mode: AuthMode;
  userId: string | null;
  setAccountMode: (userId: string) => void;
  setLocalMode: (uuid: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      mode: null,
      userId: null,
      setAccountMode: (userId) => set({ mode: 'account', userId }),
      setLocalMode: (uuid) => set({ mode: 'local', userId: uuid }),
      clearAuth: () => set({ mode: null, userId: null }),
    }),
    {
      name: 'spatenstich-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// app/src/stores/profileStore.ts
import type { Klimazone, Archetype } from '@spatenstich/shared';
import type { VereinsRegel } from '@spatenstich/shared';

interface ProfileState {
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  vereinsregeln: VereinsRegel[];
  setPlz: (plz: string, klimazone: Klimazone) => void;
  setArchetype: (archetype: Archetype) => void;
  setVereinsregeln: (rules: VereinsRegel[]) => void;
  reset: () => void;
}

// Account-Modus: kein persist-Middleware (Daten kommen aus Supabase)
// Lokal-Modus: persist-Middleware mit AsyncStorage
// D-11: Lokal-Modus persistiert via StorageAdapter, nicht Zustand-Middleware direkt
```

**Wichtige Entscheidung (D-11):** Im Lokal-Modus werden Profildaten über den `StorageAdapter` (SQLite/IndexedDB) persistiert — NICHT via Zustand `persist`-Middleware. Zustand hält nur den In-Memory-State. Beim App-Start lädt ein `useEffect` die Daten aus dem StorageAdapter in den Store.

### Pattern 7: Supabase Storage Upload aus React Native

```typescript
// Source: Supabase Docs + Community-Pattern [MEDIUM confidence]
// Wichtig: Auf React Native kein Blob/File-Konstruktor direkt verwenden
// ArrayBuffer ist der zuverlässige Weg

import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

async function uploadVereinsregelPDF(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true, // Pflicht für expo-file-system Zugriff
  });

  if (result.canceled) return null;
  const asset = result.assets[0];

  // ArrayBuffer aus URI lesen (React-Native-sicher)
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const storagePath = `${userId}/${Date.now()}_${asset.name}`;
  const { error } = await supabase.storage
    .from('vereinsregeln')
    .upload(storagePath, byteArray, {
      contentType: asset.mimeType ?? 'application/pdf',
      upsert: true,
    });

  if (error) throw error;
  return storagePath;
}
```

### Anti-Patterns vermeiden

- **`useRouter().replace()` in `useEffect` für Auth-Redirects:** Verursacht Race Conditions beim Cold-Start. Stack.Protected ist die zuverlässigere Alternative.
- **`expo-secure-store` direkt für Supabase-Session:** Session überschreitet 2048 Bytes → stille Fehler bei persistSession. LargeSecureStore verwenden.
- **`nativewind@latest` ohne Version-Pin:** Aktuelle `latest` ist 4.2.3, die mit SDK 53 bricht. Explizit `4.1.23` pinnen.
- **Direkte `SqliteAdapter` / `IndexedDbAdapter` Imports:** Immer über `app/src/storage/index.ts` (D-08 aus Phase 1).
- **pgmq-Queue für Vereinsregeln-Extraktion:** D-07 explizit: synchroner Call, kein Queue.
- **Files API ohne Beta-Header:** `anthropic-beta: files-api-2025-04-14` ist Pflicht für Files API.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|-------------------|----------------------|-------|
| Session-Persistenz > 2048 Bytes | Eigener Crypto-Layer | LargeSecureStore (Supabase-Tutorial) | Bewährtes AES-256 + AsyncStorage-Pattern |
| PDF zu Binary für Upload | Eigene fetch-Blob-Konvertierung | `FileSystem.readAsStringAsync` + Base64→Uint8Array | RN-sicherer Weg ohne Blob-Probleme |
| Auth-Route-Guard | `useEffect`/`useRouter`-Redirect-Loop | `Stack.Protected guard={}` | Deeplink-sicher, kein Race-Condition |
| PLZ → Klimazone | Eigene Lookup-Logik | `klimazonen.ts` (bereits vorhanden) | Bereits implementiert in Phase 1 |
| Formulareingaben mit Tailwind | Eigene RN-Input-Komponente | `react-native-reusables` (copy-paste) | Accessibility, NativeWind-Integration, kein npm-Lock-in |
| UUID-Generierung | `Math.random()` | `crypto.randomUUID()` (mit `react-native-get-random-values` polyfill) | Kryptographisch sicher |

---

## Supabase Schema (Migration 002)

Zwei neue Tabellen für Phase 2. Migration-Datei: `supabase/migrations/20260419000002_profiles.sql`

```sql
-- profiles: Ein Eintrag pro user_id (Supabase UID oder lokale UUID-Referenz)
-- Lokal-Modus-User haben KEINEN Eintrag hier (nur in StorageAdapter)
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plz         text,
  klimazone   smallint CHECK (klimazone BETWEEN 1 AND 7),
  archetype   text CHECK (archetype IN (
    'selbstversorger','familien_naschgarten','mix_ausgewogen',
    'zier_erholung','biodiversitaet','kraeuter_apotheker'
  )),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- vereinsregeln: Regeln pro User (Account-Modus)
CREATE TABLE public.vereinsregeln (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('pdf_extraction', 'checklist', 'manual')),
  titel       text NOT NULL,
  beschreibung text,
  wert        numeric,         -- z.B. 120 (cm Hecke), 24 (m² Laube)
  einheit     text,            -- z.B. 'cm', 'm²'
  ist_bkleingg boolean NOT NULL DEFAULT false,  -- BKleingG-Grundregel: nicht-löschbar
  aktiv       boolean NOT NULL DEFAULT true,
  erstellt_am timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vereinsregeln_user_idx ON public.vereinsregeln(user_id, aktiv);
ALTER TABLE public.vereinsregeln ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vereinsregeln_own" ON public.vereinsregeln
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supabase Storage Bucket für PDF-Uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vereinsregeln', 'vereinsregeln', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/heic','image/webp']
);

CREATE POLICY "vereinsregeln_storage_own" ON storage.objects
  FOR ALL USING (
    bucket_id = 'vereinsregeln'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

**StorageAdapter-Schema für Lokal-Modus (Migration v2 in `migrations.ts`):**

```typescript
// Lokal-Modus nutzt StorageAdapter (Key-Value)
// Namenskonvention: 'profile' (JSON), 'vereinsregeln' (JSON-Array)
// Keys sind nicht user_id-präfixed, da lokaler Storage sowieso isoliert ist.

{ version: 2, up: async (adapter) => {
  // Kein Schema-Upgrade nötig — StorageAdapter ist KV-Store
  // Initialisierungswerte werden beim ersten set() angelegt
}}
```

---

## Domain Types (packages/shared/src/types/domain.ts)

```typescript
// Vollständige Typ-Definitionen für Phase 2
import type { Klimazone, Archetype } from '../constants';

export interface UserProfile {
  userId: string;       // Supabase UID (Account) oder lokale UUID (Lokal)
  mode: 'account' | 'local';
  plz: string | null;
  klimazone: Klimazone | null;
  archetype: Archetype | null;
  createdAt: string;
  updatedAt: string;
}

export type VereinsregelSource = 'pdf_extraction' | 'checklist' | 'manual';

export interface VereinsRegel {
  id: string;
  titel: string;
  beschreibung?: string;
  wert?: number;      // numerischer Grenzwert (z.B. 120 für 120cm Hecke)
  einheit?: string;   // 'cm', 'm²', etc.
  istBKleingG: boolean;  // Grundregel — nicht löschbar/deaktivierbar
  aktiv: boolean;
  source: VereinsregelSource;
}

// Für Checklisten-Alternative (D-09)
export interface VereinsregelChecklistItem {
  id: string;
  label: string;       // "Maximale Heckenhöhe"
  defaultWert?: number;
  einheit?: string;    // "cm"
  istBKleingG: boolean;
  pflichtfeld: boolean;
}
```

---

## Common Pitfalls

### Pitfall 1: NativeWind 4.2.x-Bruch auf Expo SDK 53
**Was schiefläuft:** `nativewind@latest` installieren zieht 4.2.3 rein, was `react-native-worklets/plugin` benötigt. Dieses Paket fehlt bei Expo SDK 53 / React Native 0.76.
**Warum:** NativeWind 4.2.0 hat eine neue Babel-Plugin-Abhängigkeit eingeführt.
**Vermeiden:** Explizit `nativewind@4.1.23` pinnen in `package.json`. `pnpm add nativewind@4.1.23 react-native-reanimated@3.17.4`.
**Warnsignale:** `Cannot find module 'react-native-worklets/plugin'` beim `expo start`.

### Pitfall 2: Supabase-Session überschreitet 2048 Bytes
**Was schiefläuft:** `expo-secure-store` direkt als Supabase-Storage-Adapter konfiguriert. Session wird beim ersten Refresh-Token-Event nicht gespeichert (stiller Fehler oder Abbruch).
**Warum:** iOS Keychain lehnt Werte > ~2KB ab.
**Vermeiden:** LargeSecureStore-Pattern aus der offiziellen Supabase-Expo-Doku implementieren.
**Warnsignale:** User bleibt nach App-Neustart ausgeloggt, obwohl `persistSession: true`.

### Pitfall 3: Flash of Protected Content (FOPC) beim Cold Start
**Was schiefläuft:** `_layout.tsx` rendert kurz den geschützten `(app)`-Screen bevor die Async-Auth-Prüfung abgeschlossen ist.
**Warum:** `getSession()` ist asynchron; Render passiert synchron.
**Vermeiden:** `SplashScreen.preventAutoHideAsync()` in der Root-Komponente aufrufen. Splash erst ausblenden, wenn `isLoading === false`.
**Warnsignale:** Kurzes Flackern des Hauptscreens vor dem Redirect zum Login.

### Pitfall 4: Lokal-Modus-User versuchen PDF-Upload
**Was schiefläuft:** `supabase.storage.from(...).upload()` ohne Auth-Token schlägt fehl.
**Warum:** Storage-RLS erfordert `auth.uid()` in der Richtlinie — Lokal-User haben kein Supabase-Auth-Token.
**Vermeiden:** Vor dem Upload prüfen: `authStore.mode === 'account'`. Lokal-Nutzer direkt zur Checkliste (D-09) leiten.
**Warnsignale:** `storage/unauthorized`-Fehler beim Upload.

### Pitfall 5: Edge Function Timeout bei grossem PDF
**Was schiefläuft:** Supabase Edge Functions haben 60 Sekunden Timeout. Bei einem 10-MB-PDF können Download + Anthropic-Upload + Extraktion das überschreiten.
**Warum:** Claude-API-Latenz + Supabase Storage Download + Files API Upload addieren sich.
**Vermeiden:** Dateigrössengrenze auf 10 MB im Storage Bucket setzen. Client-seitigen Timeout auf 55 Sekunden setzen. Retry-UI gemäss D-07.
**Warnsignale:** `FunctionsHttpError` mit Status 504.

### Pitfall 6: StorageAdapter-Keys ohne Struktur im Lokal-Modus
**Was schiefläuft:** Profildaten landen als flache Keys (`plz`, `archetype`) ohne User-Scope in der SQLite-DB. Wenn später der Lokal→Account-Migrationscode läuft, sind die Keys nicht eindeutig zuordenbar.
**Warum:** StorageAdapter ist ein generischer KV-Store ohne eingebaute Namespacing-Logik.
**Vermeiden:** Konsistente Key-Konvention: `profile` (JSON-Blob für alle Profilfelder), `vereinsregeln` (JSON-Array). Kein flaches Mapping einzelner Felder.
**Warnsignale:** Migration liest leere oder inkorrekte Daten aus dem StorageAdapter.

---

## Code Examples

### Supabase signUp

```typescript
// Source: https://supabase.com/docs/guides/auth/quickstarts/react-native
const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password: password,
});
// Wichtig: Wenn data.session === null → E-Mail-Bestätigung erforderlich
// User muss auf "Postfach prüfen"-Hinweis hingewiesen werden
if (!data.session) {
  // Zeige "Bitte E-Mail bestätigen"-Screen
}
```

### Supabase signInWithPassword

```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password: password,
});
// error.message unterscheidet NICHT zwischen "falsches Passwort" und "Account existiert nicht"
// → Generische Fehlermeldung anzeigen (Security by Design)
```

### Edge Function invoke

```typescript
// Source: https://supabase.com/docs/reference/javascript/functions-invoke
const { data, error } = await supabase.functions.invoke('extract-vereinsregeln', {
  body: { storagePath, userId },
});
// supabase.functions.invoke setzt Auth-Header automatisch
// Timeout-Handling auf Client-Seite:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55_000);
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Geändert | Auswirkung |
|--------------|-----------------|----------|------------|
| `useSegments` + `useRouter.replace()` für Auth-Redirect | `Stack.Protected guard={}` | Expo Router v4 (2024/2025) | Kein useEffect-Redirect mehr nötig; Deeplink-sicher |
| `expo-secure-store` direkt für Supabase-Session | LargeSecureStore (AES-256 + AsyncStorage) | Supabase-Tutorial 2024 | Umgeht 2048-Byte-Grenze |
| `useSegments`-basierter Route-Guard in `app/(auth)/_layout.tsx` | `Stack.Protected` im Root-Layout | Expo Router v4 Blog Post 2024/2025 | Sauberer, weniger Race-Condition-anfällig |
| Files direkt als Base64 in Claude-Prompt | Claude Files API (`beta: files-api-2025-04-14`) | April 2025 (Beta) | Bis zu 500 MB, saubere Referenzierung per `file_id` |
| `react-native-reusables` als npm-Paket | CLI-basiertes Copy-Paste (`npx shadcn@latest add`) | 2024 | Code landet direkt im Repo, kein npm-Lock-in |

---

## Assumptions Log

| # | Behauptung | Abschnitt | Risiko wenn falsch |
|---|-----------|-----------|-------------------|
| A1 | `nativewind@4.1.23` läuft stabil auf Expo SDK 53 (nur Community-Berichte, keine offizielle Bestätigung) | Standard Stack | NativeWind funktioniert gar nicht → Tailwind-Klassen werden nicht angewendet |
| A2 | Supabase Edge Function Timeout ist 60 Sekunden (Standardwert) | Common Pitfall 5 | Timeout könnte kürzer sein → Extraktion bricht früher ab |
| A3 | Zustand-`persist`-Middleware für authStore (AsyncStorage) ist im Lokal-Modus der richtige Weg, da StorageAdapter nur Profildaten hält, nicht Auth-State | Architecture Patterns | Auth-State geht verloren beim App-Neustart |
| A4 | Claude Files API Beta (`files-api-2025-04-14`) ist in Supabase Edge Functions / Deno verwendbar | Edge Function Pattern | API nicht von Deno-Umgebung erreichbar → Fallback auf Base64-inline-Embedding |
| A5 | `expo-secure-store` auf Web fällt auf `localStorage` zurück (oder ist nicht verfügbar) | Local UUID Pattern | Web-Lokal-Modus hat keine UUID-Persistenz → Session-Verlust bei Tab-Schliessen |
| A6 | `react-native-get-random-values` ist auf Expo SDK 53 / RN 0.76 korrekt eingebunden wenn als erster Import | Local UUID Pattern | `crypto.randomUUID()` wirft Fehler → UUID-Generierung bricht |

---

## Open Questions

1. **expo-secure-store auf Web (Web-Lokal-Modus UUID-Persistenz)**
   - Was wir wissen: `expo-secure-store` ist primär für Native konzipiert.
   - Was unklar ist: Ob die Web-Implementierung von `expo-secure-store@14` `localStorage` als Fallback nutzt oder komplett ausfällt.
   - Empfehlung: Beim ersten Web-Test prüfen. Fallback: `window.localStorage.setItem('spatenstich_local_uuid', uuid)` direkt im Web-Pfad.

2. **Supabase Edge Function Timeout-Konfiguration**
   - Was wir wissen: Standard-Timeout ist dokumentiert als 60 Sekunden. Pro-Plan erlaubt längere Ausführung.
   - Was unklar ist: Ob das kostenlose Supabase-Tier für Development ein niedrigeres Timeout hat.
   - Empfehlung: Bei der Edge-Function-Implementierung testen. Falls zu knapp: PDF-Grösse auf 5 MB begrenzen.

3. **Welche PLZ-Lookup-Tabelle für `klimazonen.ts`?**
   - Was wir wissen: Der Skeleton enthält nur `[1,2,3,4,5,6,7]` als Konstante. Eine vollständige PLZ → Klimazone-Zuordnung für Deutschland fehlt.
   - Was unklar ist: Welche Datenquelle verwendet werden soll (DWD-Klimazonen, Gartenbauzonen, etc.).
   - Empfehlung: Handwerks-Klimazonen (Heizgradtagzonen) oder Gartenbauzonen nach Regioclimate-Standard verwenden. Phase-2-Implementierungsaufgabe: Lookup-Tabelle mit allen deutschen PLZ erstellen.

4. **`react-native-reusables` CLI-Verfügbarkeit ohne shadcn-Konfiguration**
   - Was wir wissen: `react-native-reusables` nutzt denselben `npx shadcn@latest add`-Workflow wie shadcn/ui.
   - Was unklar ist: Ob ein `components.json` (shadcn-Konfiguration) im Repo-Root oder im `app/`-Verzeichnis nötig ist.
   - Empfehlung: Manuelles Kopieren der benötigten Komponenten aus dem GitHub-Repo als Fallback, falls CLI-Setup Probleme macht.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥22 | pnpm workspaces, build | ✓ | 24.14.0 | — |
| pnpm | Monorepo | ✓ | 10.33.0 | — |
| Supabase CLI | Migrations deployen | Nicht geprüft | — | Manuelle Migration via Dashboard |
| expo-secure-store | UUID + Session | ✓ (im package.json) | ~14.0.0 | — |
| expo-document-picker | PDF-Upload | ✗ (noch nicht installiert) | — | — (wird installiert) |
| @react-native-async-storage | LargeSecureStore | ✗ (noch nicht installiert) | — | — (wird installiert) |
| aes-js | LargeSecureStore | ✗ (noch nicht installiert) | — | — (wird installiert) |
| nativewind | UI-Styling | ✗ (noch nicht installiert) | — | — (wird auf 4.1.23 installiert) |
| react-native-reanimated | NativeWind-Dep | ✗ (noch nicht installiert) | — | — (wird auf 3.17.4 installiert) |

**Fehlende Dependencies ohne Fallback:**
- Alle fehlenden Packages werden im Rahmen von Phase 2 Wave 0 installiert.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + jest-expo ~53.0.0 |
| Config file | `app/jest.config.js` (via jest-expo Preset) |
| Quick run command | `pnpm --filter app test -- --passWithNoTests` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Automated Command | File Exists? |
|--------|-----------|-----------|-------------------|-------------|
| AUTH-01 | `signUp()` liefert Session oder null (E-Mail-Bestätigung) | Unit (mock supabase) | `pnpm --filter app test -- auth.test` | ❌ Wave 0 |
| AUTH-02 | Session nach App-Neustart persistent (LargeSecureStore) | Unit (mock AsyncStorage + SecureStore) | `pnpm --filter app test -- largeSecureStore.test` | ❌ Wave 0 |
| AUTH-03 | `getOrCreateLocalUUID()` gibt konsistente UUID zurück | Unit (mock SecureStore) | `pnpm --filter app test -- localUuid.test` | ❌ Wave 0 |
| AUTH-04 | Migration lokal→Account überträgt alle StorageAdapter-Keys | Integration (fake SQLite) | `pnpm --filter app test -- migration.test` | ❌ Wave 0 |
| AUTH-05 | Onboarding-Navigation folgt D-05-Routing-Logik | Manual (< 5 min in App) | — | Manual only |
| PROF-01 | PLZ `12043` → Klimazone `4` (statische Lookup) | Unit | `pnpm --filter app test -- klimazonen.test` | ❌ Wave 0 |
| PROF-02 | Archetyp-Auswahl wird in profileStore gespeichert | Unit (Zustand Store) | `pnpm --filter app test -- profileStore.test` | ❌ Wave 0 |
| PROF-04 | PLZ-Änderung aktualisiert Klimazone sofort | Unit | Teil von `klimazonen.test` | ❌ Wave 0 |
| RULES-01 | Edge Function gibt gültiges `VereinsRegel[]` zurück | Integration (Supabase Test / Manual) | Manual (Supabase Dashboard invoke) | Manual only |
| RULES-02 | Toggle-Zustand einer Regel wird korrekt persistiert | Unit (StorageAdapter mock) | `pnpm --filter app test -- vereinsregeln.test` | ❌ Wave 0 |
| RULES-03 | Checklisten-Standardregeln entsprechen Datenmodell | Unit | Teil von `vereinsregeln.test` | ❌ Wave 0 |
| RULES-04 | `istBKleingG=true` Regeln können nicht gelöscht/deaktiviert werden | Unit | Teil von `vereinsregeln.test` | ❌ Wave 0 |
| NFR-07 | Haftungsausschluss-Text in de.json vorhanden | Unit (i18n) | `pnpm --filter app test -- i18n.test` | ❌ Wave 0 |

### Sampling Rate
- **Pro Task-Commit:** `pnpm --filter app test -- --passWithNoTests`
- **Pro Wave Merge:** `pnpm test` (vollständige Suite)
- **Phase Gate:** Vollständige Suite grün vor `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `app/src/lib/__tests__/largeSecureStore.test.ts` — deckt AUTH-02
- [ ] `app/src/lib/__tests__/auth.test.ts` — deckt AUTH-01, AUTH-03
- [ ] `app/src/stores/__tests__/profileStore.test.ts` — deckt PROF-02, PROF-04
- [ ] `app/src/stores/__tests__/authStore.test.ts` — deckt AUTH-03
- [ ] `packages/shared/src/__tests__/klimazonen.test.ts` — deckt PROF-01
- [ ] `packages/shared/src/__tests__/vereinsregeln.test.ts` — deckt RULES-02, RULES-03, RULES-04
- [ ] `app/src/storage/__tests__/migration.test.ts` — deckt AUTH-04 (lokale Migrationsfunktion)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Ja | Supabase Auth (E-Mail/Passwort); `signUp` + `signInWithPassword` |
| V3 Session Management | Ja | `persistSession: true` + LargeSecureStore (AES-256 at-rest) |
| V4 Access Control | Ja | Supabase RLS auf `profiles`, `vereinsregeln`, `storage.objects` |
| V5 Input Validation | Ja | PLZ: `^[0-9]{5}$`-Regex; Regel-Texte: maximale Länge; keine SQL-Injection via RLS |
| V6 Cryptography | Ja | AES-256 für Session-Storage (LargeSecureStore); kein Hand-Roll von Krypto-Primitiven |

### Known Threat Patterns

| Pattern | STRIDE | Standard-Mitigation |
|---------|--------|---------------------|
| Session Token Theft (natives Gerät verloren) | Tampering / Elevation | iOS Keychain (WHEN_UNLOCKED_THIS_DEVICE_ONLY) + AES-Schlüssel in SecureStore |
| Unauthorised Storage Access (anderer App-User) | Tampering | RLS `auth.uid() = user_id` auf allen Tabellen |
| API Key Exposure im Client | Information Disclosure | FOUND-06: `CLAUDE_API_KEY` NUR in Deno Edge Function — nie im Client-Bundle |
| Unvalidiertes PDF von Claude extrahiert | Spoofing (manipuliertes PDF) | NFR-07 Haftungsausschluss; User bestätigt/editiert jede Regel bevor Speichern |
| Lokal-Modus-User greift auf fremde Daten zu | Tampering | StorageAdapter ist device-lokal; keine Server-seitige Isolation nötig (D-11) |

---

## Project Constraints (from CLAUDE.md)

Verbindliche Direktiven aus dem Projekt-CLAUDE.md, die den Planer einschränken:

| Constraint | Auswirkung auf Phase 2 |
|-----------|----------------------|
| Tech Stack: Expo SDK 53 (nicht 55 bis stabil) | NativeWind MUSS auf `4.1.23` gepinnt werden |
| Kein Tamagui, kein Redux, kein SWR | Nicht verwenden — Zustand + TanStack Query sind Standard |
| `react-native-reanimated v4` nicht stabil | Auf `3.17.4` pinnen |
| `@supabase/supabase-js` ≥2.49.5 | Bereits installiert (2.49.5) |
| KI-API-Keys NUR server-seitig | `CLAUDE_API_KEY` nur in Edge Function — nie im Client |
| Pl@ntNet API: NUR über Edge Functions | Nicht relevant für Phase 2 |
| Monorepo: pnpm workspaces | `pnpm --filter app add ...` für alle App-Dependencies |
| i18n: alle UI-Strings in `de.json` | Neue Strings (auth.*, profile.*, rules.*) müssen in `packages/shared/src/i18n/de.json` |
| GSD-Workflow-Enforcement | Keine direkten Repo-Edits ausserhalb GSD-Workflow |

---

## Sources

### Primary (HIGH confidence)
- [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication/) — Stack.Protected, SplashScreen, Dateigruppen-Struktur
- [Expo Router Protected Routes](https://docs.expo.dev/router/advanced/protected/) — guard-Prop-API, Redirect-Verhalten
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) — LargeSecureStore, signUp, signIn
- [expo-secure-store Docs](https://docs.expo.dev/versions/latest/sdk/securestore/) — API, 2048-Byte-Limit, iOS-Konstanten
- [expo-document-picker Docs](https://docs.expo.dev/versions/latest/sdk/document-picker/) — getDocumentAsync, copyToCacheDirectory, Assets-Shape
- [Claude Files API Docs](https://platform.claude.com/docs/en/build-with-claude/files) — Upload, file_id, document-Block, Beta-Header
- [NativeWind v4 Installation](https://www.nativewind.dev/docs/getting-started/installation) — babel.config.js, metro.config.js, tailwind.config.js
- Npm registry: `nativewind`, `react-native-reanimated`, `@rn-primitives/slot` — Versionen verifiziert

### Secondary (MEDIUM confidence)
- [nativewind/issues#1574](https://github.com/nativewind/nativewind/issues/1574) — NativeWind 4.2.0 bricht mit Expo SDK 53 (Community-bestätigt)
- [nativewind/discussions#1604](https://github.com/nativewind/nativewind/discussions/1604) — Maintainer-Empfehlung zu SDK/NativeWind-Kombinationen
- [Expo Blog: Simplifying Auth Flows with Protected Routes](https://expo.dev/blog/simplifying-auth-flows-with-protected-routes) — Stack.Protected API-Einführung
- [Supabase Auth RN Quick Start](https://supabase.com/docs/guides/auth/quickstarts/react-native) — signInWithPassword Error-Handling
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — RLS auf storage.objects

### Tertiary (LOW confidence — validierung empfohlen)
- Community-Berichte: NativeWind `4.1.23` + Expo SDK 53 stabil (mehrere GitHub-Issues-Kommentare — nicht offizielle Dokumentation)
- Supabase Edge Function Timeout = 60s (dokumentiert, aber Free-Tier-Verhalten nicht separat verifiziert)

---

## Metadata

**Confidence Breakdown:**
- Standard Stack: HIGH — npm-Versionen verifiziert; NativeWind-Kompatibilität MEDIUM (Community-Berichte, kein offizielles SDK-53-Compatibility-Statement)
- Architecture: HIGH — Stack.Protected + LargeSecureStore direkt aus offizieller Dokumentation
- Pitfalls: HIGH — aus GitHub Issues direkt verifiziert (Issue #1574, #1492)
- Edge Function + Files API: MEDIUM — Files API ist noch Beta; Deno-Kompatibilität [ASSUMED]

**Research Date:** 2026-04-19
**Valid Until:** 2026-05-19 (NativeWind/Expo-Kompatibilität kann sich schnell ändern; vor Beginn Phase 2 nochmals prüfen)

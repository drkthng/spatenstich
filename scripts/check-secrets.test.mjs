#!/usr/bin/env node
// Phase 34 (AI-01): proof that the secret scan works. It plants made-up keys in a
// temporary repository and a temporary bundle folder and expects the scan to fail on
// each, and to pass on clean files and on the app's public key.
//
// The made-up keys are put together at run time, so this file itself holds nothing the
// scan would find.
//
//   node scripts/check-secrets.test.mjs

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const scanner = path.join(here, 'check-secrets.mjs');

const body = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6';
const fakeAnthropicKey = ['sk', 'ant', 'api03', body].join('-');
const fakeSecretKey = ['sb', 'secret', body.slice(0, 32)].join('_');
const token = (role) =>
  [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ iss: 'supabase', ref: 'abcdefghijklmnop', role, iat: 1700000000 })).toString('base64url'),
    'c2lnbmF0dXJlLW5vdC1yZWFsLW5vdC1yZWFs',
  ].join('.');
const fakePublicKey = ['sb', 'publishable', body.slice(0, 24)].join('_');

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed += 1;
};
const run = (...args) => spawnSync(process.execPath, [scanner, ...args], { encoding: 'utf8' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-scan-'));
try {
  // ── A repository ───────────────────────────────────────────────────────────
  const repo = path.join(tmp, 'repo');
  fs.mkdirSync(path.join(repo, 'src'), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
  git('init', '-q');
  fs.writeFileSync(path.join(repo, 'src', 'app.ts'), `export const publicKey = '${fakePublicKey}';\nexport const anon = '${token('anon')}';\n// docs mention the prefix sk-ant- without a key\n`);
  git('add', '-A');
  let result = run('repo', repo);
  check('clean repository with the public key passes', result.status === 0, `exit ${result.status}`);

  fs.writeFileSync(path.join(repo, 'src', 'config.ts'), `const a = 1;\nconst key = '${fakeAnthropicKey}';\n`);
  git('add', '-A');
  result = run('repo', repo);
  check('a planted Claude API key fails the repository scan', result.status === 1, `exit ${result.status}`);
  check('the finding names file and line', result.stderr.includes('src/config.ts, Zeile 2'), result.stderr.split('\n')[0]);
  check('the key itself is not printed', !result.stderr.includes(body) && !result.stdout.includes(body));

  fs.writeFileSync(path.join(repo, 'src', 'config.ts'), `const serverKey = '${fakeSecretKey}';\n`);
  git('add', '-A');
  result = run('repo', repo);
  check('a planted Supabase secret key fails', result.status === 1, `exit ${result.status}`);

  fs.writeFileSync(path.join(repo, 'src', 'config.ts'), `const serverToken = '${token('service_role')}';\n`);
  git('add', '-A');
  result = run('repo', repo);
  check('a planted service role token fails', result.status === 1, `exit ${result.status}`);

  fs.writeFileSync(path.join(repo, 'src', 'config.ts'), `const fine = true;\n`);
  fs.writeFileSync(path.join(repo, 'not-tracked.env'), `ANTHROPIC_API_KEY=${fakeAnthropicKey}\n`);
  git('add', 'src');
  result = run('repo', repo);
  check('a file git does not track is none of the repository scan\'s business', result.status === 0, `exit ${result.status}`);

  // ── A built bundle ─────────────────────────────────────────────────────────
  const bundle = path.join(tmp, 'dist');
  fs.mkdirSync(path.join(bundle, '_expo', 'static', 'js', 'web'), { recursive: true });
  const entry = path.join(bundle, '_expo', 'static', 'js', 'web', 'entry-abc123.js');
  const filler = 'var a=function(){return 1};'.repeat(5000);
  fs.writeFileSync(entry, `${filler}var k="${fakePublicKey}";var t="${token('anon')}";${filler}`);
  result = run('dir', bundle);
  check('a bundle with only the public key passes', result.status === 0, `exit ${result.status}`);

  fs.writeFileSync(entry, `${filler}var k="${fakeAnthropicKey}";${filler}`);
  result = run('dir', bundle);
  check('a planted Claude API key in the minified bundle fails', result.status === 1, `exit ${result.status}`);

  result = run('dir', path.join(tmp, 'missing'));
  check('a missing folder is an error, not a pass', result.status === 2, `exit ${result.status}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);

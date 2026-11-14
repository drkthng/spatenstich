#!/usr/bin/env node
// Phase 34 (AI-01): fails when something that looks like a server secret is in the
// repository or in the built web bundle. The repository is public, and the bundle goes
// to every browser, so neither may ever hold the Claude API key or a Supabase server key.
//
//   node scripts/check-secrets.mjs repo            scans every file git tracks
//   node scripts/check-secrets.mjs dir <folder>    scans a folder (the built bundle)
//
// What counts as a secret:
//   - an Anthropic API key (starts with "sk-ant-" followed by a long key body)
//   - a Supabase secret key (starts with "sb_secret_")
//   - a Supabase token whose role is "service_role"
// The public key of the app (role "anon", or "sb_publishable_...") is expected in the
// bundle and is not a finding. scripts/check-secrets.test.mjs proves that a planted key
// is found.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PATTERNS = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{16,}/g },
];
const TOKEN = /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const MAX_FILE_BYTES = 30 * 1024 * 1024;

function isServiceRoleToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}

/** Findings in one piece of text: [{ kind, line }]. The secret itself is never returned. */
export function scanText(text) {
  const findings = [];
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  for (const { name, re } of PATTERNS) {
    for (const match of text.matchAll(re)) findings.push({ kind: name, line: lineOf(match.index) });
  }
  for (const match of text.matchAll(TOKEN)) {
    if (isServiceRoleToken(match[0])) findings.push({ kind: 'Supabase service role token', line: lineOf(match.index) });
  }
  return findings;
}

function listDir(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

function listRepo(cwd) {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return output.split('\0').filter(Boolean).map((file) => path.join(cwd, file));
}

export function scanFiles(files, base) {
  const findings = [];
  for (const file of files) {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue; // tracked but deleted in the working tree
    }
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
    const text = fs.readFileSync(file, 'latin1');
    for (const finding of scanText(text)) {
      findings.push({ ...finding, file: path.relative(base, file).replaceAll('\\', '/') });
    }
  }
  return findings;
}

function main() {
  const [mode, target] = process.argv.slice(2);
  let files;
  let base;
  if (mode === 'repo') {
    base = path.resolve(target ?? '.');
    files = listRepo(base);
  } else if (mode === 'dir' && target) {
    base = path.resolve(target);
    if (!fs.existsSync(base)) {
      console.error(`Ordner '${target}' nicht gefunden`);
      process.exit(2);
    }
    files = listDir(base);
  } else {
    console.error('Aufruf: node scripts/check-secrets.mjs repo | dir <ordner>');
    process.exit(2);
  }
  const findings = scanFiles(files, base);
  if (findings.length > 0) {
    for (const f of findings) console.error(`Geheimnis gefunden: ${f.kind} in ${f.file}, Zeile ${f.line}`);
    console.error(`${findings.length} Fund(e). Der Schlüssel gehört in die Secrets der Edge Function, nicht in Dateien.`);
    process.exit(1);
  }
  console.log(`Keine Geheimnisse in ${files.length} Dateien (${mode === 'repo' ? 'Repository' : target}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

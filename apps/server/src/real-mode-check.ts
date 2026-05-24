#!/usr/bin/env node
// Positron — Real-Mode Diagnose
//
// Prüft, ob die Voraussetzungen für den Real-Mode erfüllt sind:
//   - GitHub: GITHUB_TOKEN gesetzt, Octokit importierbar
//   - SpecKit: specify CLI installiert
//   - OpenCode: opencode CLI installiert
//
// Exit-Codes: 0 = alle OK, 1 = Fehler

import { execSync } from 'node:child_process';
import process from 'node:process';

interface CheckResult { name: string; status: 'ok' | 'warn' | 'fail'; detail: string; }

async function main(): Promise<void> {
  const results: CheckResult[] = [];

  // --- GitHub ---
  const hasGitHubToken = !!process.env['GITHUB_TOKEN'] || !!process.env['GH_TOKEN'];
  results.push({
    name: 'GitHub Token',
    status: hasGitHubToken ? 'ok' : 'fail',
    detail: hasGitHubToken
      ? `GITHUB_TOKEN gesetzt (${process.env['GITHUB_TOKEN']?.length ?? 0} Zeichen)`
      : 'GITHUB_TOKEN oder GH_TOKEN nicht gesetzt',
  });

  if (hasGitHubToken) {
    let octokitOk = false;
    try { await import('@octokit/rest'); octokitOk = true; } catch { /* fail */ }
    results.push({
      name: 'GitHub Octokit',
      status: octokitOk ? 'ok' : 'fail',
      detail: octokitOk ? '@octokit/rest importierbar' : '@octokit/rest nicht gefunden',
    });
  }

  // --- SpecKit ---
  let specifyVersion = '';
  try {
    specifyVersion = execSync('specify --version 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    try { specifyVersion = execSync('npx --yes specify --version 2>/dev/null', { encoding: 'utf-8', timeout: 10000 }).trim(); } catch { /* fail */ }
  }
  results.push({
    name: 'SpecKit CLI (specify)',
    status: specifyVersion ? 'ok' : 'fail',
    detail: specifyVersion ? `specify CLI gefunden: ${specifyVersion.slice(0, 100)}` : 'specify CLI nicht gefunden',
  });

  // --- OpenCode ---
  let opencodeVersion = '';
  try {
    opencodeVersion = execSync('opencode --version 2>/dev/null', { encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    try { opencodeVersion = execSync('npx --yes opencode --version 2>/dev/null', { encoding: 'utf-8', timeout: 10000 }).trim(); } catch { /* fail */ }
  }
  results.push({
    name: 'OpenCode CLI',
    status: opencodeVersion ? 'ok' : 'fail',
    detail: opencodeVersion ? `opencode CLI gefunden: ${opencodeVersion.slice(0, 100)}` : 'opencode CLI nicht gefunden',
  });

  // --- Ausgabe ---
  console.log('\n═══════════════════════════════════════');
  console.log('   Positron Real-Mode Diagnose');
  console.log('═══════════════════════════════════════');
  console.log(`   POSITRON_GITHUB_MODE = ${process.env['POSITRON_GITHUB_MODE'] ?? '(default: fake)'}`);
  console.log('───────────────────────────────────────\n');

  let allOk = true;
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    console.log(` ${icon} ${r.name}`);
    console.log(`    ${r.detail}`);
    if (r.status === 'fail') allOk = false;
  }

  if (!hasGitHubToken) {
    console.log('\n 💡 Tipp: Setze GITHUB_TOKEN in apps/server/.env');
  }
  if (!specifyVersion) {
    console.log(' 💡 Tipp: Installiere SpecKit: npm install -g @github/spec-kit oder npx specify');
  }
  if (!opencodeVersion) {
    console.log(' 💡 Tipp: Installiere OpenCode: npm install -g opencode oder npx opencode');
  }

  console.log('\n───────────────────────────────────────');
  if (allOk) {
    console.log(' ✅ Alle Checks bestanden — Real-Mode ist bereit');
    console.log('    Setze POSITRON_GITHUB_MODE=real und starte den Server neu.');
  } else {
    console.log(' ❌ Mindestens ein Check fehlgeschlagen');
    console.log('    Behebe die genannten Probleme vor Real-Mode-Aktivierung.');
  }
  console.log('═══════════════════════════════════════\n');

  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error('Diagnose-Fehler:', err);
  process.exit(1);
});

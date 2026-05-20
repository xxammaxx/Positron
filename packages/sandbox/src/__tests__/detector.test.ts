import { describe, expect, test, beforeEach } from 'vitest';
import { TestCommandDetector } from '../detector.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const detector = new TestCommandDetector();
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'positron-detector-'));
});

describe('TestCommandDetector', () => {
  test('kein package.json → BLOCKED', async () => {
    const result = await detector.detect(tmpDir);
    expect(result.commands).toHaveLength(0);
    expect(result.blockedReasons).toContain('Kein package.json gefunden');
  });

  test('leere Scripts → BLOCKED', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: {} }));
    const result = await detector.detect(tmpDir);
    expect(result.blockedReasons).toContain('Keine Scripts in package.json');
  });

  test('erkennt test, build, lint', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest run', build: 'tsc', lint: 'eslint .' },
    }));
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '');
    const result = await detector.detect(tmpDir);
    expect(result.packageManager).toBe('npm');
    expect(result.commands).toHaveLength(3);
    expect(result.commands.map(c => c.scriptName)).toEqual(['test', 'build', 'lint']);
  });

  test('blockiert dev, start, deploy', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { dev: 'vite', start: 'node .', deploy: 'echo x', test: 'vitest' },
    }));
    const result = await detector.detect(tmpDir);
    const names = result.commands.map(c => c.scriptName);
    expect(names).toContain('test');
    expect(names).not.toContain('dev');
    expect(names).not.toContain('start');
    expect(result.blockedReasons.some(r => r.includes('deploy'))).toBe(true);
  });

  test('blockiert gefährliche Script-Inhalte', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      scripts: { test: 'vitest', build: 'rm -rf /' },
    }));
    const result = await detector.detect(tmpDir);
    const names = result.commands.map(c => c.scriptName);
    expect(names).toContain('test');
    expect(names).not.toContain('build');
    expect(result.blockedReasons.some(r => r.includes('build'))).toBe(true);
  });

  test('Package Manager Detection', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'vitest' } }));
    fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const result = await detector.detect(tmpDir);
    expect(result.packageManager).toBe('pnpm');
  });

  test('malformed package.json', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{invalid');
    const result = await detector.detect(tmpDir);
    expect(result.blockedReasons).toContain('package.json konnte nicht geparst werden');
  });
});

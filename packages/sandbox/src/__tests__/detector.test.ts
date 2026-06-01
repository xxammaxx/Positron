import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const { TestCommandDetector } = await import('../detector.js');

describe('TestCommandDetector', () => {
  it('should return no commands for empty directory', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detector-test-'));
    try {
      const detector = new TestCommandDetector();
      const result = await detector.detect(tmpDir);
      expect(result.framework).toBeNull();
      expect(result.commands).toHaveLength(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

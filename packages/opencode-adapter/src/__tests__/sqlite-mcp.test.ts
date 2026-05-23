import { afterAll, describe, expect, test } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(testDir, '..', '..');
const sqliteMcpScript = path.resolve(packageRoot, 'src/sqlite-mcp.ts');
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'positron-sqlite-mcp-'));

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('sqlite-mcp', () => {
  test('handshake, tools/list, resources/list und tools/call funktionieren', { timeout: 30000 }, async () => {
    const dbPath = path.join(tmpRoot, 'data', 'local.db');
    const child = spawn(process.execPath, ['--experimental-strip-types', sqliteMcpScript, dbPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stderr: string[] = [];
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(chunk.toString('utf8'));
    });

    const messages = new FramedMessageStream(child);

    sendRequest(child, 1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'vitest',
        version: '1.0.0',
      },
    });

    const initResponse = await messages.next();
    expect(initResponse.id).toBe(1);
    expect(initResponse.error).toBeUndefined();
    expect(initResponse.result).toMatchObject({
      protocolVersion: '2024-11-05',
      serverInfo: {
        name: 'positron-sqlite-mcp',
      },
    });

    sendNotification(child, 'notifications/initialized', {});

    sendRequest(child, 2, 'tools/list', {});
    const toolsResponse = await messages.next();
    expect(toolsResponse.id).toBe(2);
    expect(toolsResponse.error).toBeUndefined();
    expect(toolsResponse.result).toMatchObject({
      tools: [
        {
          name: 'query',
        },
      ],
    });

    sendRequest(child, 3, 'resources/list', {});
    const resourcesResponse = await messages.next();
    expect(resourcesResponse.id).toBe(3);
    expect(resourcesResponse.error).toBeUndefined();
    expect(resourcesResponse.result).toMatchObject({
      resources: expect.arrayContaining([
        expect.objectContaining({ uri: 'sqlite://database' }),
        expect.objectContaining({ uri: 'sqlite://schema' }),
      ]),
    });

    sendRequest(child, 4, 'tools/call', {
      name: 'query',
      arguments: {
        sql: 'SELECT 1 AS value',
      },
    });
    const callResponse = await messages.next();
    expect(callResponse.id).toBe(4);
    expect(callResponse.error).toBeUndefined();
    expect(callResponse.result).toMatchObject({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('"value": 1'),
        },
      ],
    });

    child.kill('SIGTERM');
    await waitForExit(child);

    expect(stderr.join('\n')).not.toContain('uncaughtException');
  });

  test('akzeptiert auch LF-only-Framing', { timeout: 30000 }, async () => {
    const dbPath = path.join(tmpRoot, 'data', 'lf-local.db');
    const child = spawn(process.execPath, ['--experimental-strip-types', sqliteMcpScript, dbPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const messages = new FramedMessageStream(child);

    sendRequest(child, 1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'vitest',
        version: '1.0.0',
      },
    }, '\n');

    const initResponse = await messages.next();
    expect(initResponse.id).toBe(1);
    expect(initResponse.error).toBeUndefined();

    sendRequest(child, 2, 'tools/list', {}, '\n');
    const toolsResponse = await messages.next();
    expect(toolsResponse.id).toBe(2);
    expect(toolsResponse.error).toBeUndefined();

    child.kill('SIGTERM');
    await waitForExit(child);
  });

  test('akzeptiert JSONL-Framing wie OpenCode', { timeout: 30000 }, async () => {
    const dbPath = path.join(tmpRoot, 'data', 'jsonl-local.db');
    const child = spawn(process.execPath, ['--experimental-strip-types', sqliteMcpScript, dbPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const messages = new FramedMessageStream(child);

    sendJsonLine(child, 1, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: {
        name: 'opencode',
        version: '1.15.5',
      },
    });

    const initResponse = await messages.next();
    expect(initResponse.id).toBe(1);
    expect(initResponse.error).toBeUndefined();
    expect(initResponse.result).toMatchObject({
      protocolVersion: '2025-11-25',
      serverInfo: {
        name: 'positron-sqlite-mcp',
      },
    });

    sendJsonLine(child, 2, 'tools/list', {});
    const toolsResponse = await messages.next();
    expect(toolsResponse.id).toBe(2);
    expect(toolsResponse.error).toBeUndefined();

    child.kill('SIGTERM');
    await waitForExit(child);
  });
});

interface CollectedMessage {
  id?: number | string | null;
  result?: unknown;
  error?: unknown;
  method?: string;
}

class FramedMessageStream {
  private buffer = Buffer.alloc(0);
  private queue: CollectedMessage[] = [];
  private waiters: Array<(message: CollectedMessage) => void> = [];

  constructor(child: ChildProcessWithoutNullStreams) {
    child.stdout.on('data', (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
  }

  next(): Promise<CollectedMessage> {
    const queued = this.queue.shift();
    if (queued) {
      return Promise.resolve(queued);
    }

    return new Promise<CollectedMessage>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private drain(): void {
    while (true) {
      const message = this.readMessage();
      if (!message) {
        return;
      }

      const waiter = this.waiters.shift();
      if (waiter) {
        waiter(message);
      } else {
        this.queue.push(message);
      }
    }
  }

  private readMessage(): CollectedMessage | null {
    const headerEnd = this.findHeaderEnd();
    if (headerEnd !== null) {
      const headerText = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = headerText.match(/content-length:\s*(\d+)/i);
      if (match) {
        const length = Number(match[1]);
        const bodyStart = headerEnd + this.findHeaderDelimiterLength(headerEnd);
        const bodyEnd = bodyStart + length;
        if (this.buffer.length < bodyEnd) {
          return null;
        }

        const body = this.buffer.slice(bodyStart, bodyEnd).toString('utf8');
        this.buffer = this.buffer.slice(bodyEnd);
        return JSON.parse(body) as CollectedMessage;
      }

      this.buffer = this.buffer.slice(headerEnd + this.findHeaderDelimiterLength(headerEnd));
      return null;
    }

    const newlineIndex = this.buffer.indexOf('\n');
    if (newlineIndex === -1) {
      return null;
    }

    const line = this.buffer.slice(0, newlineIndex).toString('utf8').replace(/\r$/, '').trimStart();
    if (!line.startsWith('{') && !line.startsWith('[')) {
      return null;
    }

    this.buffer = this.buffer.slice(newlineIndex + 1);
    return JSON.parse(line) as CollectedMessage;
  }

  private findHeaderEnd(): number | null {
    const crlfIndex = this.buffer.indexOf('\r\n\r\n');
    if (crlfIndex !== -1) {
      return crlfIndex;
    }

    const lfIndex = this.buffer.indexOf('\n\n');
    return lfIndex === -1 ? null : lfIndex;
  }

  private findHeaderDelimiterLength(headerEnd: number): number {
    return this.buffer.slice(headerEnd, headerEnd + 4).toString('utf8').startsWith('\r\n\r\n') ? 4 : 2;
  }
}

function sendRequest(
  child: ChildProcessWithoutNullStreams,
  id: number,
  method: string,
  params: unknown,
  lineEnding = '\r\n',
): void {
  child.stdin.write(serializeMessage({
    jsonrpc: '2.0',
    id,
    method,
    params,
  }, lineEnding));
}

function sendNotification(
  child: ChildProcessWithoutNullStreams,
  method: string,
  params: unknown,
  lineEnding = '\r\n',
): void {
  child.stdin.write(serializeMessage({
    jsonrpc: '2.0',
    method,
    params,
  }, lineEnding));
}

function sendJsonLine(
  child: ChildProcessWithoutNullStreams,
  id: number,
  method: string,
  params: unknown,
): void {
  child.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  }) + '\n');
}

function serializeMessage(message: Record<string, unknown>, lineEnding = '\r\n'): string {
  const payload = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(payload, 'utf8')}${lineEnding}${lineEnding}${payload}`;
}

function waitForExit(child: ChildProcessWithoutNullStreams): Promise<number> {
  return new Promise<number>((resolve) => {
    child.once('exit', (code) => resolve(code ?? 0));
  });
}

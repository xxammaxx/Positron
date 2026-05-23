import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type JsonRpcId = string | number | null;
type TransportMode = 'content-length' | 'jsonl';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface McpRequestParams {
  protocolVersion?: string;
  tools?: unknown;
  resources?: unknown;
  prompts?: unknown;
}

const SERVER_NAME = 'positron-sqlite-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data/local.db');

const dbPath = resolveDatabasePath(process.argv[2] ?? DEFAULT_DB_PATH);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const database = new Database(dbPath);
database.pragma('foreign_keys = ON');

let stdinBuffer = Buffer.alloc(0);
let transportMode: TransportMode = 'content-length';

process.stdin.on('data', (chunk: Buffer) => {
  stdinBuffer = Buffer.concat([stdinBuffer, chunk]);
  drainInput();
});

process.stdin.on('end', () => {
  shutdown(0);
});

process.once('SIGINT', () => shutdown(130));
process.once('SIGTERM', () => shutdown(143));

process.on('uncaughtException', (error) => {
  writeStderr(`sqlite-mcp uncaughtException: ${String(error)}`);
  shutdown(1);
});

process.on('unhandledRejection', (reason) => {
  writeStderr(`sqlite-mcp unhandledRejection: ${String(reason)}`);
  shutdown(1);
});

process.stdin.resume();

function resolveDatabasePath(inputPath: string): string {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function drainInput(): void {
  while (true) {
    const message = readMessage(stdinBuffer);
    if (!message) {
      return;
    }

    stdinBuffer = stdinBuffer.slice(message.consumedBytes);
    transportMode = message.transportMode;
    if (message.rawMessage === '') {
      continue;
    }

    void handleMessage(message.rawMessage);
  }
}

function readMessage(buffer: Buffer): { rawMessage: string; consumedBytes: number; transportMode: TransportMode } | null {
  const framedMessage = readFramedMessage(buffer);
  if (framedMessage) {
    return framedMessage;
  }

  return readJsonLineMessage(buffer);
}

function readFramedMessage(
  buffer: Buffer,
): { rawMessage: string; consumedBytes: number; transportMode: TransportMode } | null {
  const delimiter = findHeaderDelimiter(buffer);
  if (!delimiter) {
    return null;
  }

  const { headerEnd, delimiterLength } = delimiter;
  const headerText = buffer.slice(0, headerEnd).toString('utf8');
  const contentLength = parseContentLength(headerText);
  if (contentLength === null) {
    return {
      rawMessage: '',
      consumedBytes: headerEnd + delimiterLength,
      transportMode: 'content-length',
    };
  }

  const messageStart = headerEnd + delimiterLength;
  const messageEnd = messageStart + contentLength;
  if (buffer.length < messageEnd) {
    return null;
  }

  return {
    rawMessage: buffer.slice(messageStart, messageEnd).toString('utf8'),
    consumedBytes: messageEnd,
    transportMode: 'content-length',
  };
}

function readJsonLineMessage(
  buffer: Buffer,
): { rawMessage: string; consumedBytes: number; transportMode: TransportMode } | null {
  const newlineIndex = buffer.indexOf('\n');
  if (newlineIndex === -1) {
    return null;
  }

  const line = buffer.slice(0, newlineIndex).toString('utf8').replace(/\r$/, '');
  const trimmedLine = line.trimStart();
  if (!trimmedLine.startsWith('{') && !trimmedLine.startsWith('[')) {
    return null;
  }

  return {
    rawMessage: trimmedLine,
    consumedBytes: newlineIndex + 1,
    transportMode: 'jsonl',
  };
}

function parseContentLength(headerText: string): number | null {
  const match = headerText.match(/content-length:\s*(\d+)/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function findHeaderDelimiter(buffer: Buffer): { headerEnd: number; delimiterLength: number } | null {
  const crlfIndex = buffer.indexOf('\r\n\r\n');
  if (crlfIndex !== -1) {
    return {
      headerEnd: crlfIndex,
      delimiterLength: 4,
    };
  }

  const lfIndex = buffer.indexOf('\n\n');
  if (lfIndex !== -1) {
    return {
      headerEnd: lfIndex,
      delimiterLength: 2,
    };
  }

  return null;
}

async function handleMessage(rawMessage: string): Promise<void> {
  let message: JsonRpcRequest;
  try {
    message = JSON.parse(rawMessage) as JsonRpcRequest;
  } catch (error) {
    writeError(null, -32700, 'Parse error', String(error));
    return;
  }

  try {
    if (isNotification(message)) {
      await handleNotification(message);
      return;
    }

    const result = await handleRequest(message.method, message.params);
    writeResponse(message.id ?? null, result);
  } catch (error) {
    writeError(message.id ?? null, -32603, 'Internal error', String(error));
  }
}

function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined;
}

async function handleNotification(message: JsonRpcRequest): Promise<void> {
  if (message.method === 'notifications/initialized') {
    return;
  }

  if (message.method === 'exit') {
    shutdown(0);
  }
}

async function handleRequest(method: string, params: unknown): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return handleInitialize(params as McpRequestParams | undefined);
    case 'shutdown':
      return null;
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: listTools() };
    case 'tools/call':
      return callTool(params);
    case 'resources/list':
      return { resources: listResources() };
    case 'resources/read':
      return readResource(params);
    case 'prompts/list':
      return { prompts: [] };
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

function handleInitialize(params: McpRequestParams | undefined): unknown {
  return {
    protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      resources: {
        subscribe: false,
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  };
}

function listTools(): Array<Record<string, unknown>> {
  return [
    {
      name: 'query',
      description: 'Execute a SQL query against the Positron SQLite database.',
      inputSchema: {
        type: 'object',
        properties: {
          sql: {
            type: 'string',
            description: 'SQL statement to execute.',
          },
          params: {
            type: 'array',
            description: 'Optional positional parameters for the SQL statement.',
            items: {},
          },
        },
        required: ['sql'],
        additionalProperties: false,
      },
    },
  ];
}

function callTool(params: unknown): unknown {
  const input = asRecord(params);
  const name = typeof input.name === 'string' ? input.name : '';

  if (name !== 'query') {
    throw new Error(`Unknown tool: ${name}`);
  }

  const argumentsObject = asRecord(input.arguments);
  const sql = typeof argumentsObject.sql === 'string' ? argumentsObject.sql.trim() : '';
  if (!sql) {
    throw new Error('Missing required sql argument');
  }

  const sqlParams = Array.isArray(argumentsObject.params) ? argumentsObject.params : [];
  const statement = database.prepare(sql);
  const isReader = isReadStatement(sql, statement);

  if (isReader) {
    const rows = statement.all(...sqlParams);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ rows }, null, 2),
        },
      ],
    };
  }

  const info = statement.run(...sqlParams);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            changes: info.changes,
            lastInsertRowid: info.lastInsertRowid,
          },
          null,
          2,
        ),
      },
    ],
  };
}

function listResources(): Array<Record<string, unknown>> {
  return [
    {
      uri: 'sqlite://database',
      name: 'Database information',
      description: 'Metadata about the local Positron SQLite database.',
      mimeType: 'application/json',
    },
    {
      uri: 'sqlite://schema',
      name: 'Database schema',
      description: 'All user-defined tables and indexes in the SQLite database.',
      mimeType: 'application/json',
    },
  ];
}

function readResource(params: unknown): unknown {
  const input = asRecord(params);
  const uri = typeof input.uri === 'string' ? input.uri : '';

  if (uri === 'sqlite://database') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              path: dbPath,
              open: database.open,
              foreignKeys: database.pragma('foreign_keys', { simple: true }) === 1,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (uri === 'sqlite://schema') {
    const rows = database
      .prepare(
        `SELECT type, name, sql
         FROM sqlite_master
         WHERE type IN ('table', 'index', 'view')
           AND name NOT LIKE 'sqlite_%'
         ORDER BY type, name`,
      )
      .all();

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ rows }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${uri}`);
}

function isReadStatement(sql: string, statement: Database.Statement): boolean {
  if (typeof (statement as { reader?: boolean }).reader === 'boolean') {
    return Boolean((statement as { reader?: boolean }).reader);
  }

  return /^(select|with|pragma|explain)\b/i.test(sql);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function writeResponse(id: JsonRpcId, result: unknown): void {
  writeMessage({
    jsonrpc: '2.0',
    id,
    result,
  });
}

function writeError(id: JsonRpcId, code: number, message: string, data?: unknown): void {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  });
}

function writeMessage(message: JsonRpcResponse): void {
  const payload = JSON.stringify(message);
  if (transportMode === 'jsonl') {
    process.stdout.write(`${payload}\n`);
    return;
  }

  process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
}

function writeStderr(message: string): void {
  process.stderr.write(`${message}\n`);
}

function shutdown(exitCode: number): void {
  try {
    if (database.open) {
      database.close();
    }
  } catch {
    // Ignore shutdown errors.
  }

  process.exit(exitCode);
}

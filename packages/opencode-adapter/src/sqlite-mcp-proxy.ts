/**
 * Positron — SQLite MCP Proxy
 * 
 * Stellt die SQLiteMCPReader-Funktionalität als MCP-Tools bereit.
 * Ermöglicht den Zugriff auf OpenCode-Session-Daten über
 * standardisierte Tool-Calls.
 */

import { SQLiteMCPReader } from './sqlite-mcp.js';

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export class SQLiteMCPProxy {
  private reader: SQLiteMCPReader;

  constructor(dbPath?: string) {
    this.reader = new SQLiteMCPReader(dbPath);
  }

  /**
   * Verarbeitet einen MCP-Tool-Call und gibt das Ergebnis zurück.
   * Verfügbare Tools:
   * - list_sessions: Alle Sessions auflisten
   * - get_messages: Nachrichten einer Session abrufen (Argument: sessionId)
   * - search_messages: In Nachrichten suchen (Argument: query)
   */
  async handleToolCall(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      this.reader.connect();

      switch (call.tool) {
        case 'list_sessions': {
          const sessions = this.reader.listSessions();
          return {
            content: [
              {
                type: 'text',
                text: sessions.length > 0
                  ? JSON.stringify(sessions, null, 2)
                  : 'Keine Sessions gefunden (DB möglicherweise nicht verfügbar)',
              },
            ],
          };
        }

        case 'get_messages': {
          const { sessionId } = call.arguments as { sessionId: string };
          if (!sessionId) {
            return {
              content: [{ type: 'text', text: 'sessionId ist erforderlich' }],
              isError: true,
            };
          }
          const messages = this.reader.getMessages(sessionId);
          return {
            content: [
              {
                type: 'text',
                text: messages.length > 0
                  ? JSON.stringify(messages, null, 2)
                  : `Keine Nachrichten für Session ${sessionId} gefunden`,
              },
            ],
          };
        }

        case 'search_messages': {
          const { query } = call.arguments as { query: string };
          if (!query) {
            return {
              content: [{ type: 'text', text: 'query ist erforderlich' }],
              isError: true,
            };
          }
          const results = this.reader.searchMessages(query);
          return {
            content: [
              {
                type: 'text',
                text: results.length > 0
                  ? JSON.stringify(results, null, 2)
                  : `Keine Ergebnisse für "${query}"`,
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unbekanntes Tool: ${call.tool}. Verfügbar: list_sessions, get_messages, search_messages`,
              },
            ],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Schließt die Datenbankverbindung.
   */
  close(): void {
    this.reader.close();
  }
}

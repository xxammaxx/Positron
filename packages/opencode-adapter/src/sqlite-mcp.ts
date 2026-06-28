/**
 * Positron — SQLite MCP Integration
 *
 * Liest die OpenCode SQLite-Datenbank aus, um Session- und
 * Message-Daten für MCP-Tools bereitzustellen.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

export interface OpenCodeSession {
	id: string;
	createdAt: string;
	updatedAt: string;
}

export interface OpenCodeMessage {
	id: string;
	sessionId: string;
	role: 'user' | 'assistant';
	content: string;
	createdAt: string;
}

export class SQLiteMCPReader {
	private db: Database.Database | null = null;

	constructor(private dbPath?: string) {}

	private getDefaultDbPath(): string {
		return path.join(os.homedir(), '.opencode', 'opencode.db');
	}

	/**
	 * Verbindet zur OpenCode SQLite-Datenbank.
	 * @throws Wenn die Datenbank nicht geöffnet werden kann.
	 */
	connect(): void {
		if (this.db) return; // Bereits verbunden
		const resolvedPath = this.dbPath ?? this.getDefaultDbPath();

		if (!fs.existsSync(resolvedPath)) {
			console.warn(`[SQLiteMCPReader] DB nicht gefunden: ${resolvedPath}`);
			// Kein Fehler — die DB existiert vielleicht einfach nicht
			return;
		}

		try {
			this.db = new Database(resolvedPath, { readonly: true });
			console.log(`[SQLiteMCPReader] Verbunden mit: ${resolvedPath}`);
		} catch (err) {
			throw new Error(
				`SQLite-MCP: Kann DB nicht öffnen: ${resolvedPath} — ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/**
	 * Listet alle verfügbaren Sessions.
	 */
	listSessions(): OpenCodeSession[] {
		if (!this.db) {
			console.warn('[SQLiteMCPReader] Nicht verbunden — kann Sessions nicht abrufen');
			return [];
		}
		try {
			const stmt = this.db.prepare(
				'SELECT id, created_at as createdAt, updated_at as updatedAt FROM sessions ORDER BY created_at DESC LIMIT 100',
			);
			return stmt.all() as OpenCodeSession[];
		} catch (err) {
			console.warn(
				`[SQLiteMCPReader] listSessions fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
			);
			return [];
		}
	}

	/**
	 * Ruft alle Nachrichten einer Session ab.
	 */
	getMessages(sessionId: string): OpenCodeMessage[] {
		if (!this.db) {
			console.warn('[SQLiteMCPReader] Nicht verbunden — kann Nachrichten nicht abrufen');
			return [];
		}
		try {
			const stmt = this.db.prepare(
				'SELECT id, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE session_id = ? ORDER BY created_at ASC',
			);
			return stmt.all(sessionId) as OpenCodeMessage[];
		} catch (err) {
			console.warn(
				`[SQLiteMCPReader] getMessages fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
			);
			return [];
		}
	}

	/**
	 * Sucht in Nachrichten-Inhalten.
	 */
	searchMessages(query: string, limit = 20): OpenCodeMessage[] {
		if (!this.db) {
			console.warn('[SQLiteMCPReader] Nicht verbunden — kann Suche nicht durchführen');
			return [];
		}
		try {
			const stmt = this.db.prepare(
				'SELECT id, session_id as sessionId, role, content, created_at as createdAt FROM messages WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?',
			);
			return stmt.all(`%${query}%`, limit) as OpenCodeMessage[];
		} catch (err) {
			console.warn(
				`[SQLiteMCPReader] searchMessages fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
			);
			return [];
		}
	}

	/**
	 * Schließt die Datenbank-Verbindung.
	 */
	close(): void {
		if (this.db) {
			try {
				this.db.close();
			} catch {
				/* ignore */
			}
			this.db = null;
		}
	}
}
